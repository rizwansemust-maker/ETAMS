# Test Create Task API

try {
    # Step 1: Login
    Write-Host "🔐 Logging in as admin..."
    $loginBody = @{
        email = "admin@etams.com"
        password = "admin123"
        role = "Admin"
    } | ConvertTo-Json
    
    $loginResp = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -UseBasicParsing -ErrorAction Stop
    
    $loginData = $loginResp.Content | ConvertFrom-Json
    $token = $loginData.token
    Write-Host "✅ Login successful" -ForegroundColor Green
    
    # Step 2: Create Task
    Write-Host "`n📝 Creating task..."
    $taskBody = @{
        title = "Complete Monthly Report"
        description = "Prepare and submit the monthly department report"
        assigned_to = 2
        due_date = "2025-12-15"
    } | ConvertTo-Json
    
    $taskResp = Invoke-WebRequest -Uri "http://localhost:5000/api/tasks" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{"Authorization" = "Bearer $token"} `
        -Body $taskBody `
        -UseBasicParsing -ErrorAction Stop
    
    $taskData = $taskResp.Content | ConvertFrom-Json
    Write-Host "✅ Task created successfully!" -ForegroundColor Green
    Write-Host "Response: " ($taskData | ConvertTo-Json)
    
} catch {
    Write-Host "❌ Error: " -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        Write-Host "Response Status: " $_.Exception.Response.StatusCode
    }
}
