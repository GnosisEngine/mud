// resources/test/layer10.test.js
'use strict';

const assert = require('assert');
const GL = require('../lib/GatherLogic');
const RC = require('../lib/ResourceContainer');
const RR = require('../lib/ResourceRot');
const RD = require('../lib/ResourceDefinitions');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  \u2713 ' + name);
    passed++;
  } catch (e) {
    console.error('  \u2717 ' + name);
    console.error('    ' + e.message);
    failed++;
  }
}

function mockEntity(strength, resources) {
  strength = strength || 10;
  resources = resources || {};
  const store = { resources: Object.assign({}, resources) };
  return {
    getMeta: function(key) {
      return key.split('.').reduce(function(o, k) { return o != null ? o[k] : undefined; }, store);
    },
    setMeta: function(key, val) {
      const parts = key.split('.');
      let cur = store;
      for (let i = 0; i < parts.length - 1; i++) {
        if (cur[parts[i]] == null) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = val;
    },
    getAttribute: function(attr) {
      return attr === 'strength' ? strength : 0;
    },
    skills: { has: function() { return true; } },
    effects: { hasEffect: function() { return true; } },
  };
}

function mockRoom() {
  return { id: 'test:room' };
}

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

console.log('\nLayer 10 - GatherLogic rot entry wiring\n');

console.log('perishable resources');

test('perishable resource gets rot entry on gatherer', function() {
  const player = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 4, max: 4 } });
  GL.execute(player, mockRoom(), 'honey', { roomItems: [node], currentTick: 1000 });
  const entries = RR.getRotEntries(player);
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].key, 'honey');
  assert.strictEqual(entries[0].amount, 4);
  assert.strictEqual(entries[0].expiresAt, 1000 + RD.getRotTicks('honey'));
});

test('expiresAt is currentTick + rotTicks for clay resource', function() {
  const player = mockEntity();
  const node = mockResourceNode('clay', ['clay'], { clay: { min: 2, max: 2 } });
  GL.execute(player, mockRoom(), 'clay', { roomItems: [node], currentTick: 500 });
  const entries = RR.getRotEntries(player);
  assert.strictEqual(entries[0].expiresAt, 500 + RD.getRotTicks('clay'));
});

test('two separate gathers create two independent rot entries', function() {
  const player = mockEntity();
  const node1 = mockResourceNode('honey', ['honey1'], { honey: { min: 1, max: 1 } });
  const node2 = mockResourceNode('honey', ['honey2'], { honey: { min: 1, max: 1 } });
  GL.execute(player, mockRoom(), 'honey1', { roomItems: [node1], currentTick: 1000 });
  GL.execute(player, mockRoom(), 'honey2', { roomItems: [node2], currentTick: 1060 });
  const entries = RR.getRotEntries(player);
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[0].expiresAt, 1000 + RD.getRotTicks('honey'));
  assert.strictEqual(entries[1].expiresAt, 1060 + RD.getRotTicks('honey'));
});

test('rot entry amount matches what was actually added to gatherer', function() {
  const player = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 1, max: 1 } });
  GL.execute(player, mockRoom(), 'honey', { roomItems: [node], currentTick: 1000 });
  const entries = RR.getRotEntries(player);
  assert.strictEqual(entries[0].amount, RC.getHeld(player).honey);
});

console.log('\nnon-perishable resources');

test('non-perishable resource gets no rot entry', function() {
  const player = mockEntity();
  const node = mockResourceNode('alluvial_gold', ['gold'], { alluvial_gold: { min: 5, max: 5 } });
  GL.execute(player, mockRoom(), 'gold', { roomItems: [node], currentTick: 1000 });
  assert.strictEqual(RR.getRotEntries(player).length, 0);
});

test('iron_ore gets no rot entry', function() {
  const player = mockEntity();
  const node = mockResourceNode('alluvial_gold', ['iron'], { alluvial_gold: { min: 3, max: 3 } });
  GL.execute(player, mockRoom(), 'iron', { roomItems: [node], currentTick: 1000 });
  assert.strictEqual(RR.getRotEntries(player).length, 0);
});

test('silver_coin gets no rot entry', function() {
  const player = mockEntity();
  const node = mockResourceNode('alluvial_gold', ['silver'], { alluvial_gold: { min: 10, max: 10 } });
  GL.execute(player, mockRoom(), 'silver', { roomItems: [node], currentTick: 1000 });
  assert.strictEqual(RR.getRotEntries(player).length, 0);
});

console.log('\nmissing currentTick');

test('missing currentTick skips rot entry creation without throwing', function() {
  const player = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 2, max: 2 } });
  assert.doesNotThrow(function() {
    GL.execute(player, mockRoom(), 'honey', { roomItems: [node] });
  });
  assert.strictEqual(RR.getRotEntries(player).length, 0);
});

test('null currentTick also skips rot entry creation', function() {
  const player = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 2, max: 2 } });
  GL.execute(player, mockRoom(), 'honey', { roomItems: [node], currentTick: null });
  assert.strictEqual(RR.getRotEntries(player).length, 0);
});

test('resources still added to inventory even when currentTick missing', function() {
  const player = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 3, max: 3 } });
  GL.execute(player, mockRoom(), 'honey', { roomItems: [node] });
  assert.strictEqual(RC.getHeld(player).honey, 3);
});

console.log('\nsplit recipients');

test('split recipient gets rot entry for their share', function() {
  const player = mockEntity();
  const recipient = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 10, max: 10 } });
  GL.execute(player, mockRoom(), 'honey', {
    roomItems: [node],
    currentTick: 500,
    splitResolver: function() { return [{ entity: recipient, percentage: 0.5 }]; },
  });
  const recipientEntries = RR.getRotEntries(recipient);
  assert.strictEqual(recipientEntries.length, 1);
  assert.strictEqual(recipientEntries[0].key, 'honey');
  assert.strictEqual(recipientEntries[0].expiresAt, 500 + RD.getRotTicks('honey'));
});

test('both gatherer and recipient rot entries use same expiresAt', function() {
  const player = mockEntity();
  const recipient = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 10, max: 10 } });
  GL.execute(player, mockRoom(), 'honey', {
    roomItems: [node],
    currentTick: 500,
    splitResolver: function() { return [{ entity: recipient, percentage: 0.5 }]; },
  });
  const pEntry = RR.getRotEntries(player)[0];
  const rEntry = RR.getRotEntries(recipient)[0];
  assert.strictEqual(pEntry.expiresAt, rEntry.expiresAt);
});

test('rot entry amounts across all recipients sum to total gathered', function() {
  const player = mockEntity();
  const recipient = mockEntity();
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 10, max: 10 } });
  GL.execute(player, mockRoom(), 'honey', {
    roomItems: [node],
    currentTick: 500,
    splitResolver: function() { return [{ entity: recipient, percentage: 0.5 }]; },
  });
  const pAmt = RR.getRotEntries(player)[0].amount;
  const rAmt = RR.getRotEntries(recipient)[0].amount;
  assert.strictEqual(pAmt + rAmt, 10);
});

console.log('\noverflow to room');

test('overflow to room does not get rot entry on gatherer', function() {
  const player = mockEntity(1);
  const capacity = 1 * 10;
  RC.add(player, 'alluvial_gold', Math.floor(capacity / 1.4));
  const node = mockResourceNode('honey', ['honey'], { honey: { min: 10, max: 10 } });
  const drops = [];
  GL.execute(player, mockRoom(), 'honey', {
    roomItems: [node],
    currentTick: 1000,
    roomDropper: function(r, key, amt) { drops.push({ key: key, amt: amt }); },
  });
  assert.ok(drops.length > 0);
  assert.strictEqual(RR.getRotEntries(player).length, 0);
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