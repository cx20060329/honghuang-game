#!/usr/bin/env node
/**
 * 洪荒神话 - 命令行文字游戏引擎
 *
 * 功能：
 * - 开局随机选择人物，打印人物卡
 * - 循环剧情推进、选项选择、属性变化
 * - 支持存档/读档
 * - 支持查看属性和物品
 * - 结局处理与重新开始
 *
 * 使用方法：node game_engine.js [存档文件]
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ==================== 配置 ====================
const CONFIG = {
  dataFile: 'game_data_full.json',
  saveDir: './saves',
  autoSave: true,
  typeSpeed: 25,  // 打字机速度（毫秒/字符）
  skipTypewriter: false  // 是否跳过打字机效果
};

// ==================== 颜色工具 ====================
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gold: '\x1b[38;5;220m',
  bright: '\x1b[1m'
};

// 颜色化文本
function colorText(text, color) {
  return `${COLORS[color] || ''}${text}${COLORS.reset}`;
}

// 打字机效果输出
async function typeWrite(text, speed = CONFIG.typeSpeed) {
  if (CONFIG.skipTypewriter) {
    process.stdout.write(text);
    return;
  }
  for (const char of text) {
    process.stdout.write(char);
    await new Promise(r => setTimeout(r, speed));
  }
}

// 打字机效果输出整行
async function typeWriteLine(text, speed = CONFIG.typeSpeed) {
  if (CONFIG.skipTypewriter) {
    console.log(text);
    return;
  }
  await typeWrite(text, speed);
  process.stdout.write('\n');
}

// ==================== ASCII 艺术模板 ====================
const ASCII_ART = {
  // 结局艺术图（8行内）
  endings: {
    default: [
      '╔══════════════════════════════════════╗',
      '║                                      ║',
      '║     🌟 洪荒传说 · 终章 🌟           ║',
      '║                                      ║',
      '║        你的故事将被铭记              ║',
      '║        在这片混沌天地间              ║',
      '║                                      ║',
      '╚══════════════════════════════════════╝'
    ],
    transcend: [
      '╔══════════════════════════════════════╗',
      '║                                      ║',
      '║    ☀️  大道已成 · 超脱洪荒  ☀️       ║',
      '║                                      ║',
      '║      混沌初开，道法自然              ║',
      '║      超脱轮回，永恒不灭              ║',
      '║                                      ║',
      '╚══════════════════════════════════════╝'
    ],
    saint: [
      '╔══════════════════════════════════════╗',
      '║                                      ║',
      '║    ⭐  圣人之位 · 万劫不灭  ⭐       ║',
      '║                                      ║',
      '║      天道之下，圣人为尊              ║',
      '║      因果不沾，逍遥自在              ║',
      '║                                      ║',
      '╚══════════════════════════════════════╝'
    ],
    ruler: [
      '╔══════════════════════════════════════╗',
      '║                                      ║',
      '║    👑  妖皇霸业 · 统御洪荒  👑       ║',
      '║                                      ║',
      '║      万妖朝拜，号令天下              ║',
      '║      日月星辰，皆为臣属              ║',
      '║                                      ║',
      '╚══════════════════════════════════════╝'
    ],
    retire: [
      '╔══════════════════════════════════════╗',
      '║                                      ║',
      '║    🌿  隐世逍遥 · 云游四海  🌿       ║',
      '║                                      ║',
      '║      功成身退，不问世事              ║',
      '║      青山绿水，自在逍遥              ║',
      '║                                      ║',
      '╚══════════════════════════════════════╝'
    ],
    fallen: [
      '╔══════════════════════════════════════╗',
      '║                                      ║',
      '║    💀  陨落轮回 · 魂归天地  💀       ║',
      '║                                      ║',
      '║      大道无情，因果循环              ║',
      '║      来世再续，未了之缘              ║',
      '║                                      ║',
      '╚══════════════════════════════════════╝'
    ],
    sacrifice: [
      '╔══════════════════════════════════════╗',
      '║                                      ║',
      '║    🔥  舍身取义 · 浩气长存  🔥       ║',
      '║                                      ║',
      '║      身虽陨灭，精神永存              ║',
      '║      天地铭记，万古流芳              ║',
      '║                                      ║',
      '╚══════════════════════════════════════╝'
    ]
  }
};

// ==================== 游戏状态 ====================
class GameState {
  constructor() {
    this.character = null;      // 当前角色
    this.currentNodeId = null;  // 当前节点ID
    this.attributes = {};       // 当前属性值
    this.items = [];            // 已获得物品
    this.relationships = {};    // 人物关系
    this.flags = {};            // 全局标记
    this.history = [];          // 历史节点（用于回溯）
    this.gameComplete = false;  // 游戏是否完成
    this.isDead = false;        // 是否死亡
    this.deathReason = null;    // 死亡原因
    this.achievements = [];     // 已解锁成就
    this.cultivationCount = 0;  // 修炼次数
    this.cultivationCooldown = 0; // 修炼冷却（回合数）
    this.historicalInterventions = []; // 历史干预记录
    this.buffs = [];            // 当前Buff/Debuff列表 [{id, duration, ...}]
  }

  // ========== Buff系统 ==========

  // 添加Buff
  addBuff(buffId, duration, buffData) {
    // 检查是否已存在相同buff，刷新持续时间
    const existing = this.buffs.find(b => b.id === buffId);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
      return false;
    }
    this.buffs.push({
      id: buffId,
      duration: duration,
      name: buffData.name,
      description: buffData.description,
      attribute: buffData.attribute,
      value: buffData.value,
      isDebuff: buffData.isDebuff
    });
    return true;
  }

  // 移除Buff
  removeBuff(buffId) {
    const index = this.buffs.findIndex(b => b.id === buffId);
    if (index > -1) {
      this.buffs.splice(index, 1);
      return true;
    }
    return false;
  }

  // 减少所有Buff持续时间（每次选择后调用）
  tickBuffs() {
    const expired = [];
    this.buffs = this.buffs.filter(buff => {
      buff.duration--;
      if (buff.duration <= 0) {
        expired.push(buff);
        return false;
      }
      return true;
    });
    return expired;
  }

  // 获取属性值（包含Buff修正）
  getAttributeWithBuffs(name) {
    let value = this.getAttribute(name);
    // 应用所有相关buff
    for (const buff of this.buffs) {
      if (buff.attribute === name) {
        value += buff.value;
      }
    }
    return Math.max(0, Math.min(100, value));
  }

  // 计算战力值
  getCombatPower() {
    const daohang = this.getAttributeWithBuffs('daohang');
    const genjiao = this.getAttributeWithBuffs('genjiao');
    return Math.floor((daohang + genjiao) / 2);
  }

  // 获取属性值（确保在0-100范围内）
  // 如果属性未初始化，返回角色默认值（如果有的话），否则返回50
  getAttribute(name) {
    if (this.attributes.hasOwnProperty(name)) {
      return Math.max(0, Math.min(100, this.attributes[name]));
    }
    // 尝试从角色配置获取默认值
    if (this.character && this.character.attributes && this.character.attributes[name]) {
      return this.character.attributes[name].default;
    }
    return 50;
  }

  // 设置属性值（自动约束范围）
  setAttribute(name, value) {
    this.attributes[name] = Math.max(0, Math.min(100, value));
  }

  // 修改属性值
  modifyAttribute(name, delta) {
    const current = this.getAttribute(name);
    this.setAttribute(name, current + delta);
  }

  // 添加物品
  addItem(itemId) {
    if (!this.items.includes(itemId)) {
      this.items.push(itemId);
      return true;
    }
    return false;
  }

  // 移除物品
  removeItem(itemId) {
    const index = this.items.indexOf(itemId);
    if (index > -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }

  // 检查是否有物品
  hasItem(itemId) {
    return this.items.includes(itemId);
  }

  // 获取关系值
  getRelationship(characterId) {
    return this.relationships[characterId] || 0;
  }

  // 修改关系值
  modifyRelationship(characterId, delta) {
    const current = this.getRelationship(characterId);
    this.relationships[characterId] = Math.max(-100, Math.min(100, current + delta));
  }

  // 设置标记
  setFlag(name, value) {
    this.flags[name] = value;
  }

  // 获取标记
  getFlag(name) {
    return this.flags[name];
  }

  // 检查标记
  hasFlag(name) {
    return this.flags.hasOwnProperty(name);
  }

  // 导出存档数据
  toJSON() {
    return {
      characterId: this.character ? this.character.id : null,
      currentNodeId: this.currentNodeId,
      attributes: { ...this.attributes },
      items: [...this.items],
      relationships: { ...this.relationships },
      flags: { ...this.flags },
      history: [...this.history],
      gameComplete: this.gameComplete,
      isDead: this.isDead,
      deathReason: this.deathReason,
      achievements: [...this.achievements],
      cultivationCount: this.cultivationCount,
      cultivationCooldown: this.cultivationCooldown,
      historicalInterventions: [...this.historicalInterventions],
      buffs: [...this.buffs],
      savedAt: new Date().toISOString()
    };
  }

  // 从存档数据加载
  static fromJSON(data, gameData) {
    const state = new GameState();
    state.character = gameData.characters.find(c => c.id === data.characterId);
    state.currentNodeId = data.currentNodeId;
    state.attributes = { ...data.attributes };
    state.items = [...data.items];
    state.relationships = { ...data.relationships };
    state.flags = { ...data.flags };
    state.history = [...data.history];
    state.gameComplete = data.gameComplete || false;
    state.isDead = data.isDead || false;
    state.deathReason = data.deathReason || null;
    state.achievements = [...(data.achievements || [])];
    state.cultivationCount = data.cultivationCount || 0;
    state.cultivationCooldown = data.cultivationCooldown || 0;
    state.historicalInterventions = [...(data.historicalInterventions || [])];
    state.buffs = [...(data.buffs || [])];
    return state;
  }

  // 检查是否死亡（气运或道行为0）
  checkDeath() {
    const qiyun = this.getAttribute('qiyun');
    const daohang = this.getAttribute('daohang');

    if (qiyun <= 0) {
      this.isDead = true;
      this.deathReason = '气运耗尽，天命已绝。你的存在被洪荒遗忘...';
      return true;
    }
    if (daohang <= 0) {
      this.isDead = true;
      this.deathReason = '道行尽毁，元神消散。你已堕入轮回...';
      return true;
    }
    return false;
  }

  // 添加成就
  addAchievement(achievementId) {
    if (!this.achievements.includes(achievementId)) {
      this.achievements.push(achievementId);
      return true;
    }
    return false;
  }

  // 检查是否有成就
  hasAchievement(achievementId) {
    return this.achievements.includes(achievementId);
  }
}

// ==================== 游戏引擎 ====================
class GameEngine {
  constructor() {
    this.gameData = null;    // 游戏数据
    this.state = null;       // 游戏状态
    this.rl = null;          // readline 接口
    this.running = false;    // 是否运行中
  }

  // 初始化引擎
  async init() {
    // 加载游戏数据
    await this.loadGameData();

    // 创建 readline 接口
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // 确保存档目录存在
    if (!fs.existsSync(CONFIG.saveDir)) {
      fs.mkdirSync(CONFIG.saveDir, { recursive: true });
    }
  }

  // 加载游戏数据
  async loadGameData() {
    const dataPath = path.join(__dirname, CONFIG.dataFile);
    const rawData = fs.readFileSync(dataPath, 'utf8');
    this.gameData = JSON.parse(rawData);
    console.log(`[系统] 已加载游戏数据: ${this.gameData.storyNodes.length} 个节点, ${this.gameData.characters.length} 个角色`);
  }

  // 开始新游戏
  async startNewGame() {
    this.state = new GameState();

    // 随机选择角色
    const characters = this.gameData.characters;
    const randomIndex = Math.floor(Math.random() * characters.length);
    this.state.character = characters[randomIndex];

    // 初始化属性
    const attrs = this.state.character.attributes;
    for (const [name, config] of Object.entries(attrs)) {
      this.state.setAttribute(name, config.default);
    }

    // 初始化关系
    if (this.state.character.startingRelationships) {
      for (const rel of this.state.character.startingRelationships) {
        this.state.relationships[rel.characterId] = rel.value;
      }
    }

    // 初始化物品
    if (this.state.character.startingItems) {
      for (const itemId of this.state.character.startingItems) {
        this.state.addItem(itemId);
      }
    }

    // 设置起始节点
    this.state.currentNodeId = 'node_phase1_start';

    // 显示角色卡
    this.printCharacterCard();

    // 开始游戏循环
    await this.gameLoop();
  }

  // 显示进度条
  printProgressBar(node) {
    const phases = [
      { id: 'dragon_phoenix_war', name: '龙汉初劫', color: 'cyan' },
      { id: 'dao_demon_war', name: '道魔之战', color: 'magenta' },
      { id: 'hongjun_lecture', name: '紫霄宫讲道', color: 'yellow' },
      { id: 'wu_yao_rise', name: '巫妖崛起', color: 'red' },
      { id: 'wu_yao_final', name: '巫妖决战', color: 'red' }
    ];

    const currentPhase = node.phase || 'dragon_phoenix_war';
    const phaseIndex = phases.findIndex(p => p.id === currentPhase);

    if (phaseIndex === -1) return;

    console.log('');
    let progressBar = '  ';
    for (let i = 0; i < phases.length; i++) {
      if (i < phaseIndex) {
        progressBar += colorText('●', 'green') + ' ';
      } else if (i === phaseIndex) {
        progressBar += colorText('●', phases[i].color) + ' ';
      } else {
        progressBar += colorText('○', 'white') + ' ';
      }
    }
    progressBar += ` ${colorText(phases[phaseIndex].name, phases[phaseIndex].color)}`;
    console.log(progressBar);
  }

  // 显示角色卡
  printCharacterCard() {
    const char = this.state.character;
    console.log('');
    console.log(colorText('╔' + '═'.repeat(58) + '╗', 'cyan'));
    console.log(colorText('║', 'cyan') + ' '.repeat(18) + colorText('【 角 色 卡 】', 'bright') + ' '.repeat(24) + colorText('║', 'cyan'));
    console.log(colorText('╠' + '═'.repeat(58) + '╣', 'cyan'));
    console.log(colorText('║', 'cyan') + `  姓名: ${colorText(char.name, 'yellow')}`.padEnd(58) + colorText('║', 'cyan'));
    console.log(colorText('║', 'cyan') + `  称号: ${char.title}`.padEnd(58) + colorText('║', 'cyan'));
    console.log(colorText('║', 'cyan') + `  阵营: ${char.faction}`.padEnd(58) + colorText('║', 'cyan'));
    console.log(colorText('╠' + '═'.repeat(58) + '╣', 'cyan'));
    console.log(colorText('║', 'cyan') + '  属性:'.padEnd(58) + colorText('║', 'cyan'));
    console.log(colorText('║', 'cyan') + `    根脚: ${this.printBar(this.state.getAttribute('genjiao'))} ${this.state.getAttribute('genjiao')}`.padEnd(58) + colorText('║', 'cyan'));
    console.log(colorText('║', 'cyan') + `    气运: ${this.printBar(this.state.getAttribute('qiyun'))} ${this.state.getAttribute('qiyun')}`.padEnd(58) + colorText('║', 'cyan'));
    console.log(colorText('║', 'cyan') + `    道行: ${this.printBar(this.state.getAttribute('daohang'))} ${this.state.getAttribute('daohang')}`.padEnd(58) + colorText('║', 'cyan'));
    console.log(colorText('║', 'cyan') + `    声望: ${this.printBar(this.state.getAttribute('shengwang'))} ${this.state.getAttribute('shengwang')}`.padEnd(58) + colorText('║', 'cyan'));
    console.log(colorText('║', 'cyan') + `    心性: ${this.printBar(this.state.getAttribute('xinxing'))} ${this.state.getAttribute('xinxing')}`.padEnd(58) + colorText('║', 'cyan'));
    console.log(colorText('╠' + '═'.repeat(58) + '╣', 'cyan'));
    console.log(colorText('║', 'cyan') + `  背景: ${char.background}`.substring(0, 57).padEnd(58) + colorText('║', 'cyan'));
    if (char.specialAbility) {
      console.log(colorText('║', 'cyan') + `  特殊能力: ${char.specialAbility.name}`.padEnd(58) + colorText('║', 'cyan'));
      console.log(colorText('║', 'cyan') + `    ${char.specialAbility.description}`.substring(0, 56).padEnd(58) + colorText('║', 'cyan'));
    }
    console.log(colorText('╚' + '═'.repeat(58) + '╝', 'cyan'));
    console.log('');
  }

  // 打印属性条
  printBar(value) {
    const filled = Math.floor(value / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  // 游戏主循环
  async gameLoop() {
    this.running = true;

    while (this.running && !this.state.gameComplete) {
      // 减少修炼冷却
      if (this.state.cultivationCooldown > 0) {
        this.state.cultivationCooldown--;
      }

      // 获取当前节点
      const node = this.getCurrentNode();
      if (!node) {
        console.log('[错误] 找不到当前节点:', this.state.currentNodeId);
        break;
      }

      // 显示剧情
      await this.printNode(node);

      // 处理节点效果
      if (node.effects) {
        this.applyEffects(node.effects);
      }

      // 战斗节点阈值检查
      if (node.combatThreshold && node.combatThreshold > 0) {
        const combatPower = this.state.getCombatPower();
        console.log('');
        console.log(colorText('┌' + '─'.repeat(40) + '┐', 'red'));
        console.log(colorText('│', 'red') + ' '.repeat(10) + colorText('⚔️ 战力评估 ⚔️', 'yellow').padEnd(30) + colorText('│', 'red'));
        console.log(colorText('├' + '─'.repeat(40) + '┤', 'red'));

        if (combatPower < node.combatThreshold) {
          console.log(colorText('│', 'red') + `  当前战力: ${colorText(combatPower.toString(), 'red')}`.padEnd(40) + colorText('│', 'red'));
          console.log(colorText('│', 'red') + `  需要战力: ${colorText(node.combatThreshold.toString(), 'yellow')}`.padEnd(40) + colorText('│', 'red'));
          console.log(colorText('│', 'red') + ' '.repeat(40) + colorText('│', 'red'));
          console.log(colorText('│', 'red') + colorText('  ⚠️ 战力不足！命悬一线...', 'red').padEnd(40) + colorText('│', 'red'));
          console.log(colorText('└' + '─'.repeat(40) + '┘', 'red'));
          console.log('');
          // 跳转到命悬一线节点
          const dangerNode = this.gameData.nodes.find(n => n.id === 'node_danger_close_call');
          if (dangerNode) {
            this.state.history.push(this.state.currentNodeId);
            this.state.currentNodeId = 'node_danger_close_call';
            await this.wait(1500);
            continue;
          }
        } else {
          console.log(colorText('│', 'red') + `  当前战力: ${colorText(combatPower.toString(), 'green')}`.padEnd(40) + colorText('│', 'red'));
          console.log(colorText('│', 'red') + `  需要战力: ${colorText(node.combatThreshold.toString(), 'yellow')}`.padEnd(40) + colorText('│', 'red'));
          console.log(colorText('│', 'red') + ' '.repeat(40) + colorText('│', 'red'));
          console.log(colorText('│', 'red') + colorText('  ✅ 战力充足，可以一战！', 'green').padEnd(40) + colorText('│', 'red'));
          console.log(colorText('└' + '─'.repeat(40) + '┘', 'red'));
          console.log('');
        }
      }

      // 处理buff回合递减
      const expiredBuffs = this.state.tickBuffs();
      for (const buff of expiredBuffs) {
        const buffInfo = this.gameData.buffTypes ? this.gameData.buffTypes[buff.id] : null;
        if (buffInfo) {
          const buffText = buffInfo.isDebuff ? '损耗' : '增益';
          console.log(`  [${buffText}] 「${buffInfo.name}」效果结束`);
        }
      }

      // 检查死亡
      if (this.state.checkDeath()) {
        await this.handleDeath();
        break;
      }

      // 检查成就
      this.checkAchievements();

      // 检查是否为结局节点
      if (node.type === 'ending') {
        // 设置完成标记
        this.state.setFlag('flag_game_complete', true);
        this.checkAchievements();
        await this.handleEnding(node);
        continue;
      }

      // 处理自动跳转
      if (node.autoNextId) {
        this.state.history.push(this.state.currentNodeId);
        this.state.currentNodeId = node.autoNextId;
        await this.wait(1000);
        continue;
      }

      // 显示选项并等待输入
      if (node.choices && node.choices.length > 0) {
        const choice = await this.promptChoice(node);
        if (choice) {
          // 应用选项效果
          if (choice.effects) {
            this.applyEffects(choice.effects);
          }

          // 检查死亡
          if (this.state.checkDeath()) {
            await this.handleDeath();
            break;
          }

          // 检查成就
          this.checkAchievements();

          // 记录历史
          this.state.history.push(this.state.currentNodeId);

          // 跳转到下一节点
          this.state.currentNodeId = choice.nextNodeId;

          // 自动存档
          if (CONFIG.autoSave) {
            this.autoSave();
          }
        }
      } else {
        // 无选项的节点，等待用户确认
        this.state.history.push(this.state.currentNodeId);
        await this.promptContinue();
      }
    }
  }

  // 获取当前节点
  getCurrentNode() {
    return this.gameData.storyNodes.find(n => n.id === this.state.currentNodeId);
  }

  // 打印节点内容
  async printNode(node) {
    // 根据节点类型选择颜色和图标
    let titleColor = 'white';
    let icon = '';
    let borderColor = 'cyan';

    if (node.type === 'milestone') {
      titleColor = 'magenta';
      icon = '⭐ ';
      borderColor = 'magenta';
    } else if (node.type === 'battle') {
      titleColor = 'red';
      icon = '⚔️ ';
      borderColor = 'red';
    } else if (node.type === 'ending') {
      titleColor = 'gold';
      icon = '🏁 ';
      borderColor = 'yellow';
    }

    // 显示进度条
    this.printProgressBar(node);

    // ASCII 边框标题
    console.log('');
    console.log(colorText('┌' + '─'.repeat(58) + '┐', borderColor));
    console.log(colorText('│', borderColor) + ' '.repeat(2) + colorText(icon + node.title, titleColor).padEnd(56) + colorText('│', borderColor));
    if (node.chapter) {
      console.log(colorText('│', borderColor) + ' '.repeat(2) + colorText(`[${node.chapter}]`, 'cyan').padEnd(56) + colorText('│', borderColor));
    }
    console.log(colorText('└' + '─'.repeat(58) + '┘', borderColor));

    // 替换变量
    let content = node.content;
    content = content.replace(/{player_name}/g, this.state.character.name);

    // 处理换行符（支持 \n 和 \\n 两种格式）
    content = content.replace(/\\n/g, '\n');
    const paragraphs = content.split('\n');

    // 打字机效果输出内容
    console.log('');
    for (const p of paragraphs) {
      if (p.trim()) {
        await typeWriteLine('  ' + p.trim(), CONFIG.typeSpeed);
      } else {
        console.log('');
      }
    }
    console.log('');
  }

  // 显示选项并获取用户选择
  async promptChoice(node) {
    // 过滤可用选项
    const availableChoices = node.choices.filter(choice => {
      return this.checkConditions(choice.conditions);
    });

    if (availableChoices.length === 0) {
      console.log('[警告] 没有可用选项');
      return null;
    }

    // 显示选项
    console.log('【选项】');
    availableChoices.forEach((choice, index) => {
      let text = `  [${index + 1}] ${choice.text}`;
      if (choice.description) {
        text += ` (${choice.description})`;
      }
      console.log(text);
    });
    console.log('  ────────────────────');
    console.log('  [W] 修炼 (悟道/闭关)');
    console.log('  [C] 查看成就');
    console.log('  [A] 查看属性');
    console.log('  [I] 查看物品');
    console.log('  [S] 存档');
    console.log('  [L] 读档');
    console.log('  [Q] 退出游戏');

    // 显示快捷键提示
    console.log('');
    console.log(colorText('  ┌────────── 快捷键 ──────────┐', 'cyan'));
    console.log(colorText('  │ ', 'cyan') + 'W-修炼 C-成就 A-属性' + colorText(' │', 'cyan'));
    console.log(colorText('  │ ', 'cyan') + 'I-物品 S-存档 L-读档' + colorText(' │', 'cyan'));
    console.log(colorText('  └────────────────────────────┘', 'cyan'));

    // 获取输入
    while (true) {
      const input = await this.prompt('请选择: ');
      const trimmed = input.trim().toUpperCase();

      // 处理特殊命令
      if (trimmed === 'W') {
        await this.showCultivationMenu();
        continue;
      }
      if (trimmed === 'C') {
        this.showAchievements();
        continue;
      }
      if (trimmed === 'A') {
        this.showAttributes();
        continue;
      }
      if (trimmed === 'I') {
        this.showItems();
        continue;
      }
      if (trimmed === 'S') {
        await this.saveGame();
        continue;
      }
      if (trimmed === 'L') {
        const loaded = await this.loadGame();
        if (loaded) {
          return null;
        }
        continue;
      }
      if (trimmed === 'Q') {
        const confirm = await this.prompt('确定退出吗？(Y/N): ');
        if (confirm.toUpperCase() === 'Y') {
          this.running = false;
          return null;
        }
        continue;
      }

      // 处理数字选择
      const num = parseInt(trimmed);
      if (num >= 1 && num <= availableChoices.length) {
        return availableChoices[num - 1];
      }

      console.log('[提示] 请输入有效选项');
    }
  }

  // 检查条件
  checkConditions(conditions) {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    for (const cond of conditions) {
      switch (cond.type) {
        case 'attribute':
          const attrValue = this.state.getAttribute(cond.target);
          if (!this.compare(attrValue, cond.operator, cond.value)) {
            return false;
          }
          break;

        case 'item':
          const hasItem = this.state.hasItem(cond.target);
          if (cond.operator === 'has' && !hasItem) return false;
          if (cond.operator === 'not_has' && hasItem) return false;
          break;

        case 'relationship':
          const relValue = this.state.getRelationship(cond.target);
          if (!this.compare(relValue, cond.operator, cond.value)) {
            return false;
          }
          break;

        case 'flag':
          const flagValue = this.state.getFlag(cond.target);
          if (!this.compare(flagValue, cond.operator, cond.value)) {
            return false;
          }
          break;

        case 'character':
          // 检查当前角色是否匹配
          if (cond.target !== this.state.character.id) {
            return false;
          }
          break;
      }
    }

    return true;
  }

  // 比较运算
  compare(a, op, b) {
    switch (op) {
      case '>=': return a >= b;
      case '<=': return a <= b;
      case '==': return a == b;
      case '!=': return a != b;
      case '>': return a > b;
      case '<': return a < b;
      default: return false;
    }
  }

  // 应用效果
  applyEffects(effects) {
    if (!effects) return;

    for (const effect of effects) {
      switch (effect.type) {
        case 'attribute_change':
          const oldValue = this.state.getAttribute(effect.target);
          this.state.modifyAttribute(effect.target, effect.value);
          const newValue = this.state.getAttribute(effect.target);
          const attrName = this.getAttributeName(effect.target);
          if (effect.value > 0) {
            console.log(`  ${colorText('[属性]', 'cyan')} ${attrName} ${colorText('+' + effect.value, 'green')} (${oldValue} → ${colorText(newValue.toString(), 'green')})`);
          } else {
            console.log(`  ${colorText('[属性]', 'cyan')} ${attrName} ${colorText(effect.value.toString(), 'red')} (${oldValue} → ${colorText(newValue.toString(), 'red')})`);
          }
          break;

        case 'add_item':
          const item = this.getItem(effect.target);
          if (this.state.addItem(effect.target)) {
            console.log(`  ${colorText('[物品]', 'yellow')} 获得道具: ${colorText(item ? item.name : effect.target, 'green')}`);
          }
          break;

        case 'remove_item':
          if (this.state.removeItem(effect.target)) {
            console.log(`  ${colorText('[物品]', 'yellow')} 失去道具: ${colorText(effect.target, 'red')}`);
          }
          break;

        case 'relationship_change':
          this.state.modifyRelationship(effect.target, effect.value);
          const npc = this.getNPC(effect.target);
          const npcName = npc ? npc.name : effect.target;
          if (effect.value > 0) {
            console.log(`  [关系] 与 ${npcName} 的关系提升 ${effect.value}`);
          } else {
            console.log(`  [关系] 与 ${npcName} 的关系下降 ${Math.abs(effect.value)}`);
          }
          break;

        case 'set_flag':
          this.state.setFlag(effect.target, effect.value);
          break;

        case 'add_title':
          console.log(`  [称号] 获得称号: ${effect.target}`);
          break;

        case 'learn_skill':
          const skill = this.getSkill(effect.target);
          console.log(`  [技能] 学会技能: ${skill ? skill.name : effect.target}`);
          break;

        case 'historical_intervention':
          // 历史干预效果
          this.recordHistoricalIntervention(effect.eventId, effect.action, effect.consequence);
          console.log(`  [历史干预] ${effect.description || '你改变了历史的走向...'}`);
          if (effect.consequence) {
            console.log(`  [后果] ${effect.consequence}`);
          }
          break;

        case 'unlock_achievement':
          // 直接解锁成就
          if (this.state.addAchievement(effect.target)) {
            const ach = this.getAchievement(effect.target);
            console.log(`  🏆 成就解锁: ${ach ? ach.name : effect.target}`);
          }
          break;

        case 'add_buff':
          const buffInfo = this.gameData.buffTypes ? this.gameData.buffTypes[effect.target] : null;
          const duration = effect.duration || buffInfo?.defaultDuration || 3;
          this.state.addBuff(effect.target, duration, buffInfo);
          if (buffInfo) {
            const buffText = buffInfo.isDebuff ? '损耗' : '增益';
            console.log(`  [${buffText}] 获得「${buffInfo.name}」(${duration}回合)`);
            if (buffInfo.description) {
              console.log(`    ${buffInfo.description}`);
            }
          }
          break;

        case 'remove_buff':
          if (this.state.removeBuff(effect.target)) {
            const removedBuff = this.gameData.buffTypes ? this.gameData.buffTypes[effect.target] : null;
            if (removedBuff) {
              const buffText = removedBuff.isDebuff ? '损耗' : '增益';
              console.log(`  [${buffText}] 「${removedBuff.name}」已消散`);
            }
          }
          break;
      }
    }
  }

  // 获取属性名称
  getAttributeName(attr) {
    const names = {
      genjiao: '根脚',
      qiyun: '气运',
      daohang: '道行',
      shengwang: '声望',
      xinxing: '心性'
    };
    return names[attr] || attr;
  }

  // 获取物品信息
  getItem(itemId) {
    return this.gameData.items.find(i => i.id === itemId);
  }

  // 获取NPC信息
  getNPC(npcId) {
    return this.gameData.npcs.find(n => n.id === npcId);
  }

  // 获取技能信息
  getSkill(skillId) {
    return this.gameData.skills ? this.gameData.skills.find(s => s.id === skillId) : null;
  }

  // 获取成就信息
  getAchievement(achievementId) {
    return this.gameData.achievements ? this.gameData.achievements.find(a => a.id === achievementId) : null;
  }

  // 检查并解锁成就
  checkAchievements() {
    if (!this.gameData.achievements) return;

    const newAchievements = [];
    for (const achievement of this.gameData.achievements) {
      if (this.state.hasAchievement(achievement.id)) continue;

      const cond = achievement.condition;
      let unlocked = false;

      switch (cond.type) {
        case 'flag':
          if (this.state.getFlag(cond.target) === cond.value) {
            unlocked = true;
          }
          break;
        case 'attribute':
          const attrValue = this.state.getAttribute(cond.target);
          if (this.compare(attrValue, cond.operator, cond.value)) {
            if (cond.requireFlag && !this.state.hasFlag(cond.requireFlag)) {
              continue;
            }
            unlocked = true;
          }
          break;
        case 'item':
          // 支持物品条件：拥有特定物品解锁成就
          if (cond.operator === 'has' && this.state.hasItem(cond.target)) {
            unlocked = true;
          }
          break;
        case 'relationship':
          // 支持关系条件：与某角色关系达到阈值
          const relValue = this.state.getRelationship(cond.target);
          if (this.compare(relValue, cond.operator, cond.value)) {
            unlocked = true;
          }
          break;
      }

      if (unlocked) {
        this.state.addAchievement(achievement.id);
        newAchievements.push(achievement);
      }
    }

    if (newAchievements.length > 0) {
      for (const ach of newAchievements) {
        console.log('');
        console.log(colorText('╔' + '═'.repeat(50) + '╗', 'gold'));
        console.log(colorText('║', 'gold') + ' '.repeat(12) + colorText('🏆 成就解锁 🏆', 'yellow').padEnd(38) + colorText('║', 'gold'));
        console.log(colorText('╠' + '═'.repeat(50) + '╣', 'gold'));
        console.log(colorText('║', 'gold') + `  ${colorText(ach.name, 'bright')}`.padEnd(50) + colorText('║', 'gold'));
        console.log(colorText('║', 'gold') + `  ${ach.description}`.padEnd(50) + colorText('║', 'gold'));
        console.log(colorText('╚' + '═'.repeat(50) + '╝', 'gold'));
        console.log('');
      }
    }
  }

  // 执行修炼
  async performCultivation(type) {
    if (this.state.cultivationCooldown > 0) {
      console.log(`[系统] 修炼冷却中，还需等待 ${this.state.cultivationCooldown} 个回合`);
      return false;
    }

    const genjiao = this.state.getAttribute('genjiao');
    const daohang = this.state.getAttribute('daohang');
    const qiyun = this.state.getAttribute('qiyun');

    let success = false;
    let message = '';
    let daohangChange = 0;
    let qiyunChange = 0;

    if (type === 'wudao') {
      const successChance = Math.min(90, genjiao);
      const roll = Math.random() * 100;

      if (roll < successChance) {
        daohangChange = Math.floor(5 + genjiao * 0.1);
        qiyunChange = Math.floor(2 + genjiao * 0.05);
        this.state.modifyAttribute('daohang', daohangChange);
        this.state.modifyAttribute('qiyun', qiyunChange);
        message = '悟道成功！';
        success = true;

        if (this.state.getAttribute('daohang') >= 90) {
          this.state.setFlag('flag_cultivation_reached_90', true);
        }
      } else {
        daohangChange = -Math.floor(3 + Math.random() * 5);
        this.state.modifyAttribute('daohang', daohangChange);
        message = '悟道失败！心魔侵扰';
      }
    } else if (type === 'biguan') {
      daohangChange = Math.floor(2 + genjiao * 0.05);
      qiyunChange = Math.floor(1 + genjiao * 0.02);
      this.state.modifyAttribute('daohang', daohangChange);
      this.state.modifyAttribute('qiyun', qiyunChange);
      message = '闭关圆满。';
      success = true;

      if (this.state.getAttribute('daohang') >= 90) {
        this.state.setFlag('flag_cultivation_reached_90', true);
      }
    }

    this.state.cultivationCount++;
    this.state.cultivationCooldown = 3;

    // 显示修炼结果（带颜色）
    console.log('');
    console.log(colorText('┌' + '─'.repeat(40) + '┐', success ? 'green' : 'red'));
    console.log(colorText('│', success ? 'green' : 'red') + ' '.repeat(12) + colorText('【修炼结果】', 'bright').padEnd(28) + colorText('│', success ? 'green' : 'red'));
    console.log(colorText('├' + '─'.repeat(40) + '┤', success ? 'green' : 'red'));
    console.log(colorText('│', success ? 'green' : 'red') + `  ${message}`.padEnd(40) + colorText('│', success ? 'green' : 'red'));

    // 显示属性变化
    if (daohangChange !== 0) {
      const daohangColor = daohangChange > 0 ? 'green' : 'red';
      console.log(colorText('│', success ? 'green' : 'red') + `  道行: ${colorText((daohangChange > 0 ? '+' : '') + daohangChange, daohangColor)} → ${this.state.getAttribute('daohang')}`.padEnd(40) + colorText('│', success ? 'green' : 'red'));
    }
    if (qiyunChange !== 0) {
      const qiyunColor = qiyunChange > 0 ? 'green' : 'red';
      console.log(colorText('│', success ? 'green' : 'red') + `  气运: ${colorText((qiyunChange > 0 ? '+' : '') + qiyunChange, qiyunColor)} → ${this.state.getAttribute('qiyun')}`.padEnd(40) + colorText('│', success ? 'green' : 'red'));
    }
    console.log(colorText('└' + '─'.repeat(40) + '┘', success ? 'green' : 'red'));
    console.log('');

    if (this.state.checkDeath()) {
      await this.handleDeath();
      return false;
    }

    this.checkAchievements();
    return true;
  }

  // 处理死亡
  async handleDeath() {
    console.log('');
    console.log(colorText('╔' + '═'.repeat(58) + '╗', 'red'));
    console.log(colorText('║', 'red') + ' '.repeat(22) + colorText('💀 陨落 💀', 'bright').padEnd(36) + colorText('║', 'red'));
    console.log(colorText('╠' + '═'.repeat(58) + '╣', 'red'));
    console.log(colorText('║', 'red') + `  ${colorText(this.state.deathReason, 'yellow')}`.padEnd(58) + colorText('║', 'red'));
    console.log(colorText('║', 'red') + ' '.repeat(58) + colorText('║', 'red'));
    console.log(colorText('║', 'red') + `  ${this.state.character.name} 的旅程到此结束。`.padEnd(58) + colorText('║', 'red'));
    console.log(colorText('║', 'red') + `  存活时长: ${this.state.history.length} 个节点`.padEnd(58) + colorText('║', 'red'));
    console.log(colorText('║', 'red') + `  解锁成就: ${this.state.achievements.length} 个`.padEnd(58) + colorText('║', 'red'));
    console.log(colorText('╚' + '═'.repeat(58) + '╝', 'red'));
    console.log('');

    this.state.gameComplete = true;

    const restart = await this.prompt('\n是否重新开始游戏？(Y/N): ');
    if (restart.toUpperCase() === 'Y') {
      this.state = null;
      await this.startNewGame();
    } else {
      this.running = false;
      console.log('\n' + colorText('感谢游玩洪荒神话！', 'gold'));
    }
  }

  // 记录历史干预
  recordHistoricalIntervention(eventId, action, consequence) {
    this.state.historicalInterventions.push({
      eventId,
      action,
      consequence,
      timestamp: new Date().toISOString()
    });
  }

  // 显示成就列表
  showAchievements() {
    console.log('');
    console.log(colorText('╔' + '═'.repeat(50) + '╗', 'gold'));
    console.log(colorText('║', 'gold') + ' '.repeat(16) + colorText('【成就系统】', 'bright') + ' '.repeat(22) + colorText('║', 'gold'));
    console.log(colorText('╠' + '═'.repeat(50) + '╣', 'gold'));

    if (!this.gameData.achievements || this.gameData.achievements.length === 0) {
      console.log(colorText('║', 'gold') + '  (无成就数据)'.padEnd(50) + colorText('║', 'gold'));
      console.log(colorText('╚' + '═'.repeat(50) + '╝', 'gold'));
      return;
    }

    for (const ach of this.gameData.achievements) {
      const unlocked = this.state.hasAchievement(ach.id);
      const status = unlocked ? colorText('✅', 'green') : colorText('🔒', 'white');
      const nameColor = unlocked ? 'yellow' : 'white';
      console.log(colorText('║', 'gold') + `  ${status} ${colorText(ach.name, nameColor)}: ${ach.description}`.substring(0, 49).padEnd(50) + colorText('║', 'gold'));
    }

    console.log(colorText('╠' + '═'.repeat(50) + '╣', 'gold'));
    console.log(colorText('║', 'gold') + `  已解锁: ${colorText(this.state.achievements.length.toString(), 'yellow')} / ${this.gameData.achievements.length}`.padEnd(50) + colorText('║', 'gold'));
    console.log(colorText('╚' + '═'.repeat(50) + '╝', 'gold'));
    console.log('');
  }

  // 显示修炼菜单
  async showCultivationMenu() {
    console.log('');
    console.log(colorText('╔' + '═'.repeat(48) + '╗', 'yellow'));
    console.log(colorText('║', 'yellow') + ' '.repeat(16) + colorText('【修炼系统】', 'bright') + ' '.repeat(20) + colorText('║', 'yellow'));
    console.log(colorText('╠' + '═'.repeat(48) + '╣', 'yellow'));
    console.log(colorText('║', 'yellow') + `  当前根脚: ${this.state.getAttribute('genjiao')} (影响修炼成功率)`.padEnd(48) + colorText('║', 'yellow'));
    console.log(colorText('║', 'yellow') + `  当前道行: ${this.state.getAttribute('daohang')}`.padEnd(48) + colorText('║', 'yellow'));
    console.log(colorText('║', 'yellow') + `  当前气运: ${this.state.getAttribute('qiyun')}`.padEnd(48) + colorText('║', 'yellow'));
    console.log(colorText('║', 'yellow') + `  修炼次数: ${this.state.cultivationCount}`.padEnd(48) + colorText('║', 'yellow'));

    if (this.state.cultivationCooldown > 0) {
      console.log(colorText('╠' + '═'.repeat(48) + '╣', 'yellow'));
      console.log(colorText('║', 'yellow') + colorText(`  ⏳ 冷却中: 还需 ${this.state.cultivationCooldown} 回合`, 'red').padEnd(48) + colorText('║', 'yellow'));
      console.log(colorText('╚' + '═'.repeat(48) + '╝', 'yellow'));
      console.log('');
      await this.prompt('按回车键返回...');
      return;
    }

    console.log(colorText('╠' + '═'.repeat(48) + '╣', 'yellow'));
    console.log(colorText('║', 'yellow') + '  [1] 主动悟道 - 高风险高收益，成功率基于根脚'.padEnd(48) + colorText('║', 'yellow'));
    console.log(colorText('║', 'yellow') + '  [2] 闭关修炼 - 稳定收益，无风险'.padEnd(48) + colorText('║', 'yellow'));
    console.log(colorText('║', 'yellow') + '  [0] 返回'.padEnd(48) + colorText('║', 'yellow'));
    console.log(colorText('╚' + '═'.repeat(48) + '╝', 'yellow'));
    console.log('');

    const choice = await this.prompt('选择修炼方式: ');
    if (choice.trim() === '1') {
      await this.performCultivation('wudao');
    } else if (choice.trim() === '2') {
      await this.performCultivation('biguan');
    }
  }

  // 显示属性
  showAttributes() {
    console.log('');
    console.log(colorText('╔' + '═'.repeat(38) + '╗', 'cyan'));
    console.log(colorText('║', 'cyan') + ' '.repeat(12) + colorText('【当前属性】', 'bright') + ' '.repeat(14) + colorText('║', 'cyan'));
    console.log(colorText('╠' + '═'.repeat(38) + '╣', 'cyan'));
    console.log(colorText('║', 'cyan') + `  根脚: ${this.printBar(this.state.getAttribute('genjiao'))} ${this.state.getAttribute('genjiao')}`.padEnd(38) + colorText('║', 'cyan'));
    console.log(colorText('║', 'cyan') + `  气运: ${this.printBar(this.state.getAttribute('qiyun'))} ${this.state.getAttribute('qiyun')}`.padEnd(38) + colorText('║', 'cyan'));
    console.log(colorText('║', 'cyan') + `  道行: ${this.printBar(this.state.getAttribute('daohang'))} ${this.state.getAttribute('daohang')}`.padEnd(38) + colorText('║', 'cyan'));
    console.log(colorText('║', 'cyan') + `  声望: ${this.printBar(this.state.getAttribute('shengwang'))} ${this.state.getAttribute('shengwang')}`.padEnd(38) + colorText('║', 'cyan'));
    console.log(colorText('║', 'cyan') + `  心性: ${this.printBar(this.state.getAttribute('xinxing'))} ${this.state.getAttribute('xinxing')}`.padEnd(38) + colorText('║', 'cyan'));
    console.log(colorText('╠' + '═'.repeat(38) + '╣', 'cyan'));

    // 显示战力
    const combatPower = this.state.getCombatPower();
    console.log(colorText('║', 'cyan') + `  ⚔️ 战力: ${colorText(combatPower.toString(), 'yellow')}`.padEnd(38) + colorText('║', 'cyan'));

    // 显示激活的buff
    if (this.state.buffs.length > 0) {
      console.log(colorText('╠' + '═'.repeat(38) + '╣', 'cyan'));
      console.log(colorText('║', 'cyan') + '  【增益/损耗】'.padEnd(38) + colorText('║', 'cyan'));
      for (const buff of this.state.buffs) {
        const buffInfo = this.gameData.buffTypes ? this.gameData.buffTypes[buff.id] : null;
        if (buffInfo) {
          const icon = buffInfo.isDebuff ? '🔻' : '🔺';
          const buffColor = buffInfo.isDebuff ? 'red' : 'green';
          const turns = buff.duration;
          console.log(colorText('║', 'cyan') + `  ${icon} ${colorText(buffInfo.name, buffColor)} (${turns}回合)`.padEnd(38) + colorText('║', 'cyan'));
        }
      }
    }
    console.log(colorText('╚' + '═'.repeat(38) + '╝', 'cyan'));
    console.log('');
  }

  // 显示物品
  showItems() {
    console.log('');
    console.log(colorText('╔' + '═'.repeat(38) + '╗', 'blue'));
    console.log(colorText('║', 'blue') + ' '.repeat(10) + colorText('【已获得物品】', 'bright') + ' '.repeat(16) + colorText('║', 'blue'));
    console.log(colorText('╠' + '═'.repeat(38) + '╣', 'blue'));

    if (this.state.items.length === 0) {
      console.log(colorText('║', 'blue') + '  (无物品)'.padEnd(38) + colorText('║', 'blue'));
    } else {
      for (const itemId of this.state.items) {
        const item = this.getItem(itemId);
        if (item) {
          const rarityColor = item.rarity === '传说' ? 'gold' : (item.rarity === '稀有' ? 'yellow' : 'white');
          console.log(colorText('║', 'blue') + `  - ${colorText(item.name, rarityColor)} [${item.rarity}]`.padEnd(38) + colorText('║', 'blue'));
          if (item.description) {
            console.log(colorText('║', 'blue') + `    ${item.description}`.substring(0, 36).padEnd(38) + colorText('║', 'blue'));
          }
        } else {
          console.log(colorText('║', 'blue') + `  - ${itemId}`.padEnd(38) + colorText('║', 'blue'));
        }
      }
    }
    console.log(colorText('╚' + '═'.repeat(38) + '╝', 'blue'));
    console.log('');
  }

  // 处理结局
  async handleEnding(node) {
    // 根据结局类型选择 ASCII 艺术
    const endingId = node.endingId || 'default';
    let art = ASCII_ART.endings.default;

    // 根据结局ID匹配合适的艺术图
    if (endingId.includes('transcend') || endingId.includes('sage')) {
      art = ASCII_ART.endings.transcend;
    } else if (endingId.includes('saint') || endingId.includes('holy')) {
      art = ASCII_ART.endings.saint;
    } else if (endingId.includes('ruler') || endingId.includes('emperor') || endingId.includes('dijun')) {
      art = ASCII_ART.endings.ruler;
    } else if (endingId.includes('retire') || endingId.includes('seclusion')) {
      art = ASCII_ART.endings.retire;
    } else if (endingId.includes('fallen') || endingId.includes('death') || endingId.includes('perish')) {
      art = ASCII_ART.endings.fallen;
    } else if (endingId.includes('sacrifice') || endingId.includes('martyr')) {
      art = ASCII_ART.endings.sacrifice;
    }

    // 显示结局 ASCII 艺术
    console.log('');
    for (const line of art) {
      console.log(colorText(line, 'gold'));
      await this.wait(80);
    }

    console.log('');
    console.log(colorText('┌' + '─'.repeat(58) + '┐', 'yellow'));
    console.log(colorText('│', 'yellow') + ' '.repeat(2) + colorText(node.title, 'gold').padEnd(56) + colorText('│', 'yellow'));
    console.log(colorText('└' + '─'.repeat(58) + '┘', 'yellow'));
    console.log('');

    let content = node.content;
    content = content.replace(/{player_name}/g, this.state.character.name);

    // 打字机效果输出结局内容
    const paragraphs = content.split('\n');
    for (const p of paragraphs) {
      if (p.trim()) {
        await typeWriteLine('  ' + p.trim(), CONFIG.typeSpeed);
      }
    }
    console.log('');

    // 显示最终属性
    console.log(colorText('─'.repeat(60), 'cyan'));
    console.log(colorText('  最终属性:', 'cyan'));
    console.log(`    根脚: ${this.state.getAttribute('genjiao')}  气运: ${this.state.getAttribute('qiyun')}  道行: ${this.state.getAttribute('daohang')}`);
    console.log(`    声望: ${this.state.getAttribute('shengwang')}  心性: ${this.state.getAttribute('xinxing')}`);
    if (this.state.achievements.length > 0) {
      console.log(colorText(`  解锁成就: ${this.state.achievements.length}个`, 'yellow'));
    }
    console.log(colorText('─'.repeat(60), 'cyan'));

    this.state.gameComplete = true;

    // 询问是否重新开始
    const restart = await this.prompt('\n是否重新开始游戏？(Y/N): ');
    if (restart.toUpperCase() === 'Y') {
      this.state = null;
      await this.startNewGame();
    } else {
      this.running = false;
      console.log('\n' + colorText('感谢游玩洪荒神话！', 'gold'));
    }
  }

  // 存档
  async saveGame() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `save_${this.state.character.id}_${timestamp}.json`;
    const filepath = path.join(CONFIG.saveDir, filename);

    const saveData = this.state.toJSON();
    fs.writeFileSync(filepath, JSON.stringify(saveData, null, 2), 'utf8');

    console.log(`[系统] 游戏已存档: ${filename}`);
  }

  // 自动存档
  autoSave() {
    const filename = 'autosave.json';
    const filepath = path.join(CONFIG.saveDir, filename);
    const saveData = this.state.toJSON();
    fs.writeFileSync(filepath, JSON.stringify(saveData, null, 2), 'utf8');
  }

  // 读档
  async loadGame(filename = null) {
    if (!filename) {
      // 列出所有存档
      let files;
      try {
        files = fs.readdirSync(CONFIG.saveDir).filter(f => f.endsWith('.json'));
      } catch (err) {
        console.log('[系统] 存档目录不存在或无法访问');
        return false;
      }

      if (files.length === 0) {
        console.log('[系统] 没有找到存档文件');
        return false;
      }

      console.log('\n【存档列表】');
      files.forEach((f, i) => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(CONFIG.saveDir, f), 'utf8'));
          const char = this.gameData.characters.find(c => c.id === data.characterId);
          console.log(`  [${i + 1}] ${f} - ${char ? char.name : '未知'} - ${data.savedAt || '未知时间'}`);
        } catch (err) {
          console.log(`  [${i + 1}] ${f} - (存档损坏)`);
        }
      });

      const input = await this.prompt('选择存档编号 (0取消): ');
      const num = parseInt(input);
      if (num < 1 || num > files.length) {
        return false;
      }
      filename = files[num - 1];
    }

    const filepath = path.join(CONFIG.saveDir, filename);
    let saveData;
    try {
      const rawData = fs.readFileSync(filepath, 'utf8');
      saveData = JSON.parse(rawData);
    } catch (err) {
      console.log(`[系统] 存档文件损坏或格式错误: ${err.message}`);
      return false;
    }

    this.state = GameState.fromJSON(saveData, this.gameData);
    console.log(`[系统] 存档已加载: ${filename}`);
    this.printCharacterCard();

    return true;
  }

  // 等待用户继续
  async promptContinue() {
    await this.prompt('\n按回车键继续...');
  }

  // 输入提示
  prompt(question) {
    return new Promise(resolve => {
      this.rl.question(question, answer => {
        resolve(answer);
      });
    });
  }

  // 等待
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 关闭引擎
  close() {
    if (this.rl) {
      this.rl.close();
    }
  }
}

// ==================== 主程序 ====================
async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                                                        ║');
  console.log('║              洪 荒 神 话                               ║');
  console.log('║                                                        ║');
  console.log('║         从龙汉初劫到巫妖大战的史诗之旅                 ║');
  console.log('║                                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  const engine = new GameEngine();
  await engine.init();

  // 检查命令行参数（存档文件）
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const saveFile = args[0];
    const loaded = await engine.loadGame(saveFile);
    if (loaded) {
      await engine.gameLoop();
    } else {
      console.log('[系统] 存档加载失败，开始新游戏');
      await engine.startNewGame();
    }
  } else {
    // 显示主菜单
    console.log('【主菜单】');
    console.log('  [1] 开始新游戏');
    console.log('  [2] 读取存档');
    console.log('  [3] 退出');

    const choice = await engine.prompt('请选择: ');
    switch (choice.trim()) {
      case '1':
        await engine.startNewGame();
        break;
      case '2':
        const loaded = await engine.loadGame();
        if (loaded) {
          await engine.gameLoop();
        } else {
          await engine.startNewGame();
        }
        break;
      case '3':
        console.log('再见！');
        break;
      default:
        await engine.startNewGame();
    }
  }

  engine.close();
}

// 运行主程序
main().catch(err => {
  console.error('[错误]', err.message);
  process.exit(1);
});
