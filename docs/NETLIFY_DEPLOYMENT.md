# Netlify Backend Deployment Guide

This guide explains how to automatically deploy your backend to Netlify using GitHub Actions.

## Overview

The backend is deployed as Netlify Functions (serverless functions) that handle:
- `/api/auth` - Authentication endpoints
- `/api/chat` - Chat endpoints
- `/api/embeddings` - Embeddings endpoints
- `/healthz` - Health check endpoint

## Setup Instructions

### 1. Install Dependencies

First, install the required Netlify Functions package:

```bash
npm install --save-dev @netlify/functions
```

### 2. Configure Netlify

1. **Create a Netlify Account** (if you don't have one):
   - Go to [netlify.com](https://netlify.com)
   - Sign up or log in

2. **Create a New Site**:
   - Click "Add new site" > "Import an existing project"
   - Connect your GitHub repository
   - Configure build settings:
     - Build command: `npm install --legacy-peer-deps`
     - Publish directory: `public`
     - Functions directory: `netlify/functions`

3. **Get Your Netlify Site ID**:
   - Go to Site settings > General > Site details
   - Copy your **Site ID**

4. **Generate Netlify Auth Token**:
   - Go to User settings > Applications > Personal access tokens
   - Click "New access token"
   - Give it a name (e.g., "GitHub Actions Deploy")
   - Copy the generated token

### 3. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to your GitHub repository
2. Click Settings > Secrets and variables > Actions
3. Click "New repository secret" and add:

   - **NETLIFY_AUTH_TOKEN**: Your Netlify personal access token
   - **NETLIFY_SITE_ID**: Your Netlify site ID

### 4. Set Environment Variables in Netlify

Add your backend environment variables in Netlify:

1. Go to Site settings > Environment variables
2. Add the following variables:
   - `GEMINI_API_KEY` - Your Gemini API key
   - `GROQ_API_KEY` - Your Groq API key
   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Your JWT secret key
   - `CORS_ORIGIN` - Allowed CORS origins (comma-separated)
   - Any other environment variables your backend needs

### 5. Update Your Frontend

Update your frontend to use the Netlify backend URL:

```typescript
// In your frontend configuration
const API_BASE_URL = 'https://your-site-name.netlify.app';
```

## Automatic Deployment

The GitHub Actions workflow (`.github/workflows/netlify-backend-deploy.yml`) will automatically deploy your backend when:

1. **Push to main branch**: Changes to `server/`, `api/`, `netlify/`, `netlify.toml`, or `package.json`
2. **Pull request**: Preview deployments for testing
3. **Manual trigger**: Use "Run workflow" in GitHub Actions tab

## Workflow Features

- ✅ Automatic deployment on push to main
- ✅ Preview deployments for pull requests
- ✅ Build status comments on PRs
- ✅ Deployment URL in GitHub Actions output
- ✅ Health check after deployment

## File Structure

```
.
├── netlify.toml                 # Netlify configuration
├── netlify/
│   └── functions/              # Serverless functions
│       ├── auth.ts             # Auth API handler
│       ├── chat.ts             # Chat API handler
│       ├── embeddings.ts       # Embeddings API handler
│       └── health.ts           # Health check handler
├── .github/
│   └── workflows/
│       └── netlify-backend-deploy.yml  # Deployment workflow
└── package.json                # Added build:backend script
```

## Testing

### Local Testing

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Run locally:
   ```bash
   netlify dev
   ```

### Test Endpoints

After deployment, test your endpoints:

```bash
# Health check
curl https://your-site-name.netlify.app/healthz

# Auth endpoint
curl -X POST https://your-site-name.netlify.app/api/auth \
  -H "Content-Type: application/json" \
  -d '{"action":"login","email":"test@example.com","password":"password"}'
```

## Monitoring

- **Netlify Dashboard**: View deployment logs and function invocations
- **GitHub Actions**: Check workflow runs and deployment status
- **Function Logs**: View real-time logs in Netlify dashboard under Functions

## Troubleshooting

### Build Fails

1. Check GitHub Actions logs for build errors
2. Ensure all dependencies are in `package.json`
3. Make sure `@netlify/functions` is installed: `npm install --save-dev @netlify/functions`
4. Verify Netlify Functions directory is set to `netlify/functions`

### Environment Variables Not Working

1. Verify variables are set in Netlify dashboard
2. Check variable names match exactly (case-sensitive)
3. Redeploy after adding new variables

### CORS Errors

1. Check `CORS_ORIGIN` environment variable in Netlify
2. Verify frontend URL is included in allowed origins
3. Check `netlify.toml` CORS headers configuration

### Function Timeout

- Netlify Functions have a 10-second timeout on free tier
- Optimize long-running operations
- Consider upgrading to Pro for 26-second timeout

## Manual Deployment

If you need to deploy manually:

```bash
# Install dependencies
npm install --legacy-peer-deps

# Deploy with Netlify CLI
netlify deploy --prod
```

Note: Netlify automatically compiles TypeScript functions during deployment, so no build step is needed.

## Additional Resources

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Netlify CLI Documentation](https://docs.netlify.com/cli/get-started/)

## Support

If you encounter issues:
1. Check Netlify function logs
2. Review GitHub Actions workflow logs
3. Verify environment variables are set correctly
4. Test endpoints with curl or Postman
