#!/usr/bin/env python3
"""
洪荒神话 Android 应用启动脚本
用于在桌面环境测试 Kivy 应用
"""

import os
import sys
import shutil

def setup_environment():
    """设置环境"""
    # 复制游戏数据到当前目录
    src_data = os.path.join('..', 'game_data_full.json')
    dst_data = 'game_data_full.json'

    if os.path.exists(src_data) and not os.path.exists(dst_data):
        shutil.copy(src_data, dst_data)
        print(f'已复制游戏数据: {dst_data}')

    # 创建存档目录
    os.makedirs('saves', exist_ok=True)

    # 创建资源目录
    os.makedirs('assets/images', exist_ok=True)
    os.makedirs('assets/sfx', exist_ok=True)
    os.makedirs('assets/bgm', exist_ok=True)

    print('环境设置完成')
    print('运行: python main.py')

if __name__ == '__main__':
    setup_environment()
