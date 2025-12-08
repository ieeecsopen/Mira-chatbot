# Test Local Groq Integration
# This script tests if the Groq API is working locally

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "       TESTING LOCAL GROQ API INTEGRATION                       " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Load .env file
if (Test-Path ".env") {
    Write-Host "[1/4] Loading .env file..." -ForegroundColor Yellow
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($key -and -not $key.StartsWith('#')) {
                [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
                Write-Host "  Set: $key" -ForegroundColor Gray
            }
        }
    }
    Write-Host "  .env loaded successfully!" -ForegroundColor Green
} else {
    Write-Host "  ERROR: .env file not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check Groq API Key
Write-Host "[2/4] Checking Groq API Key..." -ForegroundColor Yellow
$groqKey = $env:GROQ_API_KEY
if ($groqKey) {
    Write-Host "  Groq API Key: Found (${groqKey.Substring(0,10)}...)" -ForegroundColor Green
} else {
    Write-Host "  ERROR: GROQ_API_KEY not found in .env!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test Groq API
Write-Host "[3/4] Testing Groq API connection..." -ForegroundColor Yellow
try {
    $testPayload = @{
        model = "llama-3.3-70b-versatile"
        messages = @(
            @{
                role = "user"
                content = "Say 'Hello from Groq!' in Sinhala"
            }
        )
        max_tokens = 100
    } | ConvertTo-Json -Depth 10

    $response = Invoke-RestMethod -Uri "https://api.groq.com/openai/v1/chat/completions" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $groqKey"
            "Content-Type" = "application/json"
        } `
        -Body $testPayload `
        -TimeoutSec 30

    $reply = $response.choices[0].message.content
    Write-Host "  Response: $reply" -ForegroundColor Green
    Write-Host "  Groq API is working!" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Groq API test failed!" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Summary
Write-Host "[4/4] Summary:" -ForegroundColor Yellow
Write-Host "  Groq API Key: OK" -ForegroundColor Green
Write-Host "  Groq API Connection: OK" -ForegroundColor Green
Write-Host ""

Write-Host "================================================================" -ForegroundColor Green
Write-Host "  SUCCESS! Your local environment is ready!                    " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start backend:  npm run dev:api" -ForegroundColor White
Write-Host "  2. Start frontend: npm run dev" -ForegroundColor White
Write-Host "  3. Open: http://localhost:5173" -ForegroundColor White
Write-Host ""
