#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
洪荒神话 - Kivy Android 应用
从 Node.js CLI 移植的完整文字冒险游戏

功能：
- 存档/读档功能
- ScrollView 剧情显示
- Button 列表选项
- 背景音乐和音效接口
"""

from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.scrollview import ScrollView
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.uix.popup import Popup
from kivy.uix.gridlayout import GridLayout
from kivy.core.audio import SoundLoader
from kivy.properties import StringProperty, ListProperty, NumericProperty, BooleanProperty
from kivy.clock import Clock
from kivy.lang import Builder
from kivy.metrics import dp

import json
import os
import random
from datetime import datetime

# ==================== 配置 ====================
CONFIG = {
    'data_file': 'game_data_full.json',
    'save_dir': 'saves',
    'auto_save': True,
    'type_speed': 0.03,  # 打字机速度（秒/字符）
}

# ==================== 音频管理器 ====================
class AudioManager:
    """背景音乐和音效管理器"""

    def __init__(self):
        self.bgm = None
        self.bgm_volume = 0.5
        self.sfx_volume = 1.0
        self.bgm_enabled = True
        self.sfx_enabled = True

        # 音效文件路径（后期替换）
        self.sfx_paths = {
            'click': 'assets/sfx/click.wav',
            'success': 'assets/sfx/success.wav',
            'fail': 'assets/sfx/fail.wav',
            'achievement': 'assets/sfx/achievement.wav',
            'battle': 'assets/sfx/battle.wav',
            'death': 'assets/sfx/death.wav',
            'level_up': 'assets/sfx/level_up.wav',
        }

        # 背景音乐路径（后期替换）
        self.bgm_paths = {
            'main': 'assets/bgm/main.mp3',
            'battle': 'assets/bgm/battle.mp3',
            'peaceful': 'assets/bgm/peaceful.mp3',
            'ending': 'assets/bgm/ending.mp3',
        }

    def play_bgm(self, name='main'):
        """播放背景音乐"""
        if not self.bgm_enabled:
            return

        if self.bgm:
            self.bgm.stop()

        path = self.bgm_paths.get(name)
        if path and os.path.exists(path):
            self.bgm = SoundLoader.load(path)
            if self.bgm:
                self.bgm.volume = self.bgm_volume
                self.bgm.loop = True
                self.bgm.play()

    def stop_bgm(self):
        """停止背景音乐"""
        if self.bgm:
            self.bgm.stop()
            self.bgm = None

    def play_sfx(self, name):
        """播放音效"""
        if not self.sfx_enabled:
            return

        path = self.sfx_paths.get(name)
        if path and os.path.exists(path):
            sound = SoundLoader.load(path)
            if sound:
                sound.volume = self.sfx_volume
                sound.play()

    def set_bgm_volume(self, volume):
        """设置背景音乐音量"""
        self.bgm_volume = max(0, min(1, volume))
        if self.bgm:
            self.bgm.volume = self.bgm_volume

    def toggle_bgm(self):
        """切换背景音乐开关"""
        self.bgm_enabled = not self.bgm_enabled
        if self.bgm_enabled:
            self.play_bgm()
        else:
            self.stop_bgm()

    def toggle_sfx(self):
        """切换音效开关"""
        self.sfx_enabled = not self.sfx_enabled


# ==================== 游戏状态类 ====================
class GameState:
    """游戏状态管理"""

    def __init__(self):
        self.character = None
        self.current_node_id = None
        self.attributes = {}
        self.items = []
        self.relationships = {}
        self.flags = {}
        self.history = []
        self.game_complete = False
        self.is_dead = False
        self.death_reason = None
        self.achievements = []
        self.cultivation_count = 0
        self.cultivation_cooldown = 0
        self.historical_interventions = []
        self.buffs = []

    def get_attribute(self, name):
        """获取属性值"""
        if name in self.attributes:
            return max(0, min(100, self.attributes[name]))
        if self.character and 'attributes' in self.character:
            if name in self.character['attributes']:
                return self.character['attributes'][name]['default']
        return 50

    def set_attribute(self, name, value):
        """设置属性值"""
        self.attributes[name] = max(0, min(100, value))

    def modify_attribute(self, name, delta):
        """修改属性值"""
        current = self.get_attribute(name)
        self.set_attribute(name, current + delta)

    def add_item(self, item_id):
        """添加物品"""
        if item_id not in self.items:
            self.items.append(item_id)
            return True
        return False

    def remove_item(self, item_id):
        """移除物品"""
        if item_id in self.items:
            self.items.remove(item_id)
            return True
        return False

    def has_item(self, item_id):
        """检查是否拥有物品"""
        return item_id in self.items

    def get_relationship(self, character_id):
        """获取关系值"""
        return self.relationships.get(character_id, 0)

    def modify_relationship(self, character_id, delta):
        """修改关系值"""
        current = self.get_relationship(character_id)
        self.relationships[character_id] = max(-100, min(100, current + delta))

    def set_flag(self, name, value=True):
        """设置标记"""
        self.flags[name] = value

    def has_flag(self, name):
        """检查标记"""
        return name in self.flags

    def add_achievement(self, achievement_id):
        """添加成就"""
        if achievement_id not in self.achievements:
            self.achievements.append(achievement_id)
            return True
        return False

    def has_achievement(self, achievement_id):
        """检查成就"""
        return achievement_id in self.achievements

    def check_death(self):
        """检查死亡"""
        qiyun = self.get_attribute('qiyun')
        daohang = self.get_attribute('daohang')
        if qiyun <= 0:
            self.is_dead = True
            self.death_reason = '气运耗尽，天命已绝'
            return True
        if daohang <= 0:
            self.is_dead = True
            self.death_reason = '道行尽毁，元神消散'
            return True
        return False

    def add_buff(self, buff_id, duration, buff_data):
        """添加 Buff"""
        existing = next((b for b in self.buffs if b['id'] == buff_id), None)
        if existing:
            existing['duration'] = max(existing['duration'], duration)
            return False
        self.buffs.append({
            'id': buff_id,
            'duration': duration,
            'name': buff_data.get('name', buff_id),
            'description': buff_data.get('description', ''),
            'attribute': buff_data.get('attribute'),
            'value': buff_data.get('value', 0),
            'is_debuff': buff_data.get('isDebuff', False)
        })
        return True

    def remove_buff(self, buff_id):
        """移除 Buff"""
        for i, buff in enumerate(self.buffs):
            if buff['id'] == buff_id:
                self.buffs.pop(i)
                return True
        return False

    def tick_buffs(self):
        """减少 Buff 持续时间"""
        expired = []
        self.buffs = [b for b in self.buffs if not (
            b['duration'] := b['duration'] - 1,
            b['duration'] <= 0 and expired.append(b)
        ) or b['duration'] > 0]
        return expired

    def get_combat_power(self):
        """计算战力"""
        daohang = self.get_attribute('daohang')
        genjiao = self.get_attribute('genjiao')
        return (daohang + genjiao) // 2

    def to_dict(self):
        """导出为字典"""
        return {
            'character_id': self.character['id'] if self.character else None,
            'current_node_id': self.current_node_id,
            'attributes': dict(self.attributes),
            'items': list(self.items),
            'relationships': dict(self.relationships),
            'flags': dict(self.flags),
            'history': list(self.history),
            'game_complete': self.game_complete,
            'is_dead': self.is_dead,
            'death_reason': self.death_reason,
            'achievements': list(self.achievements),
            'cultivation_count': self.cultivation_count,
            'cultivation_cooldown': self.cultivation_cooldown,
            'historical_interventions': list(self.historical_interventions),
            'buffs': list(self.buffs),
            'saved_at': datetime.now().isoformat()
        }

    def from_dict(self, data, game_data):
        """从字典加载"""
        if data.get('character_id'):
            self.character = next(
                (c for c in game_data['characters'] if c['id'] == data['character_id']),
                None
            )
        self.current_node_id = data.get('current_node_id')
        self.attributes = data.get('attributes', {})
        self.items = data.get('items', [])
        self.relationships = data.get('relationships', {})
        self.flags = data.get('flags', {})
        self.history = data.get('history', [])
        self.game_complete = data.get('game_complete', False)
        self.is_dead = data.get('is_dead', False)
        self.death_reason = data.get('death_reason')
        self.achievements = data.get('achievements', [])
        self.cultivation_count = data.get('cultivation_count', 0)
        self.cultivation_cooldown = data.get('cultivation_cooldown', 0)
        self.historical_interventions = data.get('historical_interventions', [])
        self.buffs = data.get('buffs', [])


# ==================== 游戏引擎 ====================
class GameEngine:
    """游戏逻辑引擎"""

    def __init__(self):
        self.game_data = None
        self.state = GameState()
        self.audio = AudioManager()

    def load_data(self, filepath):
        """加载游戏数据"""
        with open(filepath, 'r', encoding='utf-8') as f:
            self.game_data = json.load(f)
        return self.game_data

    def start_new_game(self):
        """开始新游戏"""
        # 随机选择角色
        self.state = GameState()
        self.state.character = random.choice(self.game_data['characters'])

        # 初始化属性
        for attr, config in self.state.character.get('attributes', {}).items():
            self.state.attributes[attr] = config['default']

        # 设置起始节点
        self.state.current_node_id = 'node_phase1_start'

        return self.state.character

    def get_current_node(self):
        """获取当前节点"""
        if not self.state.current_node_id:
            return None
        return next(
            (n for n in self.game_data['storyNodes'] if n['id'] == self.state.current_node_id),
            None
        )

    def get_character_by_id(self, char_id):
        """根据 ID 获取角色"""
        return next((c for c in self.game_data['characters'] if c['id'] == char_id), None)

    def get_item_by_id(self, item_id):
        """根据 ID 获取物品"""
        return next((i for i in self.game_data['items'] if i['id'] == item_id), None)

    def get_achievement_by_id(self, ach_id):
        """根据 ID 获取成就"""
        return next((a for a in self.game_data['achievements'] if a['id'] == ach_id), None)

    def check_conditions(self, conditions):
        """检查条件"""
        if not conditions:
            return True

        for cond in conditions:
            cond_type = cond.get('type')

            if cond_type == 'attribute':
                value = self.state.get_attribute(cond['target'])
                if not self._compare(value, cond['operator'], cond['value']):
                    return False

            elif cond_type == 'item':
                has_item = self.state.has_item(cond['target'])
                if cond.get('operator') == 'has' and not has_item:
                    return False

            elif cond_type == 'flag':
                if not self.state.has_flag(cond['target']):
                    return False

            elif cond_type == 'character':
                if self.state.character['id'] != cond['target']:
                    return False

        return True

    def _compare(self, a, op, b):
        """比较运算"""
        ops = {
            '>=': lambda x, y: x >= y,
            '<=': lambda x, y: x <= y,
            '==': lambda x, y: x == y,
            '!=': lambda x, y: x != y,
            '>': lambda x, y: x > y,
            '<': lambda x, y: x < y,
        }
        return ops.get(op, lambda x, y: False)(a, b)

    def apply_effects(self, effects):
        """应用效果"""
        if not effects:
            return []

        messages = []

        for effect in effects:
            effect_type = effect.get('type')

            if effect_type == 'attribute_change':
                old_value = self.state.get_attribute(effect['target'])
                self.state.modify_attribute(effect['target'], effect['value'])
                new_value = self.state.get_attribute(effect['target'])
                attr_names = {
                    'genjiao': '根脚', 'qiyun': '气运', 'daohang': '道行',
                    'shengwang': '声望', 'xinxing': '心性'
                }
                attr_name = attr_names.get(effect['target'], effect['target'])
                if effect['value'] > 0:
                    messages.append(f'[属性] {attr_name} +{effect["value"]} ({old_value} → {new_value})')
                else:
                    messages.append(f'[属性] {attr_name} {effect["value"]} ({old_value} → {new_value})')

            elif effect_type == 'add_item':
                item = self.get_item_by_id(effect['target'])
                if self.state.add_item(effect['target']):
                    messages.append(f'[物品] 获得道具: {item["name"] if item else effect["target"]}')

            elif effect_type == 'remove_item':
                if self.state.remove_item(effect['target']):
                    messages.append(f'[物品] 失去道具: {effect["target"]}')

            elif effect_type == 'set_flag':
                self.state.set_flag(effect['target'], effect.get('value', True))

            elif effect_type == 'add_buff':
                buff_info = self.game_data.get('buffTypes', {}).get(effect['target'])
                duration = effect.get('duration', buff_info.get('defaultDuration', 3) if buff_info else 3)
                self.state.add_buff(effect['target'], duration, buff_info or {})
                if buff_info:
                    buff_text = '损耗' if buff_info.get('isDebuff') else '增益'
                    messages.append(f'[{buff_text}] 获得「{buff_info["name"]}」({duration}回合)')

        return messages

    def check_achievements(self):
        """检查成就"""
        unlocked = []

        for ach in self.game_data.get('achievements', []):
            if self.state.has_achievement(ach['id']):
                continue

            cond = ach.get('condition', {})
            cond_type = cond.get('type')

            if cond_type == 'flag':
                if self.state.has_flag(cond['target']):
                    unlocked.append(ach)
                    self.state.add_achievement(ach['id'])

            elif cond_type == 'attribute':
                value = self.state.get_attribute(cond['target'])
                if self._compare(value, cond['operator'], cond['value']):
                    unlocked.append(ach)
                    self.state.add_achievement(ach['id'])

        return unlocked

    def make_choice(self, choice_index):
        """做出选择"""
        node = self.get_current_node()
        if not node or 'choices' not in node:
            return None

        available_choices = [
            c for c in node['choices']
            if self.check_conditions(c.get('conditions'))
        ]

        if choice_index < 0 or choice_index >= len(available_choices):
            return None

        choice = available_choices[choice_index]

        # 应用效果
        messages = self.apply_effects(choice.get('effects', []))

        # 记录历史
        self.state.history.append(self.state.current_node_id)

        # 跳转
        self.state.current_node_id = choice['nextNodeId']

        # 减少 Buff 持续时间
        self.state.tick_buffs()

        # 减少修炼冷却
        if self.state.cultivation_cooldown > 0:
            self.state.cultivation_cooldown -= 1

        return {'messages': messages, 'choice': choice}

    def perform_cultivation(self, cult_type):
        """执行修炼"""
        if self.state.cultivation_cooldown > 0:
            return {'success': False, 'message': f'修炼冷却中，还需等待 {self.state.cultivation_cooldown} 个回合'}

        genjiao = self.state.get_attribute('genjiao')
        messages = []

        if cult_type == 'wudao':
            success_chance = min(90, genjiao)
            roll = random.random() * 100

            if roll < success_chance:
                daohang_gain = int(5 + genjiao * 0.1)
                qiyun_gain = int(2 + genjiao * 0.05)
                self.state.modify_attribute('daohang', daohang_gain)
                self.state.modify_attribute('qiyun', qiyun_gain)
                messages.append(f'悟道成功！道行 +{daohang_gain}，气运 +{qiyun_gain}')
                success = True
            else:
                daohang_loss = int(3 + random.random() * 5)
                self.state.modify_attribute('daohang', -daohang_loss)
                messages.append(f'悟道失败！心魔侵扰，道行 -{daohang_loss}')
                success = False

        else:  # biguan
            daohang_gain = int(2 + genjiao * 0.05)
            qiyun_gain = int(1 + genjiao * 0.02)
            self.state.modify_attribute('daohang', daohang_gain)
            self.state.modify_attribute('qiyun', qiyun_gain)
            messages.append(f'闭关圆满。道行 +{daohang_gain}，气运 +{qiyun_gain}')
            success = True

        self.state.cultivation_count += 1
        self.state.cultivation_cooldown = 3

        return {'success': success, 'messages': messages}

    def save_game(self, filename=None):
        """保存游戏"""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            char_id = self.state.character['id'] if self.state.character else 'unknown'
            filename = f'save_{char_id}_{timestamp}.json'

        os.makedirs(CONFIG['save_dir'], exist_ok=True)
        filepath = os.path.join(CONFIG['save_dir'], filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.state.to_dict(), f, ensure_ascii=False, indent=2)

        return filepath

    def load_game(self, filepath):
        """加载游戏"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.state = GameState()
        self.state.from_dict(data, self.game_data)
        return self.state

    def get_save_files(self):
        """获取存档列表"""
        if not os.path.exists(CONFIG['save_dir']):
            return []

        files = []
        for f in os.listdir(CONFIG['save_dir']):
            if f.endswith('.json'):
                filepath = os.path.join(CONFIG['save_dir'], f)
                try:
                    with open(filepath, 'r', encoding='utf-8') as fp:
                        data = json.load(fp)
                    char = self.get_character_by_id(data.get('character_id'))
                    files.append({
                        'filename': f,
                        'filepath': filepath,
                        'character': char['name'] if char else '未知',
                        'saved_at': data.get('saved_at', '未知时间')
                    })
                except:
                    files.append({
                        'filename': f,
                        'filepath': filepath,
                        'character': '存档损坏',
                        'saved_at': '未知'
                    })

        return sorted(files, key=lambda x: x['saved_at'], reverse=True)


# ==================== Kivy UI 组件 ====================
Builder.load_string('''
<ScrollableLabel>:
    scroll_view: scroll_view
    content_label: content_label
    ScrollView:
        id: scroll_view
        do_scroll_x: False
        do_scroll_y: True
        Label:
            id: content_label
            size_hint_y: None
            height: self.texture_size[1]
            text_size: self.width, None
            markup: True
            halign: 'left'
            valign: 'top'
            padding: dp(10), dp(10)

<GameButton>:
    size_hint_y: None
    height: dp(50)
    font_size: dp(16)
    background_color: 0.2, 0.4, 0.6, 1
    background_normal: ''

<AttributeBar>:
    canvas:
        Color:
            rgba: 0.3, 0.3, 0.3, 1
        Rectangle:
            pos: self.pos
            size: self.size
        Color:
            rgba: self.bar_color
        Rectangle:
            pos: self.pos
            size: self.width * self.value / 100, self.height
    size_hint_y: None
    height: dp(20)
''')

class ScrollableLabel(BoxLayout):
    """可滚动的文本显示组件"""
    text = StringProperty('')

    def on_text(self, instance, value):
        if hasattr(self, 'content_label'):
            self.content_label.text = value
            Clock.schedule_once(self._scroll_to_bottom, 0.1)

    def _scroll_to_bottom(self, dt):
        if hasattr(self, 'scroll_view'):
            self.scroll_view.scroll_y = 0

    def append_text(self, text):
        """追加文本"""
        self.text += text

    def clear_text(self):
        """清空文本"""
        self.text = ''


class GameButton(Button):
    """游戏按钮组件"""
    pass


class AttributeBar(BoxLayout):
    """属性条组件"""
    value = NumericProperty(50)
    bar_color = ListProperty([0.2, 0.6, 0.8, 1])


# ==================== 主游戏界面 ====================
class GameScreen(BoxLayout):
    """主游戏界面"""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.orientation = 'vertical'
        self.padding = dp(10)
        self.spacing = dp(10)

        # 游戏引擎
        self.engine = GameEngine()

        # 打字机效果
        self.type_queue = []
        self.type_event = None

        self._build_ui()
        self._load_game_data()

    def _build_ui(self):
        """构建 UI"""
        # 顶部状态栏
        self.status_bar = BoxLayout(size_hint_y=None, height=dp(40), spacing=dp(5))
        self.status_bar.add_widget(Label(text='洪荒神话', font_size=dp(20), bold=True, size_hint_x=0.3))
        self.phase_label = Label(text='', font_size=dp(14), size_hint_x=0.4)
        self.status_bar.add_widget(self.phase_label)
        self.menu_btn = Button(text='菜单', size_hint_x=None, width=dp(60), font_size=dp(14))
        self.menu_btn.bind(on_press=self._show_menu)
        self.status_bar.add_widget(self.menu_btn)
        self.add_widget(self.status_bar)

        # 剧情显示区
        self.story_view = ScrollableLabel(size_hint_y=0.6)
        self.add_widget(self.story_view)

        # 选项按钮区
        self.choices_layout = BoxLayout(orientation='vertical', size_hint_y=0.35, spacing=dp(5))
        self.add_widget(self.choices_layout)

    def _load_game_data(self):
        """加载游戏数据"""
        try:
            self.engine.load_data(CONFIG['data_file'])
            self._show_main_menu()
        except Exception as e:
            self.story_view.text = f'[color=ff0000]加载数据失败: {str(e)}[/color]'

    def _show_main_menu(self):
        """显示主菜单"""
        self.story_view.clear_text()
        self.story_view.append_text('[size=24][b]洪荒神话[/b][/size]\n\n')
        self.story_view.append_text('从龙汉初劫到巫妖大战的史诗之旅\n\n')
        self.story_view.append_text(f'已加载 {len(self.engine.game_data["storyNodes"])} 个节点, ')
        self.story_view.append_text(f'{len(self.engine.game_data["characters"])} 个角色\n')

        self._clear_choices()
        self._add_choice('开始新游戏', self._start_new_game)
        self._add_choice('读取存档', self._show_save_list)
        self._add_choice('退出', lambda: App.get_running_app().stop())

    def _start_new_game(self):
        """开始新游戏"""
        char = self.engine.start_new_game()
        self.engine.audio.play_sfx('click')

        # 显示角色卡
        self.story_view.clear_text()
        self.story_view.append_text('[b][size=20]【角色卡】[/size][/b]\n\n')
        self.story_view.append_text(f'[b]姓名:[/b] {char["name"]}\n')
        self.story_view.append_text(f'[b]称号:[/b] {char["title"]}\n')
        self.story_view.append_text(f'[b]阵营:[/b] {char["faction"]}\n\n')
        self.story_view.append_text(f'[b]背景:[/b] {char["background"]}\n')

        self._clear_choices()
        self._add_choice('开始旅程', self._continue_game)

    def _continue_game(self):
        """继续游戏"""
        self.engine.audio.play_bgm('main')
        self._show_current_node()

    def _show_current_node(self):
        """显示当前节点"""
        node = self.engine.get_current_node()
        if not node:
            self.story_view.text = '[color=ff0000]错误: 找不到当前节点[/color]'
            return

        # 更新阶段显示
        phase_names = {
            'dragon_phoenix_war': '龙汉初劫',
            'dao_demon_war': '道魔之战',
            'hongjun_lecture': '紫霄宫讲道',
            'wu_yao_rise': '巫妖崛起',
            'wu_yao_final': '巫妖决战'
        }
        self.phase_label.text = phase_names.get(node.get('phase'), '')

        # 显示剧情
        self.story_view.clear_text()

        # 标题
        title = node.get('title', '')
        node_type = node.get('type', 'story')

        if node_type == 'milestone':
            self.story_view.append_text(f'[color=ff00ff][b]⭐ {title}[/b][/color]\n\n')
        elif node_type == 'battle':
            self.story_view.append_text(f'[color=ff0000][b]⚔️ {title}[/b][/color]\n\n')
        elif node_type == 'ending':
            self.story_view.append_text(f'[color=ffd700][b]🏁 {title}[/b][/color]\n\n')
        else:
            self.story_view.append_text(f'[b]{title}[/b]\n\n')

        # 内容
        content = node.get('content', '')
        content = content.replace('\\n', '\n').replace('{player_name}', self.engine.state.character['name'])
        self.story_view.append_text(content + '\n')

        # 处理效果
        if 'effects' in node:
            messages = self.engine.apply_effects(node['effects'])
            for msg in messages:
                self.story_view.append_text(f'\n[color=00ff00]{msg}[/color]')

        # 检查战斗阈值
        if 'combatThreshold' in node:
            combat_power = self.engine.state.get_combat_power()
            threshold = node['combatThreshold']
            self.story_view.append_text(f'\n\n[b]战力评估:[/b] {combat_power}/{threshold}')
            if combat_power < threshold:
                self.story_view.append_text(' [color=ff0000]不足![/color]')

        # 检查死亡
        if self.engine.state.check_death():
            self._show_death_screen()
            return

        # 检查结局
        if node_type == 'ending':
            self._show_ending(node)
            return

        # 显示选项
        self._show_choices(node)

    def _show_choices(self, node):
        """显示选项"""
        self._clear_choices()

        if 'choices' not in node:
            self._add_choice('继续', self._auto_continue)
            return

        available_choices = [
            c for c in node['choices']
            if self.engine.check_conditions(c.get('conditions'))
        ]

        for i, choice in enumerate(available_choices):
            text = choice.get('text', '')
            desc = choice.get('description', '')
            if desc:
                text += f' ({desc})'
            self._add_choice(text, lambda idx=i: self._make_choice(idx))

        # 功能按钮
        self._add_choice('[修炼]', self._show_cultivation_menu)
        self._add_choice('[属性]', self._show_attributes)
        self._add_choice('[存档]', self._save_game)

    def _make_choice(self, index):
        """做出选择"""
        self.engine.audio.play_sfx('click')
        result = self.engine.make_choice(index)

        if result:
            for msg in result.get('messages', []):
                self.story_view.append_text(f'\n{msg}')

        # 检查成就
        unlocked = self.engine.check_achievements()
        for ach in unlocked:
            self.engine.audio.play_sfx('achievement')
            self.story_view.append_text(f'\n\n[color=ffd700]🏆 成就解锁: {ach["name"]}[/color]')

        Clock.schedule_once(lambda dt: self._show_current_node(), 0.5)

    def _auto_continue(self):
        """自动继续"""
        node = self.engine.get_current_node()
        if node and 'autoNextId' in node:
            self.engine.state.history.append(self.engine.state.current_node_id)
            self.engine.state.current_node_id = node['autoNextId']
        self._show_current_node()

    def _show_cultivation_menu(self):
        """显示修炼菜单"""
        self.story_view.clear_text()
        self.story_view.append_text('[b][size=18]【修炼系统】[/size][/b]\n\n')
        self.story_view.append_text(f'根脚: {self.engine.state.get_attribute("genjiao")}\n')
        self.story_view.append_text(f'道行: {self.engine.state.get_attribute("daohang")}\n')
        self.story_view.append_text(f'气运: {self.engine.state.get_attribute("qiyun")}\n')
        self.story_view.append_text(f'修炼次数: {self.engine.state.cultivation_count}\n')

        if self.engine.state.cultivation_cooldown > 0:
            self.story_view.append_text(f'\n[color=ff0000]冷却中: 还需 {self.engine.state.cultivation_cooldown} 回合[/color]\n')

        self._clear_choices()
        if self.engine.state.cultivation_cooldown == 0:
            self._add_choice('主动悟道 (高风险)', lambda: self._cultivate('wudao'))
            self._add_choice('闭关修炼 (稳定)', lambda: self._cultivate('biguan'))
        self._add_choice('返回', self._show_current_node)

    def _cultivate(self, cult_type):
        """执行修炼"""
        result = self.engine.perform_cultivation(cult_type)

        if result['success']:
            self.engine.audio.play_sfx('level_up')
        else:
            self.engine.audio.play_sfx('fail')

        self.story_view.append_text('\n\n[b]修炼结果:[/b]\n')
        for msg in result['messages']:
            self.story_view.append_text(f'{msg}\n')

        if self.engine.state.check_death():
            self._show_death_screen()
            return

        Clock.schedule_once(lambda dt: self._show_current_node(), 1)

    def _show_attributes(self):
        """显示属性"""
        self.story_view.clear_text()
        self.story_view.append_text('[b][size=18]【当前属性】[/size][/b]\n\n')

        attr_names = {
            'genjiao': '根脚', 'qiyun': '气运', 'daohang': '道行',
            'shengwang': '声望', 'xinxing': '心性'
        }

        for attr_id, attr_name in attr_names.items():
            value = self.engine.state.get_attribute(attr_id)
            bar = '█' * (value // 10) + '░' * (10 - value // 10)
            self.story_view.append_text(f'{attr_name}: {bar} {value}\n')

        self.story_view.append_text(f'\n[b]战力:[/b] {self.engine.state.get_combat_power()}\n')

        if self.engine.state.buffs:
            self.story_view.append_text('\n[b]增益/损耗:[/b]\n')
            for buff in self.engine.state.buffs:
                icon = '🔻' if buff['is_debuff'] else '🔺'
                self.story_view.append_text(f'  {icon} {buff["name"]} ({buff["duration"]}回合)\n')

        self._clear_choices()
        self._add_choice('返回', self._show_current_node)

    def _save_game(self):
        """保存游戏"""
        filepath = self.engine.save_game()
        self.story_view.append_text(f'\n\n[color=00ff00]游戏已存档: {os.path.basename(filepath)}[/color]')
        self.engine.audio.play_sfx('success')

    def _show_save_list(self):
        """显示存档列表"""
        saves = self.engine.get_save_files()

        self.story_view.clear_text()
        self.story_view.append_text('[b][size=18]【存档列表】[/size][/b]\n\n')

        if not saves:
            self.story_view.append_text('没有找到存档\n')

        self._clear_choices()

        for i, save in enumerate(saves):
            text = f'{save["character"]} - {save["saved_at"]}'
            self._add_choice(text, lambda fp=save['filepath']: self._load_save(fp))

        self._add_choice('返回', self._show_main_menu)

    def _load_save(self, filepath):
        """加载存档"""
        try:
            self.engine.load_game(filepath)
            self.engine.audio.play_sfx('success')
            self._show_current_node()
        except Exception as e:
            self.story_view.append_text(f'\n[color=ff0000]加载失败: {str(e)}[/color]')

    def _show_death_screen(self):
        """显示死亡画面"""
        self.engine.audio.stop_bgm()
        self.engine.audio.play_sfx('death')

        self.story_view.clear_text()
        self.story_view.append_text('[color=ff0000][b][size=24]💀 陨落 💀[/size][/b][/color]\n\n')
        self.story_view.append_text(f'{self.engine.state.death_reason}\n\n')
        self.story_view.append_text(f'{self.engine.state.character["name"]} 的旅程到此结束。\n')
        self.story_view.append_text(f'存活时长: {len(self.engine.state.history)} 个节点\n')
        self.story_view.append_text(f'解锁成就: {len(self.engine.state.achievements)} 个\n')

        self._clear_choices()
        self._add_choice('重新开始', self._start_new_game)
        self._add_choice('返回主菜单', self._show_main_menu)

    def _show_ending(self, node):
        """显示结局"""
        self.engine.audio.stop_bgm()
        self.engine.audio.play_bgm('ending')

        self.story_view.append_text('\n\n[color=ffd700][b]【结局】[/b][/color]\n')
        self.story_view.append_text(f'{node.get("title", "")}\n')

        self._clear_choices()
        self._add_choice('重新开始', self._start_new_game)
        self._add_choice('返回主菜单', self._show_main_menu)

    def _show_menu(self, instance):
        """显示菜单"""
        content = BoxLayout(orientation='vertical', padding=dp(20), spacing=dp(10))

        content.add_widget(Label(text='游戏菜单', font_size=dp(20), size_hint_y=None, height=dp(50)))

        btn_attrs = Button(text='查看属性', size_hint_y=None, height=dp(50))
        btn_attrs.bind(on_press=lambda x: (self._popup.dismiss(), self._show_attributes()))
        content.add_widget(btn_attrs)

        btn_save = Button(text='保存游戏', size_hint_y=None, height=dp(50))
        btn_save.bind(on_press=lambda x: (self._popup.dismiss(), self._save_game()))
        content.add_widget(btn_save)

        btn_bgm = Button(text='背景音乐: 开', size_hint_y=None, height=dp(50))
        btn_bgm.bind(on_press=lambda x: (
            self.engine.audio.toggle_bgm(),
            setattr(btn_bgm, 'text', f'背景音乐: {"开" if self.engine.audio.bgm_enabled else "关"}')
        ))
        content.add_widget(btn_bgm)

        btn_sfx = Button(text='音效: 开', size_hint_y=None, height=dp(50))
        btn_sfx.bind(on_press=lambda x: (
            self.engine.audio.toggle_sfx(),
            setattr(btn_sfx, 'text', f'音效: {"开" if self.engine.audio.sfx_enabled else "关"}')
        ))
        content.add_widget(btn_sfx)

        btn_close = Button(text='关闭', size_hint_y=None, height=dp(50))
        btn_close.bind(on_press=lambda x: self._popup.dismiss())
        content.add_widget(btn_close)

        self._popup = Popup(title='', content=content, size_hint=(0.8, 0.7))
        self._popup.open()

    def _clear_choices(self):
        """清空选项"""
        self.choices_layout.clear_widgets()

    def _add_choice(self, text, callback):
        """添加选项"""
        btn = GameButton(text=text)
        btn.bind(on_press=lambda x: callback())
        self.choices_layout.add_widget(btn)


# ==================== 应用入口 ====================
class HonghuangApp(App):
    """洪荒神话应用"""

    def build(self):
        self.title = '洪荒神话'
        return GameScreen()

    def on_pause(self):
        """暂停时保存"""
        return True

    def on_resume(self):
        """恢复时继续"""
        pass


if __name__ == '__main__':
    HonghuangApp().run()
