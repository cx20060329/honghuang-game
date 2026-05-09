#!/bin/bash
# Honghuang Android Build Script
# Run this in WSL Ubuntu

set -e

echo "========================================"
echo "  Honghuang Android Build"
echo "========================================"
echo ""

cd /mnt/d/ClaudeCode/cc-smith/hh/android_app

# Check buildozer
if ! command -v buildozer &> /dev/null; then
    echo "[1/3] Installing Buildozer..."
    sudo apt update -qq
    sudo apt install -y -qq build-essential git openjdk-17-jdk python3 python3-pip python3-venv
    pip3 install --user buildozer cython
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    export PATH="$HOME/.local/bin:$PATH"
fi

echo "[2/3] Building APK (first build takes ~30 min)..."
echo ""

buildozer android debug

echo ""
echo "[3/3] Checking output..."
if ls bin/*.apk 1> /dev/null 2>&1; then
    cp bin/*.apk . 2>/dev/null || true
    echo "[OK] Build complete!"
    ls -la *.apk
else
    echo "[!] Check build logs above"
fi

echo ""
echo "========================================"
echo "  Done! APK is in project directory"
echo "========================================"
