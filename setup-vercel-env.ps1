# MIRA Chatbot - Vercel Environment Variables Setup Script
# This script helps you set up environment variables for Vercel deployment

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "MIRA Chatbot - Vercel Setup" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
Write-Host "Checking for Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "✓ Vercel CLI installed successfully!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "✓ Vercel CLI is already installed" -ForegroundColor Green
    Write-Host ""
}

# Login to Vercel
Write-Host "Step 1: Login to Vercel" -ForegroundColor Cyan
Write-Host "This will open your browser to authenticate..." -ForegroundColor Gray
vercel login
Write-Host ""

# Link to project
Write-Host "Step 2: Link to your Vercel project" -ForegroundColor Cyan
Write-Host "If this is your first time, select your existing project 'mira-chatbot-eta'" -ForegroundColor Gray
vercel link
Write-Host ""

# Prompt for required environment variables
Write-Host "Step 3: Set Environment Variables" -ForegroundColor Cyan
Write-Host ""

# GEMINI_API_KEY
Write-Host "[1/5] GEMINI_API_KEY (Required)" -ForegroundColor Yellow
Write-Host "Get your API key from: https://makersuite.google.com/app/apikey" -ForegroundColor Gray
$geminiKey = Read-Host "Enter your Gemini API Key"
if ($geminiKey) {
    Write-Host "Setting GEMINI_API_KEY for production..." -ForegroundColor Gray
    echo $geminiKey | vercel env add GEMINI_API_KEY production
    Write-Host "Setting GEMINI_API_KEY for preview..." -ForegroundColor Gray
    echo $geminiKey | vercel env add GEMINI_API_KEY preview
    Write-Host "✓ GEMINI_API_KEY set" -ForegroundColor Green
} else {
    Write-Host "⚠ Skipped GEMINI_API_KEY" -ForegroundColor Red
}
Write-Host ""

# VITE_GEMINI_API_KEY
Write-Host "[2/5] VITE_GEMINI_API_KEY (Required for client-side)" -ForegroundColor Yellow
Write-Host "Using the same key as above..." -ForegroundColor Gray
if ($geminiKey) {
    echo $geminiKey | vercel env add VITE_GEMINI_API_KEY production
    echo $geminiKey | vercel env add VITE_GEMINI_API_KEY preview
    Write-Host "✓ VITE_GEMINI_API_KEY set" -ForegroundColor Green
}
Write-Host ""

# MONGODB_URI
Write-Host "[3/5] MONGODB_URI (Required for database)" -ForegroundColor Yellow
Write-Host "Get your connection string from: https://cloud.mongodb.com/" -ForegroundColor Gray
Write-Host "Example: mongodb+srv://username:password@cluster.mongodb.net/" -ForegroundColor Gray
$mongoUri = Read-Host "Enter your MongoDB URI (or press Enter to skip)"
if ($mongoUri) {
    echo $mongoUri | vercel env add MONGODB_URI production
    echo $mongoUri | vercel env add MONGODB_URI preview
    Write-Host "✓ MONGODB_URI set" -ForegroundColor Green
} else {
    Write-Host "⚠ Skipped MONGODB_URI" -ForegroundColor Red
}
Write-Host ""

# JWT_SECRET
Write-Host "[4/5] JWT_SECRET (Required for authentication)" -ForegroundColor Yellow
Write-Host "Generating a secure random JWT secret..." -ForegroundColor Gray
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$jwtSecret += (Get-Random -Maximum 999999).ToString()
Write-Host "Generated JWT Secret: $jwtSecret" -ForegroundColor Gray
$useGenerated = Read-Host "Use this generated secret? (Y/n)"
if ($useGenerated -ne 'n' -and $useGenerated -ne 'N') {
    echo $jwtSecret | vercel env add JWT_SECRET production
    echo $jwtSecret | vercel env add JWT_SECRET preview
    Write-Host "✓ JWT_SECRET set" -ForegroundColor Green
} else {
    $customJwt = Read-Host "Enter your custom JWT secret"
    if ($customJwt) {
        echo $customJwt | vercel env add JWT_SECRET production
        echo $customJwt | vercel env add JWT_SECRET preview
        Write-Host "✓ JWT_SECRET set" -ForegroundColor Green
    }
}
Write-Host ""

# MONGODB_DB
Write-Host "[5/5] MONGODB_DB (Optional, default: mira)" -ForegroundColor Yellow
$mongoDb = Read-Host "Enter MongoDB database name (or press Enter for default 'mira')"
if (-not $mongoDb) {
    $mongoDb = "mira"
}
echo $mongoDb | vercel env add MONGODB_DB production
echo $mongoDb | vercel env add MONGODB_DB preview
Write-Host "✓ MONGODB_DB set to: $mongoDb" -ForegroundColor Green
Write-Host ""

# Optional: Google OAuth
Write-Host "Optional: Google OAuth Configuration" -ForegroundColor Cyan
$setupGoogle = Read-Host "Do you want to set up Google OAuth? (y/N)"
if ($setupGoogle -eq 'y' -or $setupGoogle -eq 'Y') {
    $googleClientId = Read-Host "Enter your Google Client ID"
    if ($googleClientId) {
        echo $googleClientId | vercel env add GOOGLE_CLIENT_ID production
        echo $googleClientId | vercel env add GOOGLE_CLIENT_ID preview
        echo $googleClientId | vercel env add VITE_GOOGLE_CLIENT_ID production
        echo $googleClientId | vercel env add VITE_GOOGLE_CLIENT_ID preview
        Write-Host "✓ Google OAuth configured" -ForegroundColor Green
    }
}
Write-Host ""

# Optional: GitHub OAuth
Write-Host "Optional: GitHub OAuth Configuration" -ForegroundColor Cyan
$setupGithub = Read-Host "Do you want to set up GitHub OAuth? (y/N)"
if ($setupGithub -eq 'y' -or $setupGithub -eq 'Y') {
    $githubClientId = Read-Host "Enter your GitHub Client ID"
    $githubClientSecret = Read-Host "Enter your GitHub Client Secret"
    if ($githubClientId -and $githubClientSecret) {
        echo $githubClientId | vercel env add GITHUB_CLIENT_ID production
        echo $githubClientId | vercel env add GITHUB_CLIENT_ID preview
        echo $githubClientSecret | vercel env add GITHUB_CLIENT_SECRET production
        echo $githubClientSecret | vercel env add GITHUB_CLIENT_SECRET preview
        Write-Host "✓ GitHub OAuth configured" -ForegroundColor Green
    }
}
Write-Host ""

# Summary
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: vercel --prod" -ForegroundColor White
Write-Host "   This will redeploy your app with the new environment variables" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Visit: https://mira-chatbot-eta.vercel.app/" -ForegroundColor White
Write-Host "   Test your chatbot to ensure it's working" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Check logs if issues persist:" -ForegroundColor White
Write-Host "   vercel logs" -ForegroundColor Gray
Write-Host ""
Write-Host "Environment variables are now configured in Vercel!" -ForegroundColor Green
