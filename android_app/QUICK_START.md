# 快速构建指南（手动步骤）

## 第一步：安装 WSL Ubuntu

**在管理员 PowerShell 中运行：**

```powershell
wsl --install -d Ubuntu
```

等待安装完成后，**重启电脑**。

## 第二步：初始化 Ubuntu

重启后，打开 Ubuntu 终端：

```powershell
wsl
```

首次启动会要求设置用户名和密码。

## 第三步：配置构建环境

**在 Ubuntu 中运行：**

```bash
# 更新系统
sudo apt update

# 安装依赖
sudo apt install -y build-essential git openjdk-17-jdk python3 python3-pip python3-venv

# 安装 Buildozer
pip3 install --user buildozer cython

# 添加到 PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## 第四步：构建 APK

```bash
# 进入项目目录
cd /mnt/d/ClaudeCode/cc-smith/hh/android_app

# 构建 APK（首次需要约 30 分钟）
buildozer android debug
```

## 第五步：获取 APK

构建完成后，APK 文件位于：

```
D:\ClaudeCode\cc-smith\hh\android_app\bin\honghuang-3.5.0-arm64-v8a-debug.apk
```

---

## 常见问题

### WSL 安装失败

```powershell
# 手动启用功能
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
# 重启后再次运行 wsl --install -d Ubuntu
```

### Buildozer 找不到

```bash
# 检查 PATH
echo $PATH

# 手动添加
export PATH="$HOME/.local/bin:$PATH"

# 验证
buildozer --version
```

### 构建失败

```bash
# 清理缓存
buildozer android clean

# 重新构建
buildozer android debug
```