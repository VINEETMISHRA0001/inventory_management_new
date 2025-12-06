# PowerShell script to initialize admin user
# Usage: .\scripts\init-admin.ps1

Write-Host "Admin User Initialization" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

$email = Read-Host "Enter admin email"
$password = Read-Host "Enter admin password (min 6 characters)" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

if ([string]::IsNullOrWhiteSpace($email) -or [string]::IsNullOrWhiteSpace($passwordPlain)) {
    Write-Host "Email and password are required" -ForegroundColor Red
    exit 1
}

if ($passwordPlain.Length -lt 6) {
    Write-Host "Password must be at least 6 characters" -ForegroundColor Red
    exit 1
}

$body = @{
    email = $email
    password = $passwordPlain
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/init-admin" -Method POST -Body $body -ContentType "application/json"
    
    Write-Host ""
    Write-Host "Success: $($response.message)" -ForegroundColor Green
} catch {
    $errorMessage = $_.ErrorDetails.Message
    try {
        $errorObj = $errorMessage | ConvertFrom-Json
        Write-Host ""
        Write-Host "Error: $($errorObj.error)" -ForegroundColor Red
    } catch {
        Write-Host ""
        Write-Host "Error: $errorMessage" -ForegroundColor Red
    }
    Write-Host "Make sure the development server is running (npm run dev)" -ForegroundColor Yellow
}

