# PowerShell script to reset admin password
# Usage: .\scripts\reset-admin-password.ps1

Write-Host "Admin Password Reset" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host ""

$email = Read-Host "Enter admin email"
$newPassword = Read-Host "Enter new password (min 6 characters)" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($newPassword))

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
    newPassword = $passwordPlain
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/reset-admin-password" -Method POST -Body $body -ContentType "application/json"
    
    Write-Host ""
    Write-Host "Success: $($response.message)" -ForegroundColor Green
    Write-Host "You can now login with:" -ForegroundColor Green
    Write-Host "  Email: $email" -ForegroundColor Yellow
    Write-Host "  Password: $passwordPlain" -ForegroundColor Yellow
} catch {
    Write-Host ""
    Write-Host "Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
    Write-Host "Make sure the development server is running (npm run dev)" -ForegroundColor Yellow
}

