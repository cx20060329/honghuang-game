#!/bin/bash
# 洪荒神话 Android 构建脚本 v4.0
# 所有文件都安装到 D 盘

set -e

echo "=========================================="
echo "  洪荒神话 Android 构建脚本 v4.0"
echo "  所有文件安装到 D 盘"
echo "=========================================="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 所有路径都在 D 盘
BUILD_DIR="/mnt/d/ClaudeCode/cc-smith/hh/android_app"
SDK_DIR="$BUILD_DIR/android_tools"

echo -e "${GREEN}安装目录: $SDK_DIR${NC}"

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
mkdir -p "$SDK_DIR/android-sdk/cmdline-tools/latest"
mkdir -p "$SDK_DIR/android-ndk-r25b"
mkdir -p "$SDK_DIR/apache-ant-1.9.4"

# 4. 检查 SDK/NDK
echo -e "${GREEN}[4/5] 检查 Android SDK/NDK...${NC}"

SDK_MANAGER="$SDK_DIR/android-sdk/cmdline-tools/latest/bin/sdkmanager"

if [ ! -f "$SDK_MANAGER" ]; then
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  需要手动下载 Android SDK/NDK${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""
    echo "请在 Windows 浏览器中下载："
    echo ""
    echo "1. Android SDK Command Line Tools (Windows 版):"
    echo "   https://dl.google.com/android/repository/commandlinetools-win-9476656_latest.zip"
    echo ""
    echo "2. Android NDK r25b (Windows 版):"
    echo "   https://dl.google.com/android/repository/android-ndk-r25b-windows.zip"
    echo ""
    echo "下载后解压到："
    echo "   D:\\ClaudeCode\\cc-smith\\hh\\android_app\\android_tools\\"
    echo ""
    echo "目录结构应该是："
    echo "   android_tools\\"
    echo "   ├── android-sdk\\cmdline-tools\\latest\\bin\\sdkmanager.bat"
    echo "   └── android-ndk-r25b\\ndk-build.cmd"
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo ""
    read -p "下载并解压完成后按 y 继续: " confirm
    if [ "$confirm" != "y" ]; then
        echo "已取消"
        exit 1
    fi
fi

# 5. 配置 buildozer 使用 D 盘路径
echo -e "${GREEN}[5/5] 配置并构建 APK...${NC}"

# 设置环境变量指向 D 盘
export ANDROID_HOME="$SDK_DIR/android-sdk"
export ANDROID_SDK_ROOT="$SDK_DIR/android-sdk"
export ANDROID_NDK_HOME="$SDK_DIR/android-ndk-r25b"
export HOME="/mnt/d/ClaudeCode/cc-smith/hh/android_app"

# 进入项目目录
cd "$BUILD_DIR"

# 运行 buildozer
buildozer android debug

# 完成
echo ""
echo -e "${GREEN}=========================================="
echo "  构建完成！"
echo "==========================================${NC}"
echo ""
ls -la "$BUILD_DIR/bin/"*.apk 2>/dev/null && echo "" || echo "请检查构建日志"
