# 洪荒神话 Android 应用

基于 Kivy 框架的 Android 文字冒险游戏，从 Node.js CLI 版本移植。

## 项目结构

```
android_app/
├── main.py              # 主程序入口
├── buildozer.spec       # Buildozer 打包配置
├── setup.py             # 环境设置脚本
├── game_data_full.json  # 游戏数据（从父目录复制）
├── saves/               # 存档目录
└── assets/
    ├── images/          # 图片资源
    │   ├── icon.png
    │   └── presplash.png
    ├── sfx/             # 音效文件
    │   ├── click.wav
    │   ├── success.wav
    │   ├── fail.wav
    │   ├── achievement.wav
    │   ├── battle.wav
    │   ├── death.wav
    │   └── level_up.wav
    └── bgm/             # 背景音乐
        ├── main.mp3
        ├── battle.mp3
        ├── peaceful.mp3
        └── ending.mp3
```

## 环境要求

- Python 3.8+
- Kivy 2.2.1+
- Buildozer (用于 Android 打包)

## 桌面测试

```bash
# 安装依赖
pip install kivy

# 设置环境
python setup.py

# 运行游戏
python main.py
```

## Android 打包

```bash
# 安装 buildozer
pip install buildozer

# 初始化（首次）
buildozer init

# 构建 APK
buildozer android debug

# 构建 Release 版本
buildozer android release

# 输出位置
# bin/honghuang-3.5.0-arm64-v8a-debug.apk
```

## 功能对照

| CLI 功能 | Android 实现 |
|---------|-------------|
| 控制台输出 | ScrollView + Label |
| 数字选择 | Button 列表 |
| 存档/读档 | JSON 文件存储 |
| 属性显示 | 文本 + 颜色标记 |
| 修炼系统 | 弹出菜单 |
| 成就系统 | 文本提示 |
| Buff 系统 | 状态栏显示 |
| 战力计算 | 节点显示 |

## 音频接口

```python
# 播放背景音乐
audio.play_bgm('main')

# 播放音效
audio.play_sfx('click')

# 切换开关
audio.toggle_bgm()
audio.toggle_sfx()

# 设置音量
audio.set_bgm_volume(0.5)
```

## 资源替换

1. **图标**: 替换 `assets/images/icon.png` (推荐 512x512)
2. **启动画面**: 替换 `assets/images/presplash.png`
3. **音效**: 替换 `assets/sfx/*.wav`
4. **背景音乐**: 替换 `assets/bgm/*.mp3`

## 注意事项

- Android 11+ 需要 `MANAGE_EXTERNAL_STORAGE` 权限才能访问外部存储
- 存档默认保存在应用私有目录
- Release 版本需要签名才能发布到应用商店
