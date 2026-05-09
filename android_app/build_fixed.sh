#!/bin/bash
# 洪荒神话 Android 一键构建脚本
# 解决网络问题，预装所有依赖

set -e

echo "=========================================="
echo "  洪荒神话 Android 构建脚本 v2.0"
echo "=========================================="

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 配置
BUILD_DIR="/mnt/d/ClaudeCode/cc-smith/hh/android_app"
SDK_DIR="$HOME/.buildozer/android/platform"
SDK_VERSION="9476656"
NDK_VERSION="r25b"

# 1. 安装系统依赖
echo -e "${GREEN}[1/6] 安装系统依赖...${NC}"
sudo apt update -qq
sudo apt install -y -qq build-essential git openjdk-17-jdk python3.11 python3.11-venv unzip wget curl ca-certificates

# 2. 创建虚拟环境
echo -e "${GREEN}[2/6] 配置 Python 环境...${NC}"
if [ ! -d "$BUILD_DIR/buildenv" ]; then
    python3.11 -m venv "$BUILD_DIR/buildenv"
fi
source "$BUILD_DIR/buildenv/bin/activate"
pip install -q buildozer cython

# 3. 创建目录
echo -e "${GREEN}[3/6] 创建构建目录...${NC}"
mkdir -p "$SDK_DIR/android-sdk"
mkdir -p "$SDK_DIR/android-ndk-$NDK_VERSION"
mkdir -p "$SDK_DIR/apache-ant-1.9.4"

# 4. 下载 Android SDK（使用国内镜像）
echo -e "${GREEN}[4/6] 下载 Android SDK...${NC}"
SDK_FILE="$SDK_DIR/commandlinetools.zip"
if [ ! -f "$SDK_DIR/cmdline-tools/latest/bin/sdkmanager" ]; then
    echo "  使用国内镜像下载..."
    # 尝试多个镜像
    if ! wget -q --show-progress -O "$SDK_FILE" "https://mirrors.cloud.tencent.com/AndroidSDK/commandlinetools-linux-${SDK_VERSION}_latest.zip" 2>/dev/null; then
        echo "  腾讯镜像失败，尝试阿里云镜像..."
        if ! wget -q --show-progress -O "$SDK_FILE" "https://mirrors.aliyun.com/android-sdk/commandlinetools-linux-${SDK_VERSION}_latest.zip" 2>/dev/null; then
            echo "  阿里云镜像失败，尝试直接下载..."
            wget -q --show-progress -O "$SDK_FILE" "https://dl.google.com/android/repository/commandlinetools-linux-${SDK_VERSION}_latest.zip"
        fi
    fi

    # 解压
    echo "  解压 SDK..."
    cd "$SDK_DIR"
    unzip -q -o "$SDK_FILE" -d android-sdk-temp

    # 修复目录结构
    mkdir -p android-sdk/cmdline-tools/latest
    mv android-sdk-temp/cmdline-tools/* android-sdk/cmdline-tools/latest/ 2>/dev/null || true
    rm -rf android-sdk-temp "$SDK_FILE"
fi

# 5. 下载 Android NDK（使用国内镜像）
echo -e "${GREEN}[5/6] 下载 Android NDK...${NC}"
NDK_FILE="$SDK_DIR/android-ndk.zip"
if [ ! -f "$SDK_DIR/android-ndk-$NDK_VERSION/ndk-build" ]; then
    echo "  使用国内镜像下载..."
    if ! wget -q --show-progress -O "$NDK_FILE" "https://mirrors.cloud.tencent.com/AndroidSDK/android-ndk-$NDK_VERSION-linux.zip" 2>/dev/null; then
        echo "  腾讯镜像失败，尝试阿里云镜像..."
        if ! wget -q --show-progress -O "$NDK_FILE" "https://mirrors.aliyun.com/android-sdk/android-ndk-$NDK_VERSION-linux.zip" 2>/dev/null; then
            echo "  阿里云镜像失败，尝试直接下载..."
            wget -q --show-progress -O "$NDK_FILE" "https://dl.google.com/android/repository/android-ndk-$NDK_VERSION-linux.zip"
        fi
    fi

    echo "  解压 NDK..."
    cd "$SDK_DIR"
    unzip -q -o "$NDK_FILE"
    rm -f "$NDK_FILE"
fi

# 6. 下载 Apache ANT
echo -e "${GREEN}[6/6] 下载 Apache ANT...${NC}"
ANT_FILE="$SDK_DIR/apache-ant.tar.gz"
if [ ! -f "$SDK_DIR/apache-ant-1.9.4/bin/ant" ]; then
    wget -q --show-progress -O "$ANT_FILE" "https://archive.apache.org/dist/ant/binaries/apache-ant-1.9.4-bin.tar.gz"
    cd "$SDK_DIR"
    tar -xzf "$ANT_FILE"
    rm -f "$ANT_FILE"
fi

# 7. 安装 SDK 组件
echo -e "${GREEN}[7/8] 安装 SDK 组件...${NC}"
export ANDROID_HOME="$SDK_DIR/android-sdk"
export ANDROID_SDK_ROOT="$SDK_DIR/android-sdk"

yes | "$SDK_DIR/android-sdk/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK_DIR/android-sdk" \
    "platform-tools" \
    "platforms;android-33" \
    "build-tools;33.0.2" \
    2>/dev/null || true

# 8. 构建 APK
echo -e "${GREEN}[8/8] 构建 APK...${NC}"
cd "$BUILD_DIR"
buildozer android debug

# 完成
echo ""
echo -e "${GREEN}=========================================="
echo "  构建完成！"
echo "==========================================${NC}"
echo ""
echo "APK 位置："
ls -la "$BUILD_DIR/bin/"*.apk 2>/dev/null || echo "  请检查构建日志"
