# Authentication System Documentation

## Overview
Mira Chatbot now includes a comprehensive authentication system with support for:
- ✅ Email/Password authentication
- ✅ Google OAuth (Sign in with Google)
- ✅ GitHub OAuth (Sign in with GitHub)

## Testing Authentication Locally

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Access the Application
Open `http://localhost:5173` in your browser

### 3. Test Authentication Features

#### Email/Password Authentication
1. Click on the **User icon** in the top-right corner
2. Select **Sign in** or **Sign up**
3. For Sign Up:
   - Enter your name
   - Enter your email
   - Enter a password (minimum 6 characters)
   - Click "Create account"
4. For Sign In:
   - Enter your email
   - Enter your password
   - Click "Sign in"

#### Google OAuth
1. Open the authentication modal
2. Click the **"Sign in with Google"** button
3. You'll be redirected to Google's sign-in page
4. Select your Google account
5. Grant permissions
6. You'll be redirected back to the app, signed in

#### GitHub OAuth
1. Open the authentication modal
2. Click the **"Sign in with GitHub"** button
3. You'll be redirected to GitHub's authorization page
4. Click "Authorize"
5. You'll be redirected back to the app, signed in

## Current Configuration

### Environment Variables (Already Configured)
```env
# Google OAuth
VITE_GOOGLE_CLIENT_ID=377645543898-6f9ulgss9fpvtlims9u996s85sltgee7.apps.googleusercontent.com
GOOGLE_CLIENT_ID=377645543898-6f9ulgss9fpvtlims9u996s85sltgee7.apps.googleusercontent.com

# GitHub OAuth
GITHUB_CLIENT_ID=Ov23liQbkNu3G0zPBa9n
GITHUB_CLIENT_SECRET=59da4666826d2ab9f8e3984f5e4ec16afc86ffd1

# JWT Secret (⚠️ CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-to-something-very-secure

# MongoDB
MONGODB_URI=mongodb+srv://hesarap3_db_user:5ZQ2FHldaF512Sbu@miraai.nfwm6ka.mongodb.net/?appName=Miraai
MONGODB_DB=mira
```

## What to Test

### ✅ User Registration
- [ ] Sign up with email/password works
- [ ] Validation errors show correctly (short password, missing fields)
- [ ] User data is stored in MongoDB
- [ ] JWT token is generated and stored

### ✅ User Login
- [ ] Sign in with correct credentials works
- [ ] Sign in with incorrect credentials fails gracefully
- [ ] Session persists after page reload
- [ ] "Remember me" functionality works

### ✅ Google OAuth
- [ ] Google sign-in button appears
- [ ] Clicking redirects to Google
- [ ] After authorization, user is signed in
- [ ] User profile (name, email, avatar) is populated from Google

### ✅ GitHub OAuth
- [ ] GitHub sign-in button appears
- [ ] Clicking redirects to GitHub
- [ ] After authorization, user is signed in
- [ ] User profile (name, email, avatar) is populated from GitHub

### ✅ User Session
- [ ] User stays logged in after page refresh
- [ ] User profile displays correctly in navbar
- [ ] Sign out works properly
- [ ] After sign out, user is prompted to sign in again

### ✅ Protected Features
- [ ] Chat history is associated with user account
- [ ] User preferences are saved per account
- [ ] Shared chats show correct user information

## API Endpoints

All authentication endpoints are in `/api/auth`:

### POST /api/auth?action=signup
Register a new user with email/password
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

### POST /api/auth?action=signin
Sign in with email/password
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### POST /api/auth?action=google
Authenticate with Google OAuth
```json
{
  "idToken": "google-id-token"
}
```

### GET /api/auth?action=github
Get GitHub OAuth URL (redirects)

### POST /api/auth?action=github-callback
Handle GitHub OAuth callback
```json
{
  "code": "github-auth-code"
}
```

### POST /api/auth?action=verify
Verify JWT token
```
Headers: Authorization: Bearer <token>
```

### GET /api/auth?action=profile
Get user profile
```
Headers: Authorization: Bearer <token>
```

## Troubleshooting

### Google OAuth Not Working
1. Check that `VITE_GOOGLE_CLIENT_ID` is set correctly
2. Verify authorized JavaScript origins include `http://localhost:5173`
3. Verify authorized redirect URIs include your domain
4. Check browser console for errors

### GitHub OAuth Not Working
1. Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set
2. Check callback URL matches: `http://localhost:5173/api/auth?action=github-callback`
3. Ensure the GitHub OAuth app is active

### MongoDB Connection Issues
1. Verify `MONGODB_URI` is correct
2. Check MongoDB Atlas allows connections from your IP
3. Verify database user has correct permissions

### JWT Token Issues
1. Make sure `JWT_SECRET` is set
2. Check token is being stored in localStorage
3. Verify token hasn't expired (7 days by default)

## Security Notes

⚠️ **IMPORTANT FOR PRODUCTION:**

1. **Generate a Strong JWT Secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Replace `JWT_SECRET` with the generated value

2. **Never Commit Secrets:**
   - `.env` is in `.gitignore`
   - Never commit `GITHUB_CLIENT_SECRET` or `JWT_SECRET`

3. **Set Up Vercel Environment Variables:**
   - Add all environment variables to Vercel project settings
   - Keep secrets encrypted in Vercel

4. **OAuth Redirect URLs:**
   - Update Google OAuth for production domain
   - Update GitHub OAuth for production domain

## Deployment Checklist

- [ ] Generate strong JWT_SECRET
- [ ] Add all env variables to Vercel
- [ ] Update Google OAuth redirect URIs for production domain
- [ ] Update GitHub OAuth callback URL for production domain
- [ ] Test authentication on production
- [ ] Verify MongoDB connection from Vercel
- [ ] Enable HTTPS only in production

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Vercel function logs
3. Verify environment variables are set correctly
4. Test MongoDB connection separately
5. Verify OAuth app configurations

## Next Steps

Consider implementing:
- [ ] Password reset functionality
- [ ] Email verification
- [ ] Two-factor authentication (2FA)
- [ ] Social login with more providers (Twitter, Microsoft, etc.)
- [ ] User profile management page
- [ ] Account deletion feature
