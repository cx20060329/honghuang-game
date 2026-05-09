/**
 * 洪荒神话游戏数据验证脚本
 * 检查 JSON 数据的完整性和一致性
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(colors[color] || '', ...args, colors.reset);
}

function validateGameData(data) {
  const errors = [];
  const warnings = [];
  const info = [];

  log('cyan', '╔════════════════════════════════════════════════════════╗');
  log('cyan', '║           洪荒神话游戏数据验证报告                     ║');
  log('cyan', '╠════════════════════════════════════════════════════════╣');

  // ========== 1. 检查节点 ID 唯一性 ==========
  log('blue', '\n[检查 1] 节点 ID 唯一性');
  const nodes = data.storyNodes || [];
  const nodeIdSet = new Set();
  const duplicateIds = [];

  nodes.forEach(node => {
    if (nodeIdSet.has(node.id)) {
      duplicateIds.push(node.id);
    }
    nodeIdSet.add(node.id);
  });

  if (duplicateIds.length === 0) {
    log('green', '  ✅ 所有节点 ID 唯一');
    info.push({ check: '节点ID唯一性', status: 'PASS', count: nodes.length });
  } else {
    log('red', `  ❌ 发现重复节点 ID: ${duplicateIds.join(', ')}`);
    errors.push({ type: 'duplicate_node_id', ids: duplicateIds });
    info.push({ check: '节点ID唯一性', status: 'FAIL', count: duplicateIds.length });
  }

  // ========== 2. 检查选项跳转目标存在性 ==========
  log('blue', '\n[检查 2] 选项跳转目标存在性');
  const missingTargets = [];

  nodes.forEach(node => {
    // 检查 autoNextId
    if (node.autoNextId && !nodeIdSet.has(node.autoNextId)) {
      missingTargets.push({
        from: node.id,
        field: 'autoNextId',
        target: node.autoNextId
      });
    }

    // 检查 choices
    if (node.choices) {
      node.choices.forEach(choice => {
        if (!nodeIdSet.has(choice.nextNodeId)) {
          missingTargets.push({
            from: node.id,
            field: choice.id,
            target: choice.nextNodeId
          });
        }
      });
    }
  });

  if (missingTargets.length === 0) {
    log('green', '  ✅ 所有跳转目标存在');
    info.push({ check: '跳转目标存在性', status: 'PASS' });
  } else {
    log('red', `  ❌ 发现 ${missingTargets.length} 个缺失的跳转目标:`);
    missingTargets.slice(0, 5).forEach(m => {
      log('red', `     ${m.from} -> ${m.target}`);
    });
    if (missingTargets.length > 5) {
      log('red', `     ... 还有 ${missingTargets.length - 5} 个`);
    }
    errors.push({ type: 'missing_targets', items: missingTargets });
    info.push({ check: '跳转目标存在性', status: 'FAIL', count: missingTargets.length });
  }

  // ========== 3. 检查孤立节点 ==========
  log('blue', '\n[检查 3] 孤立节点检测');
  const referencedIds = new Set();
  const startNodeId = 'node_phase1_start';

  nodes.forEach(node => {
    if (node.autoNextId) {
      referencedIds.add(node.autoNextId);
    }
    if (node.choices) {
      node.choices.forEach(choice => {
        referencedIds.add(choice.nextNodeId);
      });
    }
  });

  const orphanNodes = [];
  nodes.forEach(node => {
    // 起始节点不算孤立
    if (node.id === startNodeId) return;
    // ending 类型节点允许不被引用（它们是终点）
    if (node.type === 'ending') return;
    // 有 characterRestrictions 的是角色专属节点，通过条件触发
    if (node.characterRestrictions && node.characterRestrictions.length > 0) return;

    if (!referencedIds.has(node.id)) {
      orphanNodes.push(node.id);
    }
  });

  if (orphanNodes.length === 0) {
    log('green', '  ✅ 无孤立节点');
    info.push({ check: '孤立节点检测', status: 'PASS' });
  } else {
    log('yellow', `  ⚠️ 发现 ${orphanNodes.length} 个孤立节点（可能需要从主线触发）:`);
    orphanNodes.slice(0, 5).forEach(id => {
      log('yellow', `     ${id}`);
    });
    warnings.push({ type: 'orphan_nodes', ids: orphanNodes });
    info.push({ check: '孤立节点检测', status: 'WARN', count: orphanNodes.length });
  }

  // ========== 4. 检查角色初始属性范围 ==========
  log('blue', '\n[检查 4] 角色初始属性范围 (0-100)');
  const characters = data.characters || [];
  const invalidAttributes = [];

  characters.forEach(char => {
    if (!char.attributes) return;
    const attrs = ['genjiao', 'qiyun', 'daohang', 'shengwang', 'xinxing'];
    attrs.forEach(attr => {
      if (char.attributes[attr]) {
        const { min, max, default: def } = char.attributes[attr];
        if (min < 0 || min > 100) {
          invalidAttributes.push({ char: char.id, attr, field: 'min', value: min });
        }
        if (max < 0 || max > 100) {
          invalidAttributes.push({ char: char.id, attr, field: 'max', value: max });
        }
        if (def < 0 || def > 100) {
          invalidAttributes.push({ char: char.id, attr, field: 'default', value: def });
        }
        if (min > max) {
          invalidAttributes.push({ char: char.id, attr, field: 'min>max', value: `${min}>${max}` });
        }
      }
    });
  });

  if (invalidAttributes.length === 0) {
    log('green', '  ✅ 所有角色初始属性在有效范围内');
    info.push({ check: '角色属性范围', status: 'PASS', count: characters.length });
  } else {
    log('red', `  ❌ 发现 ${invalidAttributes.length} 个无效属性值:`);
    invalidAttributes.forEach(item => {
      log('red', `     ${item.char}.${item.attr}.${item.field} = ${item.value}`);
    });
    errors.push({ type: 'invalid_attributes', items: invalidAttributes });
    info.push({ check: '角色属性范围', status: 'FAIL', count: invalidAttributes.length });
  }

  // ========== 5. 检查选项效果是否会导致属性越界 ==========
  log('blue', '\n[检查 5] 选项效果属性越界检查');
  const overflowEffects = [];

  nodes.forEach(node => {
    if (!node.choices) return;
    node.choices.forEach(choice => {
      if (!choice.effects) return;
      choice.effects.forEach(effect => {
        if (effect.type === 'attribute_change' && typeof effect.value === 'number') {
          // 检查是否有极端值（超过 ±50 可能导致越界）
          if (Math.abs(effect.value) > 50) {
            overflowEffects.push({
              node: node.id,
              choice: choice.id,
              attr: effect.target,
              value: effect.value
            });
          }
        }
      });
    });
    // 也检查节点的自动效果
    if (node.effects) {
      node.effects.forEach(effect => {
        if (effect.type === 'attribute_change' && typeof effect.value === 'number') {
          if (Math.abs(effect.value) > 50) {
            overflowEffects.push({
              node: node.id,
              choice: 'auto',
              attr: effect.target,
              value: effect.value
            });
          }
        }
      });
    }
  });

  if (overflowEffects.length === 0) {
    log('green', '  ✅ 无极端属性变化（变化值均在 ±50 以内）');
    info.push({ check: '属性越界风险', status: 'PASS' });
  } else {
    log('yellow', `  ⚠️ 发现 ${overflowEffects.length} 个极端属性变化（可能越界）:`);
    overflowEffects.forEach(item => {
      log('yellow', `     ${item.node}/${item.choice}: ${item.attr} += ${item.value}`);
    });
    warnings.push({ type: 'overflow_effects', items: overflowEffects });
    info.push({ check: '属性越界风险', status: 'WARN', count: overflowEffects.length });
  }

  // ========== 6. 额外统计信息 ==========
  log('blue', '\n[统计信息]');

  // 按阶段统计
  const phaseCount = {};
  nodes.forEach(n => {
    phaseCount[n.phase] = (phaseCount[n.phase] || 0) + 1;
  });
  log('cyan', '  阶段分布:');
  const phaseNames = {
    'dragon_phoenix_war': '龙汉初劫',
    'luohuo_fall': '道魔之战',
    'hongjun_lecture': '紫霄宫讲道',
    'wu_yao_rise': '巫妖崛起',
    'wu_yao_final': '巫妖决战'
  };
  Object.entries(phaseCount).forEach(([phase, count]) => {
    log('cyan', `    ${phaseNames[phase] || phase}: ${count} 节点`);
  });

  // 角色专属节点统计
  let exclusiveCount = 0;
  characters.forEach(c => {
    if (c.exclusiveNodes) exclusiveCount += c.exclusiveNodes.length;
  });
  log('cyan', `  角色专属节点: ${exclusiveCount} 个`);

  // 结局统计
  const endingNodes = nodes.filter(n => n.type === 'ending');
  log('cyan', `  结局节点: ${endingNodes.length} 个`);

  // ========== 最终报告 ==========
  log('cyan', '\n╠════════════════════════════════════════════════════════╣');
  log('cyan', '║                     验证结果汇总                       ║');
  log('cyan', '╠════════════════════════════════════════════════════════╣');

  const passCount = info.filter(i => i.status === 'PASS').length;
  const warnCount = warnings.length;
  const failCount = errors.length;

  log('cyan', `║  检查项: ${info.length} 项                                          ║`);
  log('green', `║  ✅ 通过: ${passCount} 项                                          ║`);
  if (warnCount > 0) {
    log('yellow', `║  ⚠️  警告: ${warnCount} 项                                          ║`);
  }
  if (failCount > 0) {
    log('red', `║  ❌ 失败: ${failCount} 项                                          ║`);
  }
  log('cyan', '╠════════════════════════════════════════════════════════╣');

  if (errors.length === 0) {
    log('green', '║  🎉 验证通过！数据结构完整，可以正常使用。            ║');
    log('cyan', '╚════════════════════════════════════════════════════════╝');
    return { success: true, errors, warnings, info };
  } else {
    log('red', '║  ❌ 验证失败！请修复上述错误后重新验证。              ║');
    log('cyan', '╚════════════════════════════════════════════════════════╝');
    return { success: false, errors, warnings, info };
  }
}

// 主函数
function main() {
  const dataPath = path.join(__dirname, 'game_data_full.json');

  log('blue', `\n读取数据文件: ${dataPath}`);

  try {
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);

    log('green', '数据文件加载成功\n');

    const result = validateGameData(data);

    // 返回退出码
    process.exit(result.success ? 0 : 1);

  } catch (err) {
    log('red', `错误: ${err.message}`);
    process.exit(1);
  }
}

main();
