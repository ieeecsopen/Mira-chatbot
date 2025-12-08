import { Db, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

export interface User {
    _id?: ObjectId;
    email: string;
    name: string;
    password?: string; // Optional for OAuth users
    avatar?: string;
    provider: 'email' | 'google' | 'github';
    providerId?: string; // ID from OAuth provider
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
}

/**
 * Create a new user
 */
export async function createUser(db: Db, userData: Omit<User, '_id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const users = db.collection<User>('users');

    // Check if user already exists
    const existingUser = await users.findOne({ email: userData.email });
    if (existingUser) {
        throw new Error('User with this email already exists');
    }

    const now = new Date();
    const user: Omit<User, '_id'> = {
        ...userData,
        createdAt: now,
        updatedAt: now,
    };

    const result = await users.insertOne(user as User);
    return { ...user, _id: result.insertedId } as User;
}

/**
 * Find user by email
 */
export async function findUserByEmail(db: Db, email: string): Promise<User | null> {
    const users = db.collection<User>('users');
    return users.findOne({ email });
}

/**
 * Find user by ID
 */
export async function findUserById(db: Db, userId: string): Promise<User | null> {
    const users = db.collection<User>('users');
    return users.findOne({ _id: new ObjectId(userId) });
}

/**
 * Find or create user from OAuth provider
 */
export async function findOrCreateOAuthUser(
    db: Db,
    email: string,
    name: string,
    provider: 'google' | 'github',
    providerId: string,
    avatar?: string
): Promise<User> {
    const users = db.collection<User>('users');

    // Try to find existing user
    const user = await users.findOne({ email });

    if (user) {
        // Update last login and provider info if needed
        await users.updateOne(
            { _id: user._id },
            {
                $set: {
                    lastLoginAt: new Date(),
                    updatedAt: new Date(),
                    // Update avatar if provided
                    ...(avatar && { avatar }),
                },
            }
        );
        return user;
    }

    // Create new user
    const now = new Date();
    const newUser: Omit<User, '_id'> = {
        email,
        name,
        provider,
        providerId,
        avatar,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
    };

    const result = await users.insertOne(newUser as User);
    return { ...newUser, _id: result.insertedId } as User;
}

/**
 * Update user's last login time
 */
export async function updateLastLogin(db: Db, userId: string): Promise<void> {
    const users = db.collection<User>('users');
    await users.updateOne(
        { _id: new ObjectId(userId) },
        {
            $set: {
                lastLoginAt: new Date(),
                updatedAt: new Date(),
            },
        }
    );
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

/**
 * Verify password
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}

/**
 * Update user profile
 */
export async function updateUserProfile(
    db: Db,
    userId: string,
    updates: Partial<Pick<User, 'name' | 'avatar'>>
): Promise<User | null> {
    const users = db.collection<User>('users');
    const result = await users.findOneAndUpdate(
        { _id: new ObjectId(userId) },
        {
            $set: {
                ...updates,
                updatedAt: new Date(),
            },
        },
        { returnDocument: 'after' }
    );

    return result ?? null;
}
