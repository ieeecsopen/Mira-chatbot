# MIRA Chatbot API Diagnostic Script
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "MIRA Chatbot API Diagnostics" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://mira-chatbot-eta.vercel.app"

# Test 1: Check main page
Write-Host "[1/3] Testing main page..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $baseUrl -Method GET -UseBasicParsing
    Write-Host "OK Main page is accessible (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "FAIL Main page failed" -ForegroundColor Red
}
Write-Host ""

# Test 2: Check chat API with POST
Write-Host "[2/3] Testing chat API endpoint..." -ForegroundColor Yellow
try {
    $body = '{"message":"hello","model":"gemini-2.0-flash","history":[],"sessionId":"test-123","options":{}}'
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    Write-Host "OK Chat API responded successfully" -ForegroundColor Green
} catch {
    $errorMessage = $_.Exception.Message
    Write-Host "FAIL Chat API failed:" -ForegroundColor Red
    Write-Host "     $errorMessage" -ForegroundColor Red
    
    if ($errorMessage -like "*FUNCTION_INVOCATION_FAILED*") {
        Write-Host ""
        Write-Host "ISSUE: FUNCTION_INVOCATION_FAILED detected" -ForegroundColor Yellow
        Write-Host "  Possible causes:" -ForegroundColor Yellow
        Write-Host "  - Missing GEMINI_API_KEY in Vercel" -ForegroundColor White
        Write-Host "  - Invalid MongoDB connection" -ForegroundColor White
        Write-Host "  - Runtime error in /api/chat.ts" -ForegroundColor White
    }
}
Write-Host ""

# Test 3: Check environment variables
Write-Host "[3/3] Checking Vercel environment variables..." -ForegroundColor Yellow
$envOutput = npx vercel env ls 2>&1 | Out-String

if ($envOutput -match "GEMINI_API_KEY") {
    Write-Host "OK GEMINI_API_KEY is set" -ForegroundColor Green
} else {
    Write-Host "FAIL GEMINI_API_KEY is NOT set" -ForegroundColor Red
}

if ($envOutput -match "MONGODB_URI") {
    Write-Host "OK MONGODB_URI is set" -ForegroundColor Green
} else {
    Write-Host "FAIL MONGODB_URI is NOT set" -ForegroundColor Red
}

if ($envOutput -match "JWT_SECRET") {
    Write-Host "OK JWT_SECRET is set" -ForegroundColor Green
} else {
    Write-Host "FAIL JWT_SECRET is NOT set" -ForegroundColor Red
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Diagnostic Complete" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
