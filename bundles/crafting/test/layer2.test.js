// resources/test/layer2.test.js
'use strict';

const assert = require('assert');
const RC = require('../lib/ResourceContainer');
const { CARRY_MULTIPLIER } = RC;

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
    getMeta: function(key) { return key.split('.').reduce(function(o,k){ return o!=null?o[k]:undefined; }, store); },
    setMeta: function(key, val) {
      const parts = key.split('.');
      let cur = store;
      for (let i = 0; i < parts.length - 1; i++) { if (cur[parts[i]]==null) cur[parts[i]]= {}; cur=cur[parts[i]]; }
      cur[parts[parts.length-1]] = val;
    },
    getAttribute: function(attr) { return attr === 'strength' ? strength : 0; }
  };
}

// alluvial_gold: 1.4kg, no rot — lightweight non-perishable
// honey: 19.8kg, perishable — medium weight
// wool: 231kg — very heavy
// argentite: 3.8kg, mining skill required

console.log('\nLayer 2 - ResourceContainer\n');
console.log('getHeld');

test('returns empty object when no resources set', function() {
  assert.deepStrictEqual(RC.getHeld(mockEntity()), {});
});

test('returns copy not reference', function() {
  const e = mockEntity(10, { alluvial_gold: 5 });
  const held = RC.getHeld(e);
  held.alluvial_gold = 999;
  assert.strictEqual(RC.getHeld(e).alluvial_gold, 5);
});

console.log('\ngetTotalWeight');

test('zero for empty inventory', function() {
  assert.strictEqual(RC.getTotalWeight(mockEntity()), 0);
});

test('correctly sums weight across multiple resources', function() {
  const e = mockEntity(10, { alluvial_gold: 10, honey: 2 });
  const expected = (1.4 * 10) + (19.8 * 2);
  assert.ok(Math.abs(RC.getTotalWeight(e) - expected) < 0.0001);
});

console.log('\ncanAdd');

test('returns ok:true when under capacity', function() {
  assert.deepStrictEqual(RC.canAdd(mockEntity(10), 'alluvial_gold', 1), { ok: true });
});

test('returns over_capacity when weight would exceed strength * multiplier', function() {
  // wool is 231kg, strength=1 means capacity=10kg
  const result = RC.canAdd(mockEntity(1), 'wool', 1);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'over_capacity');
});

test('returns unknown_resource for invalid key', function() {
  const result = RC.canAdd(mockEntity(10), 'fake_thing', 1);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'unknown_resource');
});

test('returns invalid_amount for zero amount', function() {
  const result = RC.canAdd(mockEntity(10), 'alluvial_gold', 0);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'invalid_amount');
});

test('returns invalid_amount for negative amount', function() {
  const result = RC.canAdd(mockEntity(10), 'alluvial_gold', -5);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'invalid_amount');
});

test('exactly at capacity returns ok:true', function() {
  // alluvial_gold: 1.4kg. strength=5 → capacity=50kg. 50/1.4=35.71... not exact.
  // Use strength=7 → capacity=70. 70/1.4=50 exactly.
  const e = mockEntity(7);
  const exactAmount = 50; // 50 * 1.4 = 70kg = capacity
  assert.deepStrictEqual(RC.canAdd(e, 'alluvial_gold', exactAmount), { ok: true });
});

test('one unit over capacity returns over_capacity', function() {
  const e = mockEntity(7);
  const overAmount = 51; // 51 * 1.4 = 71.4kg > 70kg capacity
  const result = RC.canAdd(e, 'alluvial_gold', overAmount);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'over_capacity');
});

console.log('\nadd');

test('adds resource to empty inventory', function() {
  const e = mockEntity();
  RC.add(e, 'alluvial_gold', 3);
  assert.strictEqual(RC.getHeld(e).alluvial_gold, 3);
});

test('accumulates on top of existing amount', function() {
  const e = mockEntity(10, { alluvial_gold: 5 });
  RC.add(e, 'alluvial_gold', 3);
  assert.strictEqual(RC.getHeld(e).alluvial_gold, 8);
});

test('returns ok:true on success', function() {
  assert.deepStrictEqual(RC.add(mockEntity(), 'alluvial_gold', 10), { ok: true });
});

test('returns failure and does not mutate on over_capacity', function() {
  const e = mockEntity(1); // capacity=10, wool=231kg
  const result = RC.add(e, 'wool', 1);
  assert.strictEqual(result.ok, false);
  assert.deepStrictEqual(RC.getHeld(e), {});
});

console.log('\nremove');

test('removes correct amount', function() {
  const e = mockEntity(10, { alluvial_gold: 10 });
  RC.remove(e, 'alluvial_gold', 4);
  assert.strictEqual(RC.getHeld(e).alluvial_gold, 6);
});

test('removes key entirely when amount reaches zero', function() {
  const e = mockEntity(10, { alluvial_gold: 5 });
  RC.remove(e, 'alluvial_gold', 5);
  assert.ok(!('alluvial_gold' in RC.getHeld(e)));
});

test('returns insufficient when not enough held', function() {
  const e = mockEntity(10, { alluvial_gold: 2 });
  const result = RC.remove(e, 'alluvial_gold', 5);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'insufficient');
});

test('does not mutate on insufficient', function() {
  const e = mockEntity(10, { alluvial_gold: 2 });
  RC.remove(e, 'alluvial_gold', 5);
  assert.strictEqual(RC.getHeld(e).alluvial_gold, 2);
});

test('returns unknown_resource for invalid key', function() {
  const result = RC.remove(mockEntity(), 'ghost', 1);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'unknown_resource');
});

test('returns invalid_amount for zero', function() {
  const e = mockEntity(10, { alluvial_gold: 5 });
  const result = RC.remove(e, 'alluvial_gold', 0);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'invalid_amount');
});

console.log('\ntransfer - atomicity');

test('transfers resources from one entity to another', function() {
  const from = mockEntity(10, { alluvial_gold: 10 });
  const to = mockEntity(10);
  RC.transfer(from, to, { alluvial_gold: 5 });
  assert.strictEqual(RC.getHeld(from).alluvial_gold, 5);
  assert.strictEqual(RC.getHeld(to).alluvial_gold, 5);
});

test('transfers multiple resource types atomically', function() {
  const from = mockEntity(10, { alluvial_gold: 10, honey: 3 });
  const to = mockEntity(10);
  const result = RC.transfer(from, to, { alluvial_gold: 3, honey: 1 });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(RC.getHeld(from).alluvial_gold, 7);
  assert.strictEqual(RC.getHeld(from).honey, 2);
  assert.strictEqual(RC.getHeld(to).alluvial_gold, 3);
  assert.strictEqual(RC.getHeld(to).honey, 1);
});

test('does not mutate either entity when from has insufficient', function() {
  const from = mockEntity(10, { alluvial_gold: 2 });
  const to = mockEntity(10);
  const result = RC.transfer(from, to, { alluvial_gold: 5 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'insufficient');
  assert.strictEqual(RC.getHeld(from).alluvial_gold, 2);
  assert.deepStrictEqual(RC.getHeld(to), {});
});

test('does not mutate either entity when to is over capacity', function() {
  const from = mockEntity(10, { wool: 1 });
  const to = mockEntity(1); // capacity=10, wool=231kg
  const result = RC.transfer(from, to, { wool: 1 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'over_capacity');
  assert.strictEqual(RC.getHeld(from).wool, 1);
  assert.deepStrictEqual(RC.getHeld(to), {});
});

test('partial failure in multi-resource map leaves both entities unchanged', function() {
  const from = mockEntity(10, { alluvial_gold: 10, honey: 1 });
  const to = mockEntity(10);
  const result = RC.transfer(from, to, { alluvial_gold: 5, honey: 5 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'insufficient');
  assert.strictEqual(RC.getHeld(from).alluvial_gold, 10);
  assert.strictEqual(RC.getHeld(from).honey, 1);
  assert.deepStrictEqual(RC.getHeld(to), {});
});

test('returns unknown_resource for invalid key in map', function() {
  const from = mockEntity(10, { alluvial_gold: 5 });
  const result = RC.transfer(from, mockEntity(10), { ghost: 1 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'unknown_resource');
});

console.log('\nsteal');

test('transfers resource from victim to thief', function() {
  const thief = mockEntity(10);
  const victim = mockEntity(10, { alluvial_gold: 20 });
  const result = RC.steal(thief, victim, 'alluvial_gold', 8);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(RC.getHeld(thief).alluvial_gold, 8);
  assert.strictEqual(RC.getHeld(victim).alluvial_gold, 12);
});

test('fails if victim does not have enough', function() {
  const thief = mockEntity(10);
  const victim = mockEntity(10, { alluvial_gold: 3 });
  const result = RC.steal(thief, victim, 'alluvial_gold', 10);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'insufficient');
  assert.deepStrictEqual(RC.getHeld(thief), {});
  assert.strictEqual(RC.getHeld(victim).alluvial_gold, 3);
});

test('fails if thief cannot carry', function() {
  const thief = mockEntity(1); // capacity=10kg, wool=231kg
  const victim = mockEntity(10, { wool: 5 });
  const result = RC.steal(thief, victim, 'wool', 1);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'over_capacity');
  assert.deepStrictEqual(RC.getHeld(thief), {});
  assert.strictEqual(RC.getHeld(victim).wool, 5);
});

test('returns unknown_resource for invalid key', function() {
  const result = RC.steal(mockEntity(10), mockEntity(10), 'fake', 1);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'unknown_resource');
});

console.log('\ngetDrops + clearAll');

test('getDrops returns copy of all held resources', function() {
  const e = mockEntity(10, { argentite: 5, alluvial_gold: 20 });
  const drops = RC.getDrops(e);
  assert.strictEqual(drops.argentite, 5);
  assert.strictEqual(drops.alluvial_gold, 20);
});

test('getDrops returns empty object for entity with no resources', function() {
  assert.deepStrictEqual(RC.getDrops(mockEntity()), {});
});

test('getDrops does not clear entity resources', function() {
  const e = mockEntity(10, { alluvial_gold: 10 });
  RC.getDrops(e);
  assert.strictEqual(RC.getHeld(e).alluvial_gold, 10);
});

test('clearAll empties all resources', function() {
  const e = mockEntity(10, { alluvial_gold: 5, honey: 2 });
  RC.clearAll(e);
  assert.deepStrictEqual(RC.getHeld(e), {});
});

test('clearAll on already empty entity does not throw', function() {
  assert.doesNotThrow(function() { RC.clearAll(mockEntity()); });
});

console.log('\nno ghost keys');

test('zero-value keys are not retained after remove', function() {
  const e = mockEntity(10, { alluvial_gold: 3 });
  RC.remove(e, 'alluvial_gold', 3);
  assert.ok(!('alluvial_gold' in RC.getHeld(e)));
});

test('failed add leaves no trace in inventory', function() {
  const e = mockEntity(1);
  RC.add(e, 'wool', 1); // wool=231kg, capacity=10kg
  assert.deepStrictEqual(RC.getHeld(e), {});
});

console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed > 0 ? 1 : 0);