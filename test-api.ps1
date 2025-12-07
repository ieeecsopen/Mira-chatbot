# MIRA Chatbot API Diagnostic Script
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "MIRA Chatbot API Diagnostics" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://mira-chatbot-eta.vercel.app"

# Test 1: Check main page
Write-Host "[1/4] Testing main page..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $baseUrl -Method GET -UseBasicParsing
    Write-Host "✓ Main page is accessible (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "✗ Main page failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Check chat API with OPTIONS (CORS preflight)
Write-Host "[2/4] Testing chat API CORS..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" -Method OPTIONS -UseBasicParsing
    Write-Host "✓ CORS check passed (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "⚠ CORS check: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Check chat API with POST
Write-Host "[3/4] Testing chat API endpoint..." -ForegroundColor Yellow
try {
    $body = @{
        message = "hello"
        model = "gemini-2.0-flash"
        history = @()
        sessionId = "test-session"
        options = @{}
    } | ConvertTo-Json -Depth 5

    $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ Chat API responded successfully" -ForegroundColor Green
    Write-Host "Response preview:" -ForegroundColor Gray
    Write-Host $response.Content.Substring(0, [Math]::Min(200, $response.Content.Length))
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = ""
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
        $reader.Close()
    } catch {}
    
    Write-Host "✗ Chat API failed" -ForegroundColor Red
    Write-Host "  Status Code: $statusCode" -ForegroundColor Red
    Write-Host "  Error: $errorBody" -ForegroundColor Red
    
    if ($errorBody -like "*FUNCTION_INVOCATION_FAILED*") {
        Write-Host ""
        Write-Host "⚠ FUNCTION_INVOCATION_FAILED Error Detected!" -ForegroundColor Yellow
        Write-Host "This usually means:" -ForegroundColor Yellow
        Write-Host "  1. Missing environment variables (GEMINI_API_KEY)" -ForegroundColor Yellow
        Write-Host "  2. Runtime error in the serverless function" -ForegroundColor Yellow
        Write-Host "  3. Database connection issues (MONGODB_URI)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 4: Check environment variables
Write-Host "[4/4] Checking Vercel environment variables..." -ForegroundColor Yellow
try {
    $envVars = npx vercel env ls 2>&1
    if ($envVars -like "*GEMINI_API_KEY*") {
        Write-Host "✓ GEMINI_API_KEY is set" -ForegroundColor Green
    } else {
        Write-Host "✗ GEMINI_API_KEY is NOT set" -ForegroundColor Red
    }
    
    if ($envVars -like "*MONGODB_URI*") {
        Write-Host "✓ MONGODB_URI is set" -ForegroundColor Green
    } else {
        Write-Host "✗ MONGODB_URI is NOT set" -ForegroundColor Red
    }
    
    if ($envVars -like "*JWT_SECRET*") {
        Write-Host "✓ JWT_SECRET is set" -ForegroundColor Green
    } else {
        Write-Host "✗ JWT_SECRET is NOT set" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠ Could not check environment variables" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Diagnostic Summary" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps if chat API failed:" -ForegroundColor Yellow
Write-Host "1. Check Vercel function logs:" -ForegroundColor White
Write-Host "   npx vercel logs https://mira-chatbot-eta.vercel.app" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Verify environment variables in Vercel dashboard:" -ForegroundColor White
Write-Host "   https://vercel.com/hesarap3-4649s-projects/mira-chatbot/settings/environment-variables" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test locally with same environment:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
