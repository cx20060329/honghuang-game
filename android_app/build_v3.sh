#!/bin/bash
# 洪荒神话 Android 构建脚本 v3.0
# 解决网络问题：使用代理或手动下载

set -e

echo "=========================================="
echo "  洪荒神话 Android 构建脚本 v3.0"
echo "=========================================="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BUILD_DIR="/mnt/d/ClaudeCode/cc-smith/hh/android_app"
SDK_DIR="$HOME/.buildozer/android/platform"

# 1. 安装系统依赖
echo -e "${GREEN}[1/5] 安装系统依赖...${NC}"
sudo apt update -qq
sudo apt install -y -qq build-essential git openjdk-17-jdk python3.11 python3.11-venv unzip wget curl

# 2. 配置 Python 环境
echo -e "${GREEN}[2/5] 配置 Python 环境...${NC}"
if [ ! -d "$BUILD_DIR/buildenv" ]; then
    python3.11 -m venv "$BUILD_DIR/buildenv"
fi
source "$BUILD_DIR/buildenv/bin/activate"
pip install -q --upgrade pip
pip install -q buildozer cython

# 3. 创建目录
echo -e "${GREEN}[3/5] 创建构建目录...${NC}"
mkdir -p "$SDK_DIR/android-sdk/cmdline-tools"
mkdir -p "$SDK_DIR/android-ndk-r25b"
mkdir -p "$SDK_DIR/apache-ant-1.9.4"

# 4. 检查并下载 SDK/NDK
echo -e "${GREEN}[4/5] 检查 Android SDK/NDK...${NC}"

SDK_MANAGER="$SDK_DIR/android-sdk/cmdline-tools/latest/bin/sdkmanager"

if [ ! -f "$SDK_MANAGER" ]; then
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  Android SDK 未安装${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""
    echo "请选择下载方式："
    echo ""
    echo "方式1: 使用代理（如果你有代理）"
    echo "  设置环境变量后重新运行此脚本："
    echo "  export http_proxy=http://127.0.0.1:7890"
    echo "  export https_proxy=http://127.0.0.1:7890"
    echo ""
    echo "方式2: 手动下载（推荐）"
    echo "  在 Windows 浏览器中下载以下文件："
    echo ""
    echo "  1. Android SDK Command Line Tools:"
    echo "     https://dl.google.com/android/repository/commandlinetools-win-9476656_latest.zip"
    echo ""
    echo "  2. Android NDK r25b:"
    echo "     https://dl.google.com/android/repository/android-ndk-r25b-windows.zip"
    echo ""
    echo "  下载后解压到以下目录："
    echo "  SDK: $SDK_DIR/android-sdk/"
    echo "  NDK: $SDK_DIR/android-ndk-r25b/"
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo ""
    read -p "已手动下载并解压完成？(y/n): " confirm
    if [ "$confirm" != "y" ]; then
        echo "请完成下载后重新运行脚本"
        exit 1
    fi
fi

# 5. 构建 APK
echo -e "${GREEN}[5/5] 构建 APK...${NC}"
cd "$BUILD_DIR"

# 设置环境变量
export ANDROID_HOME="$SDK_DIR/android-sdk"
export ANDROID_SDK_ROOT="$SDK_DIR/android-sdk"
export ANDROID_NDK_HOME="$SDK_DIR/android-ndk-r25b"

# 运行 buildozer
buildozer android debug

# 完成
echo ""
echo -e "${GREEN}=========================================="
echo "  构建完成！"
echo "==========================================${NC}"
echo ""
ls -la "$BUILD_DIR/bin/"*.apk 2>/dev/null && echo "" || echo "请检查构建日志"
