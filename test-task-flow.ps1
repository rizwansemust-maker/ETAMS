# Test Task Creation and Display

Write-Host "Step 1: Login as Admin" -ForegroundColor Cyan

$loginBody = '{"email":"admin@etams.com","password":"admin123","role":"Admin"}'
$loginResp = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing

$loginData = $loginResp.Content | ConvertFrom-Json
$token = $loginData.token
Write-Host "Login successful" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Create a task" -ForegroundColor Cyan
$taskBody = '{"title":"Review Code Performance","description":"Review and optimize","assigned_to":2,"due_date":"2025-12-25"}'

$taskResp = Invoke-WebRequest -Uri "http://localhost:5000/api/tasks" -Method POST -ContentType "application/json" -Headers @{"Authorization"="Bearer $token"} -Body $taskBody -UseBasicParsing

$taskData = $taskResp.Content | ConvertFrom-Json
Write-Host ("Task created: " + $taskData.taskId) -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Fetch all tasks" -ForegroundColor Cyan
$tasksResp = Invoke-WebRequest -Uri "http://localhost:5000/api/tasks" -Method GET -ContentType "application/json" -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing

$tasks = $tasksResp.Content | ConvertFrom-Json
Write-Host ("Retrieved " + $tasks.Count + " tasks") -ForegroundColor Green

if ($tasks.Count -gt 0) {
    Write-Host "Tasks List:" -ForegroundColor Yellow
    $tasks | Select-Object -First 3 | ForEach-Object {Write-Host $_}
}
