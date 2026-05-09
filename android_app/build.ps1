# Build APK Script
# Run in Administrator PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Honghuang Android Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check WSL
$distros = wsl --list --verbose 2>&1
if ($distros -match "Ubuntu") {
    Write-Host "[OK] WSL Ubuntu found" -ForegroundColor Green
} else {
    Write-Host "[!] WSL Ubuntu not found" -ForegroundColor Yellow
    Write-Host "    Run .\install_wsl.ps1 first" -ForegroundColor Cyan
    Read-Host "Press Enter to exit"
    exit 1
}

$projectPath = "D:\ClaudeCode\cc-smith\hh\android_app"
$wslPath = "/mnt/d/ClaudeCode/cc-smith/hh/android_app"

Write-Host ""
Write-Host "[Step 1/3] Setting up build environment..." -ForegroundColor Yellow

wsl -d Ubuntu -- bash -c @"
sudo apt update -qq 2>/dev/null
sudo apt install -y -qq build-essential git openjdk-17-jdk python3 python3-pip python3-venv 2>/dev/null
pip3 install --user buildozer cython 2>/dev/null
echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc 2>/dev/null || true
echo '[OK] Environment ready'
"@

Write-Host ""
Write-Host "[Step 2/3] Building APK (first build takes 20-30 min)..." -ForegroundColor Yellow
Write-Host ""

wsl -d Ubuntu -- bash -c @"
cd $wslPath
export PATH=\"\$HOME/.local/bin:\$PATH\"

if ! command -v buildozer > /dev/null 2>&1; then
    echo '[ERROR] Buildozer not found'
    exit 1
fi

buildozer android debug

if ls bin/*.apk 1> /dev/null 2>&1; then
    cp bin/*.apk . 2>/dev/null
    echo '[OK] Build complete!'
    ls -la *.apk
else
    echo '[!] Build may have failed, check logs above'
fi
"@

Write-Host ""
Write-Host "[Step 3/3] Checking output..." -ForegroundColor Yellow
Write-Host ""

Get-ChildItem -Path $projectPath -Filter "*.apk" -ErrorAction SilentlyContinue | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  $($_.Name) ($sizeMB MB)" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Done!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
