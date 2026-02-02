# Quick Start: Netlify Backend Deployment

## Prerequisites
- GitHub repository connected to Netlify
- Netlify account with site created
- GitHub secrets configured

## One-Time Setup (5 minutes)

### 1. Get Netlify Credentials
```bash
# Get from Netlify Dashboard:
# - Site ID: Site Settings > General > Site details
# - Auth Token: User Settings > Applications > New access token
```

### 2. Add GitHub Secrets
Go to your repo's Settings > Secrets and variables > Actions:
- `NETLIFY_AUTH_TOKEN` - Your personal access token
- `NETLIFY_SITE_ID` - Your site ID

### 3. Configure Netlify Site Settings
In your Netlify site dashboard:
- **Build command**: `npm install --legacy-peer-deps`
- **Publish directory**: `public`
- **Functions directory**: `netlify/functions`

### 4. Add Environment Variables in Netlify
Site Settings > Environment variables:
```
GEMINI_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=https://your-frontend.com,http://localhost:5173
```

## Deployment

### Automatic (Recommended)
Push to main branch - automatically deploys via GitHub Actions:
```bash
git add .
git commit -m "Deploy backend"
git push origin main
```

### Manual
```bash
npm install --legacy-peer-deps
netlify deploy --prod
```

## Testing
```bash
# Health check
curl https://your-site.netlify.app/healthz

# Should return: {"status":"ok","timestamp":...,"service":"Mira Chatbot Backend"}
```

## API Endpoints
All endpoints automatically available at:
- `https://your-site.netlify.app/api/auth`
- `https://your-site.netlify.app/api/chat`
- `https://your-site.netlify.app/api/embeddings`
- `https://your-site.netlify.app/healthz`

## Troubleshooting

**Build fails?**
- Check GitHub Actions logs
- Verify `@netlify/functions` is in package.json devDependencies
- Ensure Node version is set to 20 in netlify.toml

**Functions not working?**
- Verify environment variables in Netlify dashboard
- Check function logs in Netlify Functions tab
- Ensure CORS_ORIGIN includes your frontend URL

**Need help?**
See full documentation: `docs/NETLIFY_DEPLOYMENT.md`
