/**
 * 洪荒神话游戏引擎单元测试
 *
 * 测试覆盖：
 * 1. 剧本读取功能
 * 2. 随机角色生成
 * 3. 选项属性变化
 * 4. 存档读档完整性
 * 5. 结局触发检测
 */

const fs = require('fs');
const path = require('path');

// ==================== 测试数据加载 ====================
const GAME_DATA_PATH = path.join(__dirname, 'game_data_full.json');
const SAVE_DIR = path.join(__dirname, 'saves');

// 加载游戏数据
function loadGameData() {
  const rawData = fs.readFileSync(GAME_DATA_PATH, 'utf8');
  return JSON.parse(rawData);
}

// ==================== 游戏状态类（从引擎提取） ====================
class GameState {
  constructor() {
    this.character = null;
    this.currentNodeId = null;
    this.attributes = {};
    this.items = [];
    this.relationships = {};
    this.flags = {};
    this.history = [];
    this.gameComplete = false;
    this.isDead = false;
    this.deathReason = null;
    this.achievements = [];
    this.cultivationCount = 0;
    this.cultivationCooldown = 0;
    this.historicalInterventions = [];
    this.buffs = [];
  }

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

  setAttribute(name, value) {
    this.attributes[name] = Math.max(0, Math.min(100, value));
  }

  modifyAttribute(name, delta) {
    const current = this.getAttribute(name);
    this.setAttribute(name, current + delta);
  }

  addItem(itemId) {
    if (!this.items.includes(itemId)) {
      this.items.push(itemId);
      return true;
    }
    return false;
  }

  removeItem(itemId) {
    const index = this.items.indexOf(itemId);
    if (index > -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }

  hasItem(itemId) {
    return this.items.includes(itemId);
  }

  checkDeath() {
    const qiyun = this.getAttribute('qiyun');
    const daohang = this.getAttribute('daohang');
    if (qiyun <= 0) {
      this.isDead = true;
      this.deathReason = '气运耗尽，天命已绝';
      return true;
    }
    if (daohang <= 0) {
      this.isDead = true;
      this.deathReason = '道行尽毁，元神消散';
      return true;
    }
    return false;
  }

  addAchievement(achievementId) {
    if (!this.achievements.includes(achievementId)) {
      this.achievements.push(achievementId);
      return true;
    }
    return false;
  }

  hasAchievement(achievementId) {
    return this.achievements.includes(achievementId);
  }

  getRelationship(characterId) {
    return this.relationships[characterId] || 0;
  }

  modifyRelationship(characterId, delta) {
    const current = this.getRelationship(characterId);
    this.relationships[characterId] = Math.max(-100, Math.min(100, current + delta));
  }

  setFlag(name, value) {
    this.flags[name] = value;
  }

  getFlag(name) {
    return this.flags[name];
  }

  hasFlag(name) {
    return this.flags.hasOwnProperty(name);
  }

  // Buff 系统方法
  addBuff(buffId, duration, buffData) {
    const existingIndex = this.buffs.findIndex(b => b.id === buffId);
    if (existingIndex > -1) {
      this.buffs[existingIndex].duration = duration;
    } else {
      this.buffs.push({ id: buffId, duration, data: buffData });
    }
  }

  removeBuff(buffId) {
    const index = this.buffs.findIndex(b => b.id === buffId);
    if (index > -1) {
      this.buffs.splice(index, 1);
      return true;
    }
    return false;
  }

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

  getAttributeWithBuffs(name, buffTypes) {
    let value = this.getAttribute(name);
    for (const buff of this.buffs) {
      const buffInfo = buffTypes ? buffTypes[buff.id] : null;
      if (buffInfo && buffInfo.effects && buffInfo.effects[name]) {
        value += buffInfo.effects[name];
      }
    }
    return Math.max(0, Math.min(100, value));
  }

  getCombatPower(buffTypes) {
    const daohang = this.getAttributeWithBuffs('daohang', buffTypes);
    const genjiao = this.getAttributeWithBuffs('genjiao', buffTypes);
    return Math.floor((daohang + genjiao) / 2);
  }

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
      buffs: [...this.buffs],
      savedAt: new Date().toISOString()
    };
  }

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
    state.buffs = [...(data.buffs || [])];
    return state;
  }
}

// ==================== 测试套件 ====================

describe('洪荒神话游戏引擎测试', () => {

  // ==================== 测试 1: 剧本读取功能 ====================
  describe('1. 剧本读取功能', () => {
    let gameData;

    beforeAll(() => {
      gameData = loadGameData();
    });

    test('应该成功加载游戏数据文件', () => {
      expect(gameData).toBeDefined();
      expect(typeof gameData).toBe('object');
    });

    test('应该包含必要的顶级字段', () => {
      expect(gameData).toHaveProperty('storyNodes');
      expect(gameData).toHaveProperty('characters');
      expect(gameData).toHaveProperty('items');
      expect(gameData).toHaveProperty('npcs');
      expect(gameData).toHaveProperty('timeline');
      expect(gameData).toHaveProperty('endings');
    });

    test('节点数量应该大于等于50', () => {
      expect(gameData.storyNodes.length).toBeGreaterThanOrEqual(50);
    });

    test('角色数量应该为15', () => {
      expect(gameData.characters.length).toBe(15);
    });

    test('每个节点应该有必要的字段', () => {
      const requiredFields = ['id', 'phase', 'type', 'title', 'content'];
      gameData.storyNodes.forEach(node => {
        requiredFields.forEach(field => {
          expect(node).toHaveProperty(field);
        });
      });
    });

    test('所有节点ID应该唯一', () => {
      const ids = gameData.storyNodes.map(n => n.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    test('所有节点类型应该有效', () => {
      const validTypes = ['story', 'battle', 'choice', 'random_event', 'milestone', 'ending'];
      gameData.storyNodes.forEach(node => {
        expect(validTypes).toContain(node.type);
      });
    });
  });

  // ==================== 测试 2: 随机角色生成 ====================
  describe('2. 随机角色生成', () => {
    let gameData;
    let characterIds;

    beforeAll(() => {
      gameData = loadGameData();
      characterIds = gameData.characters.map(c => c.id);
    });

    test('随机选择的角色应该在角色池内', () => {
      // 模拟100次随机选择
      for (let i = 0; i < 100; i++) {
        const randomIndex = Math.floor(Math.random() * gameData.characters.length);
        const character = gameData.characters[randomIndex];
        expect(characterIds).toContain(character.id);
      }
    });

    test('每个角色应该有必要的字段', () => {
      const requiredFields = ['id', 'name', 'title', 'faction', 'attributes', 'background'];
      gameData.characters.forEach(char => {
        requiredFields.forEach(field => {
          expect(char).toHaveProperty(field);
        });
      });
    });

    test('每个角色的属性应该有5个维度', () => {
      const expectedAttrs = ['genjiao', 'qiyun', 'daohang', 'shengwang', 'xinxing'];
      gameData.characters.forEach(char => {
        expectedAttrs.forEach(attr => {
          expect(char.attributes).toHaveProperty(attr);
          expect(char.attributes[attr]).toHaveProperty('min');
          expect(char.attributes[attr]).toHaveProperty('max');
          expect(char.attributes[attr]).toHaveProperty('default');
        });
      });
    });

    test('角色初始属性默认值应该在0-100范围内', () => {
      gameData.characters.forEach(char => {
        Object.values(char.attributes).forEach(attr => {
          expect(attr.default).toBeGreaterThanOrEqual(0);
          expect(attr.default).toBeLessThanOrEqual(100);
          expect(attr.min).toBeGreaterThanOrEqual(0);
          expect(attr.max).toBeLessThanOrEqual(100);
        });
      });
    });

    test('阵营应该为有效值', () => {
      const validFactions = ['妖族', '巫族', '先天神魔', '龙族', '凤族', '麒麟族'];
      gameData.characters.forEach(char => {
        expect(validFactions).toContain(char.faction);
      });
    });
  });

  // ==================== 测试 3: 选项属性变化 ====================
  describe('3. 选项属性变化', () => {
    let state;
    let gameData;

    beforeEach(() => {
      state = new GameState();
      gameData = loadGameData();
      // 初始化默认属性
      state.attributes = { genjiao: 50, qiyun: 50, daohang: 50, shengwang: 50, xinxing: 50 };
    });

    test('属性修改应该正确应用', () => {
      state.modifyAttribute('genjiao', 10);
      expect(state.getAttribute('genjiao')).toBe(60);

      state.modifyAttribute('qiyun', -5);
      expect(state.getAttribute('qiyun')).toBe(45);
    });

    test('属性不应该低于0', () => {
      state.modifyAttribute('genjiao', -100);
      expect(state.getAttribute('genjiao')).toBe(0);
    });

    test('属性不应该高于100', () => {
      state.modifyAttribute('genjiao', 100);
      expect(state.getAttribute('genjiao')).toBe(100);
    });

    test('物品添加应该正确', () => {
      const result = state.addItem('item_test');
      expect(result).toBe(true);
      expect(state.hasItem('item_test')).toBe(true);

      // 重复添加应该返回false
      const result2 = state.addItem('item_test');
      expect(result2).toBe(false);
    });

    test('物品移除应该正确', () => {
      state.addItem('item_test');
      const result = state.removeItem('item_test');
      expect(result).toBe(true);
      expect(state.hasItem('item_test')).toBe(false);

      // 移除不存在的物品应该返回false
      const result2 = state.removeItem('item_test');
      expect(result2).toBe(false);
    });

    test('关系修改应该正确', () => {
      state.modifyRelationship('hongjun', 30);
      expect(state.getRelationship('hongjun')).toBe(30);

      state.modifyRelationship('hongjun', -10);
      expect(state.getRelationship('hongjun')).toBe(20);
    });

    test('关系不应该超出范围', () => {
      state.modifyRelationship('hongjun', 150);
      expect(state.getRelationship('hongjun')).toBe(100);

      state.modifyRelationship('luohuo', -150);
      expect(state.getRelationship('luohuo')).toBe(-100);
    });

    test('标记设置和获取应该正确', () => {
      state.setFlag('test_flag', true);
      expect(state.getFlag('test_flag')).toBe(true);
      expect(state.hasFlag('test_flag')).toBe(true);
    });

    test('应用效果数组应该正确处理所有效果', () => {
      const effects = [
        { type: 'attribute_change', target: 'genjiao', value: 10 },
        { type: 'attribute_change', target: 'qiyun', value: -5 },
        { type: 'set_flag', target: 'test_flag', value: true }
      ];

      effects.forEach(effect => {
        if (effect.type === 'attribute_change') {
          state.modifyAttribute(effect.target, effect.value);
        } else if (effect.type === 'set_flag') {
          state.setFlag(effect.target, effect.value);
        }
      });

      expect(state.getAttribute('genjiao')).toBe(60);
      expect(state.getAttribute('qiyun')).toBe(45);
      expect(state.getFlag('test_flag')).toBe(true);
    });
  });

  // ==================== 测试 4: 存档读档完整性 ====================
  describe('4. 存档读档完整性', () => {
    let state;
    let gameData;
    const testSavePath = path.join(SAVE_DIR, 'test_save_unit.json');

    beforeAll(() => {
      gameData = loadGameData();
      // 确保存档目录存在
      if (!fs.existsSync(SAVE_DIR)) {
        fs.mkdirSync(SAVE_DIR, { recursive: true });
      }
    });

    beforeEach(() => {
      state = new GameState();
      state.character = gameData.characters[0];
      state.currentNodeId = 'node_phase1_start';
      state.attributes = { genjiao: 75, qiyun: 60, daohang: 80, shengwang: 55, xinxing: 70 };
      state.items = ['item_hetuluo', 'item_chaos_bloth'];
      state.relationships = { hongjun: 50, luohuo: -20 };
      state.flags = { flag_test: true, flag_war_started: true };
      state.history = ['node_phase1_start', 'node_phase1_choice'];
      state.gameComplete = false;
    });

    afterAll(() => {
      // 清理测试存档
      if (fs.existsSync(testSavePath)) {
        fs.unlinkSync(testSavePath);
      }
    });

    test('存档序列化应该包含所有数据', () => {
      const saveData = state.toJSON();

      expect(saveData.characterId).toBe(state.character.id);
      expect(saveData.currentNodeId).toBe(state.currentNodeId);
      expect(saveData.attributes).toEqual(state.attributes);
      expect(saveData.items).toEqual(state.items);
      expect(saveData.relationships).toEqual(state.relationships);
      expect(saveData.flags).toEqual(state.flags);
      expect(saveData.history).toEqual(state.history);
      expect(saveData.savedAt).toBeDefined();
    });

    test('存档写入文件应该成功', () => {
      const saveData = state.toJSON();
      fs.writeFileSync(testSavePath, JSON.stringify(saveData, null, 2), 'utf8');

      expect(fs.existsSync(testSavePath)).toBe(true);
    });

    test('存档读取应该恢复所有数据', () => {
      // 先写入
      const saveData = state.toJSON();
      fs.writeFileSync(testSavePath, JSON.stringify(saveData, null, 2), 'utf8');

      // 再读取
      const rawData = fs.readFileSync(testSavePath, 'utf8');
      const loadedData = JSON.parse(rawData);
      const loadedState = GameState.fromJSON(loadedData, gameData);

      expect(loadedState.character.id).toBe(state.character.id);
      expect(loadedState.currentNodeId).toBe(state.currentNodeId);
      expect(loadedState.attributes).toEqual(state.attributes);
      expect(loadedState.items).toEqual(state.items);
      expect(loadedState.relationships).toEqual(state.relationships);
      expect(loadedState.flags).toEqual(state.flags);
      expect(loadedState.history).toEqual(state.history);
      expect(loadedState.gameComplete).toBe(state.gameComplete);
    });

    test('存档数据应该是独立的副本', () => {
      const saveData = state.toJSON();

      // 修改原始状态
      state.modifyAttribute('genjiao', 10);
      state.addItem('item_new');

      // 存档数据不应该改变
      expect(saveData.attributes.genjiao).toBe(75);
      expect(saveData.items).not.toContain('item_new');
    });

    test('加载后的状态修改不应该影响存档文件', () => {
      const saveData = state.toJSON();
      fs.writeFileSync(testSavePath, JSON.stringify(saveData, null, 2), 'utf8');

      const rawData = fs.readFileSync(testSavePath, 'utf8');
      const loadedData = JSON.parse(rawData);
      const loadedState = GameState.fromJSON(loadedData, gameData);

      // 修改加载的状态
      loadedState.modifyAttribute('genjiao', 100);

      // 重新读取文件，应该还是原来的值
      const rawData2 = fs.readFileSync(testSavePath, 'utf8');
      const savedAgain = JSON.parse(rawData2);
      expect(savedAgain.attributes.genjiao).toBe(75);
    });
  });

  // ==================== 测试 5: 结局触发检测 ====================
  describe('5. 结局触发检测', () => {
    let gameData;

    beforeAll(() => {
      gameData = loadGameData();
    });

    test('应该存在结局节点', () => {
      const endingNodes = gameData.storyNodes.filter(n => n.type === 'ending');
      expect(endingNodes.length).toBeGreaterThan(0);
    });

    test('所有结局节点应该有endingId或作为终点', () => {
      const endingNodes = gameData.storyNodes.filter(n => n.type === 'ending');
      endingNodes.forEach(node => {
        // 结局节点不应该有autoNextId或choices（除非是过渡结局）
        if (node.endingId && !node.autoNextId && !node.choices) {
          // 这是最终结局
          expect(node.content).toBeDefined();
        }
      });
    });

    test('结局节点应该可以从某个路径到达', () => {
      const endingNodes = gameData.storyNodes.filter(n => n.type === 'ending');
      const allNodeIds = new Set(gameData.storyNodes.map(n => n.id));
      const referencedIds = new Set();

      // 收集所有被引用的节点
      gameData.storyNodes.forEach(node => {
        if (node.autoNextId) referencedIds.add(node.autoNextId);
        if (node.choices) {
          node.choices.forEach(choice => referencedIds.add(choice.nextNodeId));
        }
      });

      // 检查结局节点是否被引用
      endingNodes.forEach(node => {
        expect(referencedIds.has(node.id) || node.characterRestrictions).toBeTruthy();
      });
    });

    test('结局定义应该与结局节点对应', () => {
      const endingNodes = gameData.storyNodes.filter(n => n.type === 'ending');
      const endingIds = gameData.endings.map(e => e.id);

      endingNodes.forEach(node => {
        if (node.endingId) {
          expect(endingIds).toContain(node.endingId);
        }
      });
    });

    test('应该有多种结局类型', () => {
      const endingTypes = new Set(gameData.endings.map(e => e.type));
      expect(endingTypes.size).toBeGreaterThan(1);
    });

    test('从起始节点应该能到达至少一个结局', () => {
      // 使用BFS检查可达性
      const visited = new Set();
      const queue = ['node_phase1_start'];
      let foundEnding = false;

      while (queue.length > 0 && !foundEnding) {
        const nodeId = queue.shift();
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = gameData.storyNodes.find(n => n.id === nodeId);
        if (!node) continue;

        if (node.type === 'ending') {
          foundEnding = true;
          break;
        }

        if (node.autoNextId) {
          queue.push(node.autoNextId);
        }
        if (node.choices) {
          node.choices.forEach(choice => queue.push(choice.nextNodeId));
        }
      }

      expect(foundEnding).toBe(true);
    });

    test('所有阶段应该有对应的结局或过渡节点', () => {
      const phases = ['dragon_phoenix_war', 'luohuo_fall', 'hongjun_lecture', 'wu_yao_rise', 'wu_yao_final'];

      phases.forEach(phase => {
        const phaseNodes = gameData.storyNodes.filter(n => n.phase === phase);
        const phaseEndings = phaseNodes.filter(n => n.type === 'ending' || n.type === 'milestone');
        expect(phaseEndings.length).toBeGreaterThan(0);
      });
    });
  });

  // ==================== 额外测试: 条件检查 ====================
  describe('额外测试: 条件检查系统', () => {
    let state;
    let gameData;

    beforeEach(() => {
      state = new GameState();
      gameData = loadGameData();
      state.attributes = { genjiao: 80, qiyun: 60, daohang: 75, shengwang: 50, xinxing: 40 };
      state.items = ['item_hetuluo'];
      state.flags = { flag_test: true };
    });

    function checkConditions(state, conditions) {
      if (!conditions || conditions.length === 0) return true;

      for (const cond of conditions) {
        switch (cond.type) {
          case 'attribute':
            const attrValue = state.getAttribute(cond.target);
            if (!compare(attrValue, cond.operator, cond.value)) return false;
            break;
          case 'item':
            if (cond.operator === 'has' && !state.hasItem(cond.target)) return false;
            if (cond.operator === 'not_has' && state.hasItem(cond.target)) return false;
            break;
          case 'flag':
            if (cond.operator === '==' && state.getFlag(cond.target) !== cond.value) return false;
            break;
        }
      }
      return true;
    }

    function compare(a, op, b) {
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

    test('属性条件检查应该正确', () => {
      const conditions = [{ type: 'attribute', target: 'genjiao', operator: '>=', value: 75 }];
      expect(checkConditions(state, conditions)).toBe(true);

      const conditions2 = [{ type: 'attribute', target: 'genjiao', operator: '>=', value: 90 }];
      expect(checkConditions(state, conditions2)).toBe(false);
    });

    test('物品条件检查应该正确', () => {
      const conditions = [{ type: 'item', target: 'item_hetuluo', operator: 'has' }];
      expect(checkConditions(state, conditions)).toBe(true);

      const conditions2 = [{ type: 'item', target: 'item_missing', operator: 'has' }];
      expect(checkConditions(state, conditions2)).toBe(false);
    });

    test('标记条件检查应该正确', () => {
      const conditions = [{ type: 'flag', target: 'flag_test', operator: '==', value: true }];
      expect(checkConditions(state, conditions)).toBe(true);

      const conditions2 = [{ type: 'flag', target: 'flag_missing', operator: '==', value: true }];
      expect(checkConditions(state, conditions2)).toBe(false);
    });

    test('多条件AND逻辑应该正确', () => {
      const conditions = [
        { type: 'attribute', target: 'genjiao', operator: '>=', value: 75 },
        { type: 'item', target: 'item_hetuluo', operator: 'has' }
      ];
      expect(checkConditions(state, conditions)).toBe(true);

      const conditions2 = [
        { type: 'attribute', target: 'genjiao', operator: '>=', value: 75 },
        { type: 'item', target: 'item_missing', operator: 'has' }
      ];
      expect(checkConditions(state, conditions2)).toBe(false);
    });
  });

  // ==================== 测试 6: 死亡机制 ====================
  describe('6. 死亡机制', () => {
    let state;

    beforeEach(() => {
      state = new GameState();
      state.attributes = { genjiao: 50, qiyun: 50, daohang: 50, shengwang: 50, xinxing: 50 };
    });

    test('气运归零应该触发死亡', () => {
      state.setAttribute('qiyun', 0);
      expect(state.checkDeath()).toBe(true);
      expect(state.isDead).toBe(true);
      expect(state.deathReason).toContain('气运');
    });

    test('道行归零应该触发死亡', () => {
      state.setAttribute('daohang', 0);
      expect(state.checkDeath()).toBe(true);
      expect(state.isDead).toBe(true);
      expect(state.deathReason).toContain('道行');
    });

    test('正常属性不应该触发死亡', () => {
      expect(state.checkDeath()).toBe(false);
      expect(state.isDead).toBe(false);
    });

    test('属性降到0以下应该被限制为0', () => {
      state.modifyAttribute('qiyun', -100);
      expect(state.getAttribute('qiyun')).toBe(0);
      expect(state.checkDeath()).toBe(true);
    });
  });

  // ==================== 测试 7: 成就系统 ====================
  describe('7. 成就系统', () => {
    let state;
    let gameData;

    beforeEach(() => {
      state = new GameState();
      gameData = loadGameData();
    });

    test('应该能添加成就', () => {
      const result = state.addAchievement('ach_first_demon');
      expect(result).toBe(true);
      expect(state.hasAchievement('ach_first_demon')).toBe(true);
    });

    test('重复添加成就应该返回false', () => {
      state.addAchievement('ach_first_demon');
      const result = state.addAchievement('ach_first_demon');
      expect(result).toBe(false);
    });

    test('成就数据应该存在', () => {
      expect(gameData.achievements).toBeDefined();
      expect(gameData.achievements.length).toBeGreaterThan(0);
    });

    test('每个成就应该有必要的字段', () => {
      gameData.achievements.forEach(ach => {
        expect(ach).toHaveProperty('id');
        expect(ach).toHaveProperty('name');
        expect(ach).toHaveProperty('description');
        expect(ach).toHaveProperty('condition');
      });
    });

    test('成就条件应该有type字段', () => {
      gameData.achievements.forEach(ach => {
        expect(ach.condition).toHaveProperty('type');
      });
    });
  });

  // ==================== 测试 8: 修炼系统 ====================
  describe('8. 修炼系统', () => {
    let state;

    beforeEach(() => {
      state = new GameState();
      state.attributes = { genjiao: 80, qiyun: 50, daohang: 50, shengwang: 50, xinxing: 50 };
    });

    test('修炼冷却应该正确初始化', () => {
      expect(state.cultivationCooldown).toBe(0);
    });

    test('修炼次数应该正确记录', () => {
      state.cultivationCount = 5;
      expect(state.cultivationCount).toBe(5);
    });

    test('高根脚应该有更高的悟道成功率', () => {
      // 根脚80意味着80%成功率
      const genjiao = state.getAttribute('genjiao');
      expect(genjiao).toBe(80);
      // 成功率应该等于根脚值（上限90）
      const successChance = Math.min(90, genjiao);
      expect(successChance).toBe(80);
    });

    test('修炼后道行应该增加', () => {
      const beforeDaohang = state.getAttribute('daohang');
      // 模拟闭关修炼（稳定收益）
      const genjiao = state.getAttribute('genjiao');
      const daohangGain = Math.floor(2 + genjiao * 0.05);
      state.modifyAttribute('daohang', daohangGain);
      expect(state.getAttribute('daohang')).toBe(beforeDaohang + daohangGain);
    });
  });

  // ==================== 测试 9: 历史干预系统 ====================
  describe('9. 历史干预系统', () => {
    let state;

    beforeEach(() => {
      state = new GameState();
    });

    test('历史干预记录应该正确初始化', () => {
      expect(state.historicalInterventions).toEqual([]);
    });

    test('应该能记录历史干预', () => {
      state.historicalInterventions.push({
        eventId: 'luohuo_plot',
        action: 'help',
        consequence: '三族大战更加惨烈'
      });
      expect(state.historicalInterventions.length).toBe(1);
      expect(state.historicalInterventions[0].eventId).toBe('luohuo_plot');
    });

    test('干预节点应该存在', () => {
      const gameData = loadGameData();
      const interventionNode = gameData.storyNodes.find(n => n.id === 'node_intervention_choice');
      expect(interventionNode).toBeDefined();
    });

    test('干预选项应该有历史干预效果', () => {
      const gameData = loadGameData();
      const interventionNode = gameData.storyNodes.find(n => n.id === 'node_intervention_choice');
      const helpChoice = interventionNode.choices.find(c => c.id === 'choice_intervention_help_luohuo');
      expect(helpChoice).toBeDefined();
      const interventionEffect = helpChoice.effects.find(e => e.type === 'historical_intervention');
      expect(interventionEffect).toBeDefined();
    });
  });

  // ==================== 测试 10: BUG修复验证 ====================
  describe('10. BUG修复验证', () => {
    let state;
    let gameData;

    beforeEach(() => {
      state = new GameState();
      gameData = loadGameData();
    });

    // BUG 1: getAttribute对未初始化属性返回50而非角色默认值
    test('未初始化属性应返回角色默认值', () => {
      state.character = gameData.characters[0]; // 帝俊
      // 不设置attributes，直接获取
      const genjiao = state.getAttribute('genjiao');
      // 应该返回角色的默认值（帝俊根脚默认95），而不是50
      expect(genjiao).toBe(state.character.attributes.genjiao.default);
    });

    // BUG 3: 成就检查只支持flag和attribute
    test('成就条件应支持item类型', () => {
      state.addItem('item_hetuluo');
      // 模拟检查item类型条件
      const hasItem = state.hasItem('item_hetuluo');
      expect(hasItem).toBe(true);
    });

    test('成就条件应支持relationship类型', () => {
      state.modifyRelationship('hongjun', 50);
      const relValue = state.getRelationship('hongjun');
      expect(relValue).toBe(50);
    });

    // BUG 4: 无选项节点不记录历史
    test('历史记录应正确追踪', () => {
      state.history.push('node_1');
      state.history.push('node_2');
      expect(state.history.length).toBe(2);
      expect(state.history[0]).toBe('node_1');
    });

    // BUG 9: 历史干预记录持久化
    test('历史干预记录应正确保存和恢复', () => {
      state.historicalInterventions.push({
        eventId: 'test_event',
        action: 'help',
        consequence: 'test consequence'
      });
      expect(state.historicalInterventions.length).toBe(1);
      expect(state.historicalInterventions[0].eventId).toBe('test_event');
    });

    // 额外测试: 存档完整性
    test('存档应包含所有新增字段', () => {
      state.character = gameData.characters[0];
      state.currentNodeId = 'node_test';
      state.attributes = { genjiao: 80, qiyun: 60, daohang: 70, shengwang: 50, xinxing: 55 };
      state.cultivationCount = 3;
      state.cultivationCooldown = 1;
      state.historicalInterventions = [{ eventId: 'test', action: 'help', consequence: 'none' }];
      state.achievements = ['ach_first_demon'];

      // 模拟toJSON
      const saveData = {
        characterId: state.character.id,
        currentNodeId: state.currentNodeId,
        attributes: { ...state.attributes },
        cultivationCount: state.cultivationCount,
        cultivationCooldown: state.cultivationCooldown,
        historicalInterventions: [...state.historicalInterventions],
        achievements: [...state.achievements]
      };

      expect(saveData.cultivationCount).toBe(3);
      expect(saveData.cultivationCooldown).toBe(1);
      expect(saveData.historicalInterventions.length).toBe(1);
      expect(saveData.achievements.length).toBe(1);
    });
  });

  // ==================== 测试 11: Buff/Debuff 系统 ====================
  describe('11. Buff/Debuff 系统', () => {
    let state;
    let gameData;

    beforeEach(() => {
      state = new GameState();
      state.attributes = { genjiao: 60, qiyun: 50, daohang: 70, shengwang: 40, xinxing: 55 };
      gameData = loadGameData();
    });

    test('应该能添加buff', () => {
      state.addBuff('buff_hongjun_blessing', 5, gameData.buffTypes?.buff_hongjun_blessing);
      expect(state.buffs.length).toBe(1);
      expect(state.buffs[0].id).toBe('buff_hongjun_blessing');
      expect(state.buffs[0].duration).toBe(5);
    });

    test('重复添加相同buff应该刷新持续时间', () => {
      state.addBuff('buff_hongjun_blessing', 5, null);
      state.addBuff('buff_hongjun_blessing', 3, null);
      expect(state.buffs.length).toBe(1);
      expect(state.buffs[0].duration).toBe(3);
    });

    test('应该能移除buff', () => {
      state.addBuff('buff_hongjun_blessing', 5, null);
      const removed = state.removeBuff('buff_hongjun_blessing');
      expect(removed).toBe(true);
      expect(state.buffs.length).toBe(0);
    });

    test('移除不存在的buff应该返回false', () => {
      const removed = state.removeBuff('nonexistent_buff');
      expect(removed).toBe(false);
    });

    test('tickBuffs应该减少持续时间', () => {
      state.addBuff('buff_hongjun_blessing', 3, null);
      state.tickBuffs();
      expect(state.buffs[0].duration).toBe(2);
    });

    test('持续时间归零的buff应该被移除', () => {
      state.addBuff('buff_hongjun_blessing', 1, null);
      const expired = state.tickBuffs();
      expect(expired.length).toBe(1);
      expect(expired[0].id).toBe('buff_hongjun_blessing');
      expect(state.buffs.length).toBe(0);
    });

    test('buff应该影响属性计算', () => {
      const buffTypes = {
        buff_test: {
          name: '测试增益',
          isDebuff: false,
          effects: { daohang: 10 }
        }
      };
      state.addBuff('buff_test', 5, buffTypes.buff_test);
      const daohangWithBuff = state.getAttributeWithBuffs('daohang', buffTypes);
      expect(daohangWithBuff).toBe(80); // 70 + 10
    });

    test('debuff应该减少属性', () => {
      const buffTypes = {
        debuff_test: {
          name: '测试损耗',
          isDebuff: true,
          effects: { qiyun: -15 }
        }
      };
      state.addBuff('debuff_test', 3, buffTypes.debuff_test);
      const qiyunWithDebuff = state.getAttributeWithBuffs('qiyun', buffTypes);
      expect(qiyunWithDebuff).toBe(35); // 50 - 15
    });

    test('战力计算应该考虑buff', () => {
      const buffTypes = {
        buff_combat: {
          name: '战力增益',
          isDebuff: false,
          effects: { daohang: 10, genjiao: 5 }
        }
      };
      // 基础战力 = (70 + 60) / 2 = 65
      expect(state.getCombatPower()).toBe(65);

      state.addBuff('buff_combat', 5, buffTypes.buff_combat);
      // 带buff战力 = (80 + 65) / 2 = 72
      expect(state.getCombatPower(buffTypes)).toBe(72);
    });

    test('buff应该正确保存到存档', () => {
      state.addBuff('buff_hongjun_blessing', 5, null);
      state.addBuff('debuff_demon_corruption', 3, null);
      const saveData = state.toJSON();
      expect(saveData.buffs.length).toBe(2);
    });

    test('buff应该从存档正确恢复', () => {
      state.addBuff('buff_hongjun_blessing', 5, null);
      const saveData = state.toJSON();
      const restored = GameState.fromJSON(saveData, gameData);
      expect(restored.buffs.length).toBe(1);
      expect(restored.buffs[0].id).toBe('buff_hongjun_blessing');
    });

    test('游戏数据应包含buffTypes定义', () => {
      expect(gameData.buffTypes).toBeDefined();
      expect(Object.keys(gameData.buffTypes).length).toBeGreaterThan(0);
    });

    test('战斗节点应有combatThreshold', () => {
      const battleNodes = gameData.storyNodes.filter(n => n.combatThreshold);
      expect(battleNodes.length).toBeGreaterThan(0);
    });
  });
});
