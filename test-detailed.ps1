Write-Host "Testing specific error cause..." -ForegroundColor Cyan
Write-Host ""

# Create a more detailed test
$body = @"
{
    "message": "test",
    "model": "gemini-2.0-flash",
    "history": [],
    "options": {}
}
"@

Write-Host "Sending request to chat API..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "https://mira-chatbot-eta.vercel.app/api/chat" -Method POST -Body $body -ContentType "application/json" -ErrorVariable responseError
    Write-Host "Success! Response received" -ForegroundColor Green
    Write-Host $response
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    Write-Host "Status Code: $statusCode" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    # Try to get more details from response
    $result = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($result)
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response Body:" -ForegroundColor Yellow
    Write-Host $responseBody -ForegroundColor White
}

Write-Host ""
Write-Host "Checking if MongoDB is accessible..." -ForegroundColor Yellow
Write-Host "Note: This requires MongoDB connection string to be valid" -ForegroundColor Gray
