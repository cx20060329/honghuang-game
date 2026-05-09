# WSL Ubuntu Auto Installer
# Run in Administrator PowerShell

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERROR] Please run as Administrator!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WSL Ubuntu Auto Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Enable WSL
Write-Host "[Step 1/4] Enabling WSL features..." -ForegroundColor Yellow
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart | Out-Null
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart | Out-Null
Write-Host "  [OK] Features enabled" -ForegroundColor Green

# Step 2: Set WSL version
Write-Host "`n[Step 2/4] Configuring WSL..." -ForegroundColor Yellow
wsl --set-default-version 2 2>$null
Write-Host "  [OK] WSL 2 set as default" -ForegroundColor Green

# Step 3: Install Ubuntu
Write-Host "`n[Step 3/4] Installing Ubuntu..." -ForegroundColor Yellow
Write-Host "  This may take a few minutes..." -ForegroundColor Gray

$process = Start-Process -FilePath "wsl.exe" -ArgumentList "--install -d Ubuntu --no-launch" -Wait -PassThru -NoNewWindow

if ($process.ExitCode -eq 0) {
    Write-Host "  [OK] Ubuntu installed" -ForegroundColor Green
} else {
    Write-Host "  Exit code: $($process.ExitCode)" -ForegroundColor Gray
}

# Step 4: Verify
Write-Host "`n[Step 4/4] Verifying installation..." -ForegroundColor Yellow
$distros = wsl --list --verbose 2>&1

if ($distros -match "Ubuntu") {
    Write-Host "  [OK] Ubuntu is installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Installation Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "  1. Restart computer if prompted" -ForegroundColor Cyan
    Write-Host "  2. Open PowerShell and run: wsl" -ForegroundColor Cyan
    Write-Host "  3. Set up username and password" -ForegroundColor Cyan
} else {
    Write-Host "  [!] Restart required to complete installation" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please restart your computer and run this script again" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
