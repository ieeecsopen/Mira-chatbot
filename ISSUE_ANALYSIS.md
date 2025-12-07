# MIRA Chatbot - Issue Analysis and Fix

## Problem
Your deployed chatbot on Vercel is returning:
```
FUNCTION_INVOCATION_FAILED (500 Internal Server Error)
```

## Diagnosis Results
✅ Main site loads successfully
✅ All environment variables are set (GEMINI_API_KEY, MONGODB_URI, JWT_SECRET)  
❌ API endpoint `/api/chat` fails with 500 error

## Most Likely Causes

### 1. MongoDB Connection Issue (MOST LIKELY)
Your MongoDB connection string might be:
- **Invalid or expired**
- **Network access not configured** - MongoDB Atlas needs to allow Vercel's IPs
- **Database user credentials wrong**

**Fix**:
1. Go to MongoDB Atlas: https://cloud.mongodb.com/
2. Navigate to **Network Access**
3. Click **Add IP Address**
4. Select **Allow Access from Anywhere** (0.0.0.0/0)
5. Save and wait 2 minutes for changes to propagate

### 2. MongoDB Connection String Format
Ensure your `MONGODB_URI` in Vercel is in this exact format:
```
mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=mira
```

### 3. Serverless Function Timeout
The function might be timing out trying to connect to MongoDB.

**Fix**: Update `api/chat.ts` to handle connection failures gracefully

## Recommended Actions

### Action 1: Update MongoDB Network Access
```bash
1. Login to MongoDB Atlas
2. Go to Network Access → Add IP Address
3. Select "Allow Access from Anywhere" 
4. Click Confirm
```

### Action 2: Test MongoDB Connection Locally
Run this command to verify your MongoDB URI works:
```powershell
# Create a test file
$testCode = @'
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function test() {
    try {
        await client.connect();
        console.log("✓ MongoDB connected successfully!");
        await client.close();
    } catch (error) {
        console.error("✗ MongoDB connection failed:", error.message);
    }
}
test();
'@

Set-Content -Path "test-mongo.js" -Value $testCode
node test-mongo.js
```

### Action 3: Make MongoDB Optional (Temporary Fix)
If you want the chatbot to work without MongoDB temporarily, we can modify the API to continue even if MongoDB fails.

### Action 4: Check Vercel Function Logs
Get detailed error logs:
```powershell
# Get your latest deployment URL
npx vercel ls

# View logs for specific deployment
npx vercel logs <your-deployment-url>
```

## Quick Test After Fix

Run this to test:
```powershell
.\diagnose.ps1
```

If chat API shows "OK", your fix worked!

## Need More Help?

Run these commands and share the output:
```powershell
# 1. Check what's in your MongoDB URI (safely)
npx vercel env pull .env.vercel
cat .env.vercel | Select-String "MONGODB"

# 2. View recent errors
npx vercel logs https://mira-chatbot-eta.vercel.app
```
