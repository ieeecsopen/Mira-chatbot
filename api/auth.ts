import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { connectToDatabase } from './db/connect';
import {
    createUser,
    findUserByEmail,
    findUserById,
    findOrCreateOAuthUser,
    hashPassword,
    verifyPassword,
    updateLastLogin,
    User,
} from './db/users';

// JWT Secret - In production, use a strong secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// GitHub OAuth Configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

/**
 * Generate JWT token for user
 */
function generateToken(user: User): string {
    return jwt.sign(
        {
            userId: user._id?.toString(),
            email: user.email,
            name: user.name,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): any {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Create sanitized user response (without password)
 */
function sanitizeUser(user: User) {
    const { password, ...sanitized } = user;
    return {
        ...sanitized,
        id: user._id?.toString(),
    };
}

/**
 * Main authentication endpoint handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action } = req.query;

    try {
        switch (action) {
            case 'signup':
                return await handleSignup(req, res);
            case 'signin':
                return await handleSignin(req, res);
            case 'google':
                return await handleGoogleAuth(req, res);
            case 'github':
                return await handleGitHubAuth(req, res);
            case 'github-callback':
                return await handleGitHubCallback(req, res);
            case 'verify':
                return await handleVerifyToken(req, res);
            case 'profile':
                return await handleGetProfile(req, res);
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
}

/**
 * Handle email/password signup
 */
async function handleSignup(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const { db } = await connectToDatabase();

    // Check if user exists
    const existingUser = await findUserByEmail(db, email);
    if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await createUser(db, {
        email,
        name,
        password: hashedPassword,
        provider: 'email',
    });

    // Generate token
    const token = generateToken(user);

    return res.status(201).json({
        success: true,
        token,
        user: sanitizeUser(user),
    });
}

/**
 * Handle email/password signin
 */
async function handleSignin(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const { db } = await connectToDatabase();

    // Find user
    const user = await findUserByEmail(db, email);
    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    if (!user.password) {
        return res.status(401).json({
            error: 'This account uses OAuth. Please sign in with your OAuth provider.',
        });
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await updateLastLogin(db, user._id!.toString());

    // Generate token
    const token = generateToken(user);

    return res.status(200).json({
        success: true,
        token,
        user: sanitizeUser(user),
    });
}

/**
 * Handle Google OAuth authentication
 */
async function handleGoogleAuth(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'ID token is required' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(500).json({ error: 'Google OAuth is not configured' });
    }

    try {
        // Verify Google token
        console.log('Verifying Google token with Client ID:', process.env.GOOGLE_CLIENT_ID);
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
            console.error('Google token payload is empty');
            return res.status(401).json({ error: 'Invalid Google token' });
        }

        const { email, name, sub: googleId, picture } = payload;
        console.log('Google Auth Success for:', email);

        if (!email || !name) {
            return res.status(400).json({ error: 'Email and name are required from Google' });
        }

        const { db } = await connectToDatabase();

        // Find or create user
        const user = await findOrCreateOAuthUser(db, email, name, 'google', googleId, picture);

        // Generate token
        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            token,
            user: sanitizeUser(user),
        });
    } catch (error) {
        console.error('Google auth error:', error);
        return res.status(401).json({ error: 'Failed to authenticate with Google' });
    }
}

/**
 * Handle GitHub OAuth authentication (initial redirect)
 */
async function handleGitHubAuth(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!GITHUB_CLIENT_ID) {
        return res.status(500).json({ error: 'GitHub OAuth is not configured' });
    }

    const redirectUri = `${req.headers.origin || 'http://localhost:5173'}/auth?action=github-callback`;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        redirectUri
    )}&scope=user:email`;

    return res.status(200).json({ authUrl: githubAuthUrl });
}

/**
 * Handle GitHub OAuth callback
 */
async function handleGitHubCallback(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
    }

    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
        return res.status(500).json({ error: 'GitHub OAuth is not configured' });
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code,
            }),
        });

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
            return res.status(401).json({ error: 'Failed to get access token from GitHub' });
        }

        // Get user info from GitHub
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `token ${accessToken}`,
                Accept: 'application/json',
            },
        });

        const githubUser = await userResponse.json();

        // Get user email if not public
        let email = githubUser.email;
        if (!email) {
            const emailResponse = await fetch('https://api.github.com/user/emails', {
                headers: {
                    Authorization: `token ${accessToken}`,
                    Accept: 'application/json',
                },
            });
            const emails = await emailResponse.json();
            const primaryEmail = emails.find((e: any) => e.primary && e.verified);
            email = primaryEmail?.email;
        }

        if (!email) {
            return res.status(400).json({ error: 'Unable to get email from GitHub' });
        }

        const { db } = await connectToDatabase();

        // Find or create user
        const user = await findOrCreateOAuthUser(
            db,
            email,
            githubUser.name || githubUser.login,
            'github',
            githubUser.id.toString(),
            githubUser.avatar_url
        );

        // Generate token
        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            token,
            user: sanitizeUser(user),
        });
    } catch (error) {
        console.error('GitHub auth error:', error);
        return res.status(401).json({ error: 'Failed to authenticate with GitHub' });
    }
}

/**
 * Verify JWT token
 */
async function handleVerifyToken(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { db } = await connectToDatabase();
    const user = await findUserById(db, decoded.userId);

    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }

    return res.status(200).json({
        success: true,
        user: sanitizeUser(user),
    });
}

/**
 * Get user profile
 */
async function handleGetProfile(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { db } = await connectToDatabase();
    const user = await findUserById(db, decoded.userId);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
        success: true,
        user: sanitizeUser(user),
    });
}
