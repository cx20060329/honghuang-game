#!/bin/bash
# 洪荒神话 Android 应用 - WSL2 Ubuntu 构建脚本
# 在 WSL2 Ubuntu 中运行此脚本

set -e

echo "=========================================="
echo "  洪荒神话 Android 构建环境配置"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查是否在 WSL 中
if ! grep -qi microsoft /proc/version; then
    echo -e "${YELLOW}警告: 未检测到 WSL 环境${NC}"
fi

# 1. 更新系统
echo -e "${GREEN}[1/6] 更新系统包...${NC}"
sudo apt update && sudo apt upgrade -y

# 2. 安装依赖
echo -e "${GREEN}[2/6] 安装构建依赖...${NC}"
sudo apt install -y \
    build-essential \
    git \
    ffmpeg \
    libsdl2-dev \
    libsdl2-image-dev \
    libsdl2-mixer-dev \
    libsdl2-ttf-dev \
    libportmidi-dev \
    libswscale-dev \
    libavformat-dev \
    libavcodec-dev \
    zlib1g-dev \
    libgstreamer1.0-dev \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    openjdk-17-jdk \
    autoconf \
    libtool \
    pkg-config \
    libncurses5-dev \
    libncursesw5-dev \
    libtinfo5 \
    cmake \
    libffi-dev \
    libssl-dev \
    automake \
    zip \
    unzip

# 3. 安装 Python 3.10+
echo -e "${GREEN}[3/6] 检查 Python 版本...${NC}"
PYTHON_VERSION=$(python3 --version 2>&1 | grep -oP '\d+\.\d+' | head -1)
echo "当前 Python 版本: $PYTHON_VERSION"

if [[ $(echo "$PYTHON_VERSION < 3.8" | bc -l) -eq 1 ]]; then
    echo -e "${YELLOW}Python 版本过低，安装 Python 3.10...${NC}"
    sudo apt install -y python3.10 python3.10-venv python3.10-dev python3-pip
    sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1
fi

# 4. 安装 pip 和虚拟环境
echo -e "${GREEN}[4/6] 配置 Python 环境...${NC}"
sudo apt install -y python3-venv python3-pip
python3 -m pip install --upgrade pip setuptools wheel

# 5. 安装 Buildozer
echo -e "${GREEN}[5/6] 安装 Buildozer...${NC}"
pip3 install --user buildozer
pip3 install --user cython

# 将 buildozer 添加到 PATH
if ! grep -q "export PATH=\"\$HOME/.local/bin:\$PATH\"" ~/.bashrc; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    source ~/.bashrc
fi

# 6. 验证安装
echo -e "${GREEN}[6/6] 验证安装...${NC}"
echo "Python: $(python3 --version)"
echo "Pip: $(pip3 --version)"
echo "Buildozer: $(buildozer --version 2>&1 || echo '需要重启终端')"

echo ""
echo -e "${GREEN}=========================================="
echo "  环境配置完成！"
echo "==========================================${NC}"
echo ""
echo "下一步操作:"
echo "  1. 重启终端或运行: source ~/.bashrc"
echo "  2. 进入项目目录: cd /mnt/d/ClaudeCode/cc-smith/hh/android_app"
echo "  3. 初始化构建: buildozer init"
echo "  4. 构建 APK: buildozer android debug"
echo ""
echo "首次构建需要下载约 2GB 依赖，请耐心等待。"
