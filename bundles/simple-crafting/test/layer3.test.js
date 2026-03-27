// resources/test/layer3.test.js
'use strict';

const assert = require('assert');
const RV = require('../lib/ResourceVisibility');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); passed++; }
  catch (e) { console.error('  \u2717 ' + name); console.error('    ' + e.message); failed++; }
}

function mockPlayer(opts) {
  opts = opts || {};
  return {
    skills: { has: function(s) { return (opts.skills || []).includes(s); } },
    effects: { hasEffect: function(e) { return (opts.effects || []).includes(e); } }
  };
}

function mockNode(opts) {
  opts = opts || {};
  const store = opts.isResourceNode !== false
    ? { resource: opts.resourceKey ? { resourceKey: opts.resourceKey } : {} }
    : {};
  return { getMeta: function(key) { return store[key]; } };
}

function mockNonResourceItem() {
  return { getMeta: function() { return undefined; } };
}

console.log('\nLayer 3 - ResourceVisibility\n');
console.log('canSeeNode - non-resource items');

test('non-resource item is always visible', function() {
  assert.strictEqual(RV.canSeeNode(mockPlayer(), mockNonResourceItem()), true);
});

test('resource node with no resourceKey is always visible', function() {
  assert.strictEqual(RV.canSeeNode(mockPlayer(), mockNode({ resourceKey: null })), true);
});

test('resource node with unknown resourceKey is visible', function() {
  assert.strictEqual(RV.canSeeNode(mockPlayer(), mockNode({ resourceKey: 'ancient_artifact_xyz' })), true);
});

console.log('\ncanSeeNode - no requirements');

test('alluvial_gold (no requirements) visible to any player', function() {
  assert.strictEqual(RV.canSeeNode(mockPlayer(), mockNode({ resourceKey: 'alluvial_gold' })), true);
});

test('honey (no requirements) visible to any player', function() {
  assert.strictEqual(RV.canSeeNode(mockPlayer(), mockNode({ resourceKey: 'honey' })), true);
});

console.log('\ncanSeeNode - skill requirements');

test('argentite hidden from player without mining skill', function() {
  assert.strictEqual(RV.canSeeNode(mockPlayer({ skills: [] }), mockNode({ resourceKey: 'argentite' })), false);
});

test('argentite visible to player with mining skill', function() {
  assert.strictEqual(RV.canSeeNode(mockPlayer({ skills: ['mining'] }), mockNode({ resourceKey: 'argentite' })), true);
});

test('argentite hidden from player with unrelated skill', function() {
  assert.strictEqual(RV.canSeeNode(mockPlayer({ skills: ['herbalism'] }), mockNode({ resourceKey: 'argentite' })), false);
});

test('medicinal_herbs hidden from player without herbalism skill', function() {
  assert.strictEqual(RV.canSeeNode(mockPlayer({ skills: [] }), mockNode({ resourceKey: 'medicinal_herbs' })), false);
});

test('medicinal_herbs visible to player with herbalism skill', function() {
  assert.strictEqual(RV.canSeeNode(mockPlayer({ skills: ['herbalism'] }), mockNode({ resourceKey: 'medicinal_herbs' })), true);
});

console.log('\ncanSeeNode - missing player collections');

test('player with null skills cannot see skill-gated node', function() {
  const player = { skills: null, effects: { hasEffect: function() { return false; } } };
  assert.strictEqual(RV.canSeeNode(player, mockNode({ resourceKey: 'argentite' })), false);
});

test('player with undefined skills cannot see skill-gated node', function() {
  const player = { effects: { hasEffect: function() { return false; } } };
  assert.strictEqual(RV.canSeeNode(player, mockNode({ resourceKey: 'argentite' })), false);
});

console.log('\nfilterVisibleNodes');

test('returns all items when no resource nodes present', function() {
  const items = [mockNonResourceItem(), mockNonResourceItem()];
  assert.strictEqual(RV.filterVisibleNodes(mockPlayer(), items).length, 2);
});

test('passes through non-resource items regardless of player skills', function() {
  const item = mockNonResourceItem();
  const result = RV.filterVisibleNodes(mockPlayer(), [item]);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0], item);
});

test('filters out hidden resource nodes while keeping visible ones', function() {
  const player = mockPlayer({ skills: ['mining'] });
  const visibleNode = mockNode({ resourceKey: 'argentite' });
  const hiddenNode = mockNode({ resourceKey: 'medicinal_herbs' });
  const normalItem = mockNonResourceItem();
  const result = RV.filterVisibleNodes(player, [visibleNode, hiddenNode, normalItem]);
  assert.strictEqual(result.length, 2);
  assert.ok(result.includes(visibleNode));
  assert.ok(result.includes(normalItem));
  assert.ok(!result.includes(hiddenNode));
});

test('returns empty array when all nodes are hidden', function() {
  const player = mockPlayer();
  const result = RV.filterVisibleNodes(player, [
    mockNode({ resourceKey: 'argentite' }),
    mockNode({ resourceKey: 'medicinal_herbs' })
  ]);
  assert.strictEqual(result.length, 0);
});

test('returns all nodes when player meets all requirements', function() {
  const player = mockPlayer({ skills: ['mining', 'herbalism'] });
  const result = RV.filterVisibleNodes(player, [
    mockNode({ resourceKey: 'argentite' }),
    mockNode({ resourceKey: 'medicinal_herbs' }),
    mockNode({ resourceKey: 'alluvial_gold' }),
    mockNonResourceItem()
  ]);
  assert.strictEqual(result.length, 4);
});

test('does not mutate the original roomItems array', function() {
  const items = [mockNode({ resourceKey: 'argentite' }), mockNonResourceItem()];
  RV.filterVisibleNodes(mockPlayer(), items);
  assert.strictEqual(items.length, 2);
});

test('empty roomItems returns empty array without throwing', function() {
  assert.deepStrictEqual(RV.filterVisibleNodes(mockPlayer(), []), []);
});

console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed > 0 ? 1 : 0);