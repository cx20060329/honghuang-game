# WSL Diagnostic Script
# Run in Administrator PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WSL Environment Diagnostic" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Windows Version
Write-Host "`n[1] Windows Version:" -ForegroundColor Yellow
$winVer = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion"
Write-Host "  Build: $($winVer.CurrentBuild).$($winVer.UBR)"

# 2. WSL Feature Status
Write-Host "`n[2] WSL Feature Status:" -ForegroundColor Yellow
$wslFeature = dism.exe /online /get-featureinfo /featurename:Microsoft-Windows-Subsystem-Linux 2>&1
$vmFeature = dism.exe /online /get-featureinfo /featurename:VirtualMachinePlatform 2>&1

$wslEnabled = $wslFeature | Select-String "Enabled" -SimpleMatch
$vmEnabled = $vmFeature | Select-String "Enabled" -SimpleMatch

if ($wslEnabled) {
    Write-Host "  WSL: Enabled" -ForegroundColor Green
} else {
    Write-Host "  WSL: Not Enabled" -ForegroundColor Red
}

if ($vmEnabled) {
    Write-Host "  VM Platform: Enabled" -ForegroundColor Green
} else {
    Write-Host "  VM Platform: Not Enabled" -ForegroundColor Red
}

# 3. Installed Distros
Write-Host "`n[3] Installed Distros:" -ForegroundColor Yellow
$distros = wsl --list --verbose 2>&1
if ($distros -match "does not exist" -or $distros -match "not found") {
    Write-Host "  No distros installed" -ForegroundColor Yellow
} else {
    Write-Host $distros
}

# 4. WSL Version
Write-Host "`n[4] WSL Version:" -ForegroundColor Yellow
wsl --version 2>&1

# Results
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Diagnostic Result" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (-not $wslEnabled -or -not $vmEnabled) {
    Write-Host "`n[!] WSL features need to be enabled" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run this script to fix:" -ForegroundColor White
    Write-Host "  .\install_wsl.ps1" -ForegroundColor Cyan
} elseif ($distros -match "does not exist" -or $distros -match "not found") {
    Write-Host "`n[!] Ubuntu needs to be installed" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run this script to fix:" -ForegroundColor White
    Write-Host "  .\install_wsl.ps1" -ForegroundColor Cyan
} else {
    Write-Host "`n[OK] WSL environment is ready" -ForegroundColor Green
}

Write-Host ""
Read-Host "Press Enter to exit"
