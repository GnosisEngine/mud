// resources/test/layer10.test.js
'use strict';

const assert = require('assert');
const GL = require('../lib/GatherLogic');
const RC = require('../lib/ResourceContainer');
const RD = require('../lib/ResourceDefinitions');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); passed++; }
  catch (e) { console.error('  \u2717 ' + name); console.error('    ' + e.message); failed++; }
}

function mockEntity(strength, resources) {
  strength = strength || 10;
  resources = resources || {};
  const store = { resources: Object.assign({}, resources) };
  return {
    getMeta: function(key) { return key.split('.').reduce(function(o,k){ return o != null ? o[k] : undefined; }, store); },
    setMeta: function(key, val) {
      const parts = key.split('.');
      let cur = store;
      for (let i = 0; i < parts.length - 1; i++) { if (cur[parts[i]] == null) cur[parts[i]] = {}; cur = cur[parts[i]]; }
      cur[parts[parts.length - 1]] = val;
    },
    getAttribute: function(attr) { return attr === 'strength' ? strength : 0; },
    skills: { has: function() { return true; } },
    effects: { hasEffect: function() { return true; } },
  };
}

function mockRoom() { return { id: 'test:room' }; }

function mockResourceNode(resourceKey, keywords, materials) {
  const store = {
    resource: {
      resourceKey: resourceKey,
      materials: materials || {},
      depletedMessage: 'withers away.',
    },
  };
  return {
    name: resourceKey,
    type: 'RESOURCE',
    keywords: keywords || [],
    getMeta: function(key) { return store[key]; },
    setMeta: function(key, val) { store[key] = val; },
  };
}

console.log('\nLayer 10 - GatherLogic expiry wiring\n');

console.log('perishable resources');

test('perishable resource gets expiry ticks stored on gatherer', function() {
  const player = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 4, max: 4 } });
  GL.execute(player, mockRoom(), 'honey', { roomItems: [node], currentTick: 1000 });
  const ticks = RC.getHeld(player).honey;
  const expectedExpiry = 1000 + RD.getRotTicks('honey');
  assert.ok(Array.isArray(ticks));
  assert.strictEqual(ticks.length, 4);
  assert.ok(ticks.every(t => t === expectedExpiry));
});

test('expiresAt is currentTick + rotTicks for clay resource', function() {
  const player = mockEntity();
  const node = mockResourceNode('clay', ['clay'], { clay: { min: 2, max: 2 } });
  GL.execute(player, mockRoom(), 'clay', { roomItems: [node], currentTick: 500 });
  const ticks = RC.getHeld(player).clay;
  const expectedExpiry = 500 + RD.getRotTicks('clay');
  assert.ok(ticks.every(t => t === expectedExpiry));
});

test('two separate gathers at different ticks store independent expiries', function() {
  const player = mockEntity();
  const node1 = mockResourceNode('honey', ['honey1'], { honey: { min: 1, max: 1 } });
  const node2 = mockResourceNode('honey', ['honey2'], { honey: { min: 1, max: 1 } });
  GL.execute(player, mockRoom(), 'honey1', { roomItems: [node1], currentTick: 1000 });
  GL.execute(player, mockRoom(), 'honey2', { roomItems: [node2], currentTick: 1060 });
  const ticks = RC.getHeld(player).honey.slice().sort((a, b) => a - b);
  assert.strictEqual(ticks.length, 2);
  assert.strictEqual(ticks[0], 1000 + RD.getRotTicks('honey'));
  assert.strictEqual(ticks[1], 1060 + RD.getRotTicks('honey'));
});

test('expiry tick count matches amount added to gatherer', function() {
  const player = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 1, max: 1 } });
  GL.execute(player, mockRoom(), 'honey', { roomItems: [node], currentTick: 1000 });
  assert.strictEqual(RC.getHeld(player).honey.length, RC.getAmount(player, 'honey'));
});

console.log('\nnon-perishable resources');

test('non-perishable resource stored as plain number, not array', function() {
  const player = mockEntity();
  const node = mockResourceNode('alluvial_gold', ['gold'], { alluvial_gold: { min: 5, max: 5 } });
  GL.execute(player, mockRoom(), 'gold', { roomItems: [node], currentTick: 1000 });
  assert.strictEqual(typeof RC.getHeld(player).alluvial_gold, 'number');
  assert.strictEqual(RC.getAmount(player, 'alluvial_gold'), 5);
});

test('non-perishable resource has no expiry array', function() {
  const player = mockEntity();
  const node = mockResourceNode('rock_salt', ['salt'], { rock_salt: { min: 3, max: 3 } });
  GL.execute(player, mockRoom(), 'salt', { roomItems: [node], currentTick: 1000 });
  assert.strictEqual(typeof RC.getHeld(player).rock_salt, 'number');
});

console.log('\nmissing currentTick');

test('missing currentTick does not throw', function() {
  const player = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 2, max: 2 } });
  assert.doesNotThrow(function() {
    GL.execute(player, mockRoom(), 'honey', { roomItems: [node] });
  });
});

test('perishable not added to inventory when currentTick missing', function() {
  const player = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 2, max: 2 } });
  GL.execute(player, mockRoom(), 'honey', { roomItems: [node] });
  assert.strictEqual(RC.getAmount(player, 'honey'), 0);
});

test('null currentTick also skips perishable', function() {
  const player = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 2, max: 2 } });
  GL.execute(player, mockRoom(), 'honey', { roomItems: [node], currentTick: null });
  assert.strictEqual(RC.getAmount(player, 'honey'), 0);
});

test('non-perishable still added even without currentTick', function() {
  const player = mockEntity();
  const node = mockResourceNode('alluvial_gold', ['gold'], { alluvial_gold: { min: 3, max: 3 } });
  GL.execute(player, mockRoom(), 'gold', { roomItems: [node] });
  assert.strictEqual(RC.getAmount(player, 'alluvial_gold'), 3);
});

console.log('\nsplit recipients');

test('split recipient gets expiry ticks for their share', function() {
  const player = mockEntity();
  const recipient = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 10, max: 10 } });
  GL.execute(player, mockRoom(), 'honey', {
    roomItems: [node],
    currentTick: 500,
    splitResolver: function() { return [{ entity: recipient, percentage: 0.5 }]; },
  });
  const ticks = RC.getHeld(recipient).honey;
  const expectedExpiry = 500 + RD.getRotTicks('honey');
  assert.ok(Array.isArray(ticks));
  assert.ok(ticks.every(t => t === expectedExpiry));
});

test('gatherer and recipient expiry ticks are identical', function() {
  const player = mockEntity();
  const recipient = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 10, max: 10 } });
  GL.execute(player, mockRoom(), 'honey', {
    roomItems: [node],
    currentTick: 500,
    splitResolver: function() { return [{ entity: recipient, percentage: 0.5 }]; },
  });
  const pTick = RC.getHeld(player).honey[0];
  const rTick = RC.getHeld(recipient).honey[0];
  assert.strictEqual(pTick, rTick);
});

test('expiry tick counts across all recipients sum to total gathered', function() {
  const player = mockEntity();
  const recipient = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 10, max: 10 } });
  GL.execute(player, mockRoom(), 'honey', {
    roomItems: [node],
    currentTick: 500,
    splitResolver: function() { return [{ entity: recipient, percentage: 0.5 }]; },
  });
  assert.strictEqual(RC.getAmount(player, 'honey') + RC.getAmount(recipient, 'honey'), 10);
});

console.log('\noverflow to room');

test('overflow to room does not add perishable to gatherer', function() {
  const player = mockEntity(1);
  RC.add(player, 'alluvial_gold', Math.floor(10 / 1.4));
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 10, max: 10 } });
  const drops = [];
  GL.execute(player, mockRoom(), 'honey', {
    roomItems: [node],
    currentTick: 1000,
    roomDropper: function(r, key, amt) { drops.push({ key, amt }); },
  });
  assert.ok(drops.length > 0);
  assert.strictEqual(RC.getAmount(player, 'honey'), 0);
});

console.log('\nexecute result');

test('execute result includes allocation array', function() {
  const player = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 3, max: 3 } });
  const result = GL.execute(player, mockRoom(), 'honey', {
    roomItems: [node],
    currentTick: 1000,
  });
  assert.ok(result.ok);
  assert.ok(Array.isArray(result.allocation));
  assert.strictEqual(result.allocation.length, 1);
  assert.strictEqual(result.allocation[0].entity, player);
  assert.strictEqual(result.allocation[0].amounts.honey, 3);
});

console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed > 0 ? 1 : 0);
