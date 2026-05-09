# WSL2 Ubuntu 构建指南

## 快速开始

### 1. 启动 WSL2 Ubuntu

```powershell
# 在 PowerShell 中
wsl -d Ubuntu
```

如果没有安装 Ubuntu：
```powershell
wsl --install -d Ubuntu
```

### 2. 运行环境配置脚本

```bash
# 进入项目目录
cd /mnt/d/ClaudeCode/cc-smith/hh/android_app

# 添加执行权限
chmod +x setup_wsl.sh

# 运行配置脚本
./setup_wsl.sh
```

### 3. 重启终端后构建

```bash
# 重新加载环境
source ~/.bashrc

# 进入项目目录
cd /mnt/d/ClaudeCode/cc-smith/hh/android_app

# 首次初始化（如果 buildozer.spec 已存在可跳过）
buildozer init

# 构建 Debug APK
buildozer android debug

# 输出位置
# bin/honghuang-3.5.0-arm64-v8a-debug.apk
```

## 常见问题

### Q: buildozer 命令找不到

```bash
# 检查 PATH
echo $PATH

# 手动添加
export PATH="$HOME/.local/bin:$PATH"

# 或重启终端
source ~/.bashrc
```

### Q: JDK 版本问题

```bash
# 检查 Java 版本
java -version

# 应该是 17 或更高
# 如果不是，安装：
sudo apt install openjdk-17-jdk
```

### Q: 首次构建很慢

首次构建需要下载：
- Android SDK (~500MB)
- Android NDK (~1GB)
- Python for Android (~300MB)

总计约 2GB，根据网络速度可能需要 10-30 分钟。

### Q: 构建失败

```bash
# 清理缓存重试
buildozer android clean
buildozer android debug

# 查看详细日志
buildozer android debug 2>&1 | tee build.log
```

## 桌面测试（可选）

在 WSL 中也可以测试桌面版：

```bash
# 安装 Kivy
pip3 install kivy

# 运行测试
cd /mnt/d/ClaudeCode/cc-smith/hh/android_app
python3 main.py
```

注意：需要 X Server（如 VcXsrv 或 WSLg）。

## Release 构建

```bash
# 构建 Release 版本
buildozer android release

# 需要签名才能安装
# 创建密钥库
keytool -genkey -v -keystore honghuang.keystore -alias honghuang -keyalg RSA -keysize 2048 -validity 10000

# 签名 APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore honghuang.keystore bin/honghuang-3.5.0-arm64-v8a-release-unsigned.apk honghuang
```

## 传输 APK 到 Windows

```bash
# 复制到 Windows 目录
cp bin/*.apk /mnt/d/ClaudeCode/cc-smith/hh/android_app/
```
