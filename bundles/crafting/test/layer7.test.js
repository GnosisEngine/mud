// resources/test/layer7.test.js
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const RC = require('../lib/ResourceContainer');
const GL = require('../lib/GatherLogic');
const TL = require('../lib/TradeLogic');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

function mockEntity(strength = 10, resources = {}) {
  const store = { resources: { ...resources } };
  return {
    getMeta(key) {
      return key.split('.').reduce((o, k) => (o != null ? o[k] : undefined), store);
    },
    setMeta(key, val) {
      const parts = key.split('.');
      let cur = store;
      for (let i = 0; i < parts.length - 1; i++) {
        if (cur[parts[i]] == null) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = val;
    },
    getAttribute(attr) {
      return attr === 'strength' ? strength : 0;
    },
  };
}

function mockRoom() {
  return { id: 'test:room' };
}

function mockResourceNode(resourceKey, keywords = [], materials = {}) {
  const store = {
    resource: {
      resourceKey,
      materials,
      depletedMessage: 'withers away.',
    },
  };
  return {
    name: resourceKey,
    type: 'RESOURCE',
    keywords,
    getMeta(key) { return store[key]; },
    setMeta(key, val) { store[key] = val; },
  };
}

function mockPlayer(opts = {}) {
  const entity = mockEntity(opts.strength || 10, opts.resources || {});
  return Object.assign(entity, {
    skills: { has: s => (opts.skills || []).includes(s) },
    effects: { hasEffect: e => (opts.effects || []).includes(e) },
  });
}

// ─── GatherLogic.findNode ─────────────────────────────────────────────────────

console.log('\nLayer 7 — Commands\n');
console.log('GatherLogic.findNode');

test('returns null for empty args', () => {
  const items = [mockResourceNode('alluvial_gold', ['gold', 'alluvial'])];
  assert.strictEqual(GL.findNode('', items), null);
  assert.strictEqual(GL.findNode(null, items), null);
});

test('returns null when keyword does not match', () => {
  const items = [mockResourceNode('alluvial_gold', ['gold', 'alluvial'])];
  assert.strictEqual(GL.findNode('rock', items), null);
});

test('finds node by keyword match', () => {
  const node = mockResourceNode('alluvial_gold', ['gold', 'alluvial']);
  const result = GL.findNode('gold', [node]);
  assert.strictEqual(result, node);
});

test('ignores non-RESOURCE items', () => {
  const sword = { type: 'WEAPON', keywords: ['sword'] };
  const node = mockResourceNode('alluvial_gold', ['plant']);
  assert.strictEqual(GL.findNode('sword', [sword]), null);
  assert.strictEqual(GL.findNode('plant', [sword, node]), node);
});

test('keyword match is case-insensitive', () => {
  const node = mockResourceNode('alluvial_gold', ['Plant', 'Material']);
  assert.ok(GL.findNode('plant', [node]));
  assert.ok(GL.findNode('PLANT', [node]));
});

// ─── GatherLogic.rollYield ────────────────────────────────────────────────────

console.log('\nGatherLogic.rollYield');

test('returns empty object for node with no materials', () => {
  const node = mockResourceNode('alluvial_gold', [], {});
  assert.deepStrictEqual(GL.rollYield(node), {});
});

test('returns empty object for node with no resource meta', () => {
  const node = { getMeta: () => undefined };
  assert.deepStrictEqual(GL.rollYield(node), {});
});

test('returns amounts within min/max range for each material', () => {
  const node = mockResourceNode('alluvial_gold', [], {
    alluvial_gold: { min: 2, max: 4 },
    honey:         { min: 1, max: 1 },
  });

  for (let i = 0; i < 30; i++) {
    const yields = GL.rollYield(node);
    if (yields.alluvial_gold !== undefined) {
      assert.ok(yields.alluvial_gold >= 2 && yields.alluvial_gold <= 4);
    }
    if (yields.honey !== undefined) {
      assert.ok(yields.honey === 1);
    }
  }
});

test('amounts are always integers', () => {
  const node = mockResourceNode('alluvial_gold', [], {
    alluvial_gold: { min: 1, max: 5 },
  });
  for (let i = 0; i < 20; i++) {
    const yields = GL.rollYield(node);
    for (const amount of Object.values(yields)) {
      assert.strictEqual(amount, Math.floor(amount));
    }
  }
});

// ─── GatherLogic.execute ──────────────────────────────────────────────────────

console.log('\nGatherLogic.execute');

test('returns no_args when args is empty', () => {
  const player = mockPlayer();
  const result = GL.execute(player, mockRoom(), '');
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'no_args');
});

test('returns not_found when node not in room', () => {
  const player = mockPlayer();
  const result = GL.execute(player, mockRoom(), 'rock', { roomItems: [] });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'not_found');
});

test('returns not_found when node exists but player cannot see it', () => {
  const player = mockPlayer({ skills: [] });
  const node = mockResourceNode('argentite', ['argentite', 'ore'], { argentite: { min: 1, max: 2 } });
  const store = node.getMeta('resource');
  store.resourceKey = 'argentite';
  const result = GL.execute(player, mockRoom(), 'iron', { roomItems: [node] });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'not_found');
});

test('successful gather returns ok:true with yields and node', () => {
  const player = mockPlayer();
  const node = mockResourceNode('alluvial_gold', ['gold'], {
    alluvial_gold: { min: 2, max: 2 },
  });
  let removed = false;
  const result = GL.execute(player, mockRoom(), 'gold', {
    roomItems: [node],
    removeNode: () => { removed = true; },
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.yields.alluvial_gold, 2);
  assert.strictEqual(result.node, node);
  assert.ok(removed);
});

test('resources are added to player on successful gather', () => {
  const player = mockPlayer();
  const node = mockResourceNode('alluvial_gold', ['gold'], {
    alluvial_gold: { min: 3, max: 3 },
  });
  GL.execute(player, mockRoom(), 'gold', { roomItems: [node] });
  assert.strictEqual(RC.getHeld(player).alluvial_gold, 3);
});

test('calls roomDropper when player is over capacity', () => {
  const player = mockPlayer({ strength: 1, resources: {} });
  const capacity = 1 * 10;
  RC.add(player, 'alluvial_gold', Math.floor(capacity / 1.4)); // fills to ~9.8kg

  const dropped = [];
  const node = mockResourceNode('alluvial_gold', ['gold'], {
    alluvial_gold: { min: 200, max: 200 },
  });
  GL.execute(player, mockRoom(), 'gold', {
    roomItems: [node],
    roomDropper: (room, key, amount) => dropped.push({ key, amount }),
  });
  assert.ok(dropped.length > 0);
  assert.strictEqual(dropped[0].key, 'alluvial_gold');
});

test('split resolver is called with room reference', () => {
  const player = mockPlayer();
  const room = mockRoom();
  const node = mockResourceNode('alluvial_gold', ['gold'], {
    alluvial_gold: { min: 4, max: 4 },
  });
  let resolverCalledWith = null;
  GL.execute(player, room, 'gold', {
    roomItems: [node],
    splitResolver: r => { resolverCalledWith = r; return null; },
  });
  assert.strictEqual(resolverCalledWith, room);
});

test('split distributes to recipients when resolver returns splits', () => {
  const player = mockPlayer();
  const recipient = mockPlayer();
  const room = mockRoom();
  const node = mockResourceNode('alluvial_gold', ['gold'], {
    alluvial_gold: { min: 10, max: 10 },
  });
  GL.execute(player, room, 'gold', {
    roomItems: [node],
    splitResolver: () => [{ entity: recipient, percentage: 0.5 }],
  });
  assert.strictEqual(RC.getHeld(player).alluvial_gold, 5);
  assert.strictEqual(RC.getHeld(recipient).alluvial_gold, 5);
});

test('node is removed after successful gather', () => {
  const player = mockPlayer();
  const node = mockResourceNode('alluvial_gold', ['gold'], {
    alluvial_gold: { min: 1, max: 1 },
  });
  let removed = null;
  GL.execute(player, mockRoom(), 'gold', {
    roomItems: [node],
    removeNode: n => { removed = n; },
  });
  assert.strictEqual(removed, node);
});

// ─── TradeLogic ───────────────────────────────────────────────────────────────

console.log('\nTradeLogic.initiate');

test('returns empty_offer for empty resourceMap', () => {
  TL.clearAll();
  const a = mockEntity(10, { alluvial_gold: 10 });
  const b = mockEntity(10);
  assert.strictEqual(TL.initiate(a, b, {}).reason, 'empty_offer');
});

test('returns insufficient when initiator lacks resource', () => {
  TL.clearAll();
  const a = mockEntity(10, { alluvial_gold: 2 });
  const b = mockEntity(10);
  const result = TL.initiate(a, b, { alluvial_gold: 5 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'insufficient');
  assert.strictEqual(result.key, 'alluvial_gold');
});

test('returns ok:true and sets pending when valid', () => {
  TL.clearAll();
  const a = mockEntity(10, { alluvial_gold: 10 });
  const b = mockEntity(10);
  const result = TL.initiate(a, b, { alluvial_gold: 5 }, { timeoutMs: 60000 });
  assert.strictEqual(result.ok, true);
  assert.ok(TL.hasPending(a, b));
  TL.clearAll();
});

test('returns trade_already_pending for duplicate initiation', () => {
  TL.clearAll();
  const a = mockEntity(10, { alluvial_gold: 10 });
  const b = mockEntity(10);
  TL.initiate(a, b, { alluvial_gold: 5 }, { timeoutMs: 60000 });
  const result = TL.initiate(a, b, { alluvial_gold: 3 }, { timeoutMs: 60000 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'trade_already_pending');
  TL.clearAll();
});

test('pending is symmetric — hasPending(a,b) equals hasPending(b,a)', () => {
  TL.clearAll();
  const a = mockEntity(10, { alluvial_gold: 10 });
  const b = mockEntity(10);
  TL.initiate(a, b, { alluvial_gold: 5 }, { timeoutMs: 60000 });
  assert.ok(TL.hasPending(a, b));
  assert.ok(TL.hasPending(b, a));
  TL.clearAll();
});

console.log('\nTradeLogic.accept');

test('returns no_pending_trade when nothing initiated', () => {
  TL.clearAll();
  const a = mockEntity(10);
  const b = mockEntity(10);
  assert.strictEqual(TL.accept(a, b).reason, 'no_pending_trade');
});

test('transfers resources on accept', () => {
  TL.clearAll();
  const a = mockEntity(10, { alluvial_gold: 10 });
  const b = mockEntity(10);
  TL.initiate(a, b, { alluvial_gold: 5 }, { timeoutMs: 60000 });
  const result = TL.accept(a, b);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(RC.getHeld(a).alluvial_gold, 5);
  assert.strictEqual(RC.getHeld(b).alluvial_gold, 5);
});

test('clears pending after accept', () => {
  TL.clearAll();
  const a = mockEntity(10, { alluvial_gold: 10 });
  const b = mockEntity(10);
  TL.initiate(a, b, { alluvial_gold: 5 }, { timeoutMs: 60000 });
  TL.accept(a, b);
  assert.ok(!TL.hasPending(a, b));
});

test('fails accept when recipient is over capacity', () => {
  TL.clearAll();
  const a = mockEntity(10, { alluvial_gold: 5 });
  const b = mockEntity(1);
  const capacity = 1 * 10;
  RC.add(b, 'alluvial_gold', Math.floor(capacity / 1.4));
  TL.initiate(a, b, { alluvial_gold: 5 }, { timeoutMs: 60000 });
  const result = TL.accept(a, b);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'over_capacity');
  assert.strictEqual(RC.getHeld(a).alluvial_gold, 5);
  TL.clearAll();
});

test('returns resourceMap in accept result', () => {
  TL.clearAll();
  const a = mockEntity(10, { alluvial_gold: 10 });
  const b = mockEntity(10);
  TL.initiate(a, b, { alluvial_gold: 3 }, { timeoutMs: 60000 });
  const result = TL.accept(a, b);
  assert.ok(result.resourceMap);
  assert.strictEqual(result.resourceMap.alluvial_gold, 3);
});

console.log('\nTradeLogic.reject');

test('returns no_pending_trade when nothing initiated', () => {
  TL.clearAll();
  const a = mockEntity(10);
  const b = mockEntity(10);
  assert.strictEqual(TL.reject(a, b).reason, 'no_pending_trade');
});

test('clears pending on reject without transferring', () => {
  TL.clearAll();
  const a = mockEntity(10, { alluvial_gold: 10 });
  const b = mockEntity(10);
  TL.initiate(a, b, { alluvial_gold: 5 }, { timeoutMs: 60000 });
  const result = TL.reject(a, b);
  assert.strictEqual(result.ok, true);
  assert.ok(!TL.hasPending(a, b));
  assert.strictEqual(RC.getHeld(a).alluvial_gold, 10);
  assert.deepStrictEqual(RC.getHeld(b), {});
});

console.log('\ncommand file shapes');

test('gather.js exports command function', () => {
  const src = fs.readFileSync(path.join(__dirname, '../commands/gather.js'), 'utf8');
  assert.ok(src.includes('command:') || src.includes('module.exports'));
  assert.ok(src.includes('GatherLogic'));
});

test('resources.js exports command function and aliases', () => {
  const src = fs.readFileSync(path.join(__dirname, '../commands/resources.js'), 'utf8');
  assert.ok(src.includes('aliases'));
  assert.ok(src.includes('ResourceContainer'));
});

test('trade.js exports usage and command function', () => {
  const src = fs.readFileSync(path.join(__dirname, '../commands/trade.js'), 'utf8');
  assert.ok(src.includes('usage:'));
  assert.ok(src.includes('TradeLogic'));
});

test('craft.js exports usage and command function using ResourceContainer.remove', () => {
  const src = fs.readFileSync(path.join(__dirname, '../commands/craft.js'), 'utf8');
  assert.ok(src.includes('usage:'));
  assert.ok(src.includes('ResourceContainer'));
  assert.ok(src.includes('.remove('));
});

test('returns insufficient for perishable when initiator lacks enough', () => {
  TL.clearAll();
  const a = mockEntity(10, { honey: [9999] });
  const b = mockEntity(10);
  const result = TL.initiate(a, b, { honey: 3 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'insufficient');
  assert.strictEqual(result.key, 'honey');
});

test('perishable trade transfers expiry ticks to recipient', () => {
  TL.clearAll();
  const a = mockEntity(10, { honey: [1000, 2000, 3000] });
  const b = mockEntity(10);
  TL.initiate(a, b, { honey: 2 }, { timeoutMs: 60000 });
  TL.accept(a, b);
  assert.strictEqual(RC.getAmount(a, 'honey'), 1);
  assert.strictEqual(RC.getAmount(b, 'honey'), 2);
  const bTicks = RC.getHeld(b).honey.slice().sort((x, y) => x - y);
  assert.deepStrictEqual(bTicks, [1000, 2000]);
  TL.clearAll();
});

console.log('\nTradeLogic timeout (async)');

async function runAsyncTests() {
  await testAsync('timeout clears pending and calls onTimeout', async () => {
    TL.clearAll();
    const a = mockEntity(10, { alluvial_gold: 10 });
    const b = mockEntity(10);
    let timedOut = false;
    TL.initiate(a, b, { alluvial_gold: 5 }, { timeoutMs: 50, onTimeout: () => { timedOut = true; } });
    assert.ok(TL.hasPending(a, b));
    await new Promise(r => setTimeout(r, 100));
    assert.ok(!TL.hasPending(a, b));
    assert.ok(timedOut);
    assert.strictEqual(RC.getHeld(a).alluvial_gold, 10);
    assert.deepStrictEqual(RC.getHeld(b), {});
  });

  await testAsync('accept after timeout returns no_pending_trade', async () => {
    TL.clearAll();
    const a = mockEntity(10, { alluvial_gold: 10 });
    const b = mockEntity(10);
    TL.initiate(a, b, { alluvial_gold: 5 }, { timeoutMs: 50 });
    await new Promise(r => setTimeout(r, 100));
    const result = TL.accept(a, b);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, 'no_pending_trade');
  });


  console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed\n');
  process.exit(failed > 0 ? 1 : 0);
}

runAsyncTests();