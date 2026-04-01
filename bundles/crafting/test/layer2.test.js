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

// Resource reference:
//   alluvial_gold: 1.4kg,  rotTicks: null    — non-perishable, lightweight
//   argentite:     3.8kg,  rotTicks: null    — non-perishable, mining skill required
//   rock_salt:    12.8kg,  rotTicks: null    — non-perishable
//   honey:        19.8kg,  rotTicks: 3669120 — perishable
//   wool:        231.0kg,  rotTicks: 10080   — perishable, very heavy
//   medicinal_herbs: 184kg, rotTicks: 1440   — perishable, shortest timer

console.log('\nLayer 2 - ResourceContainer\n');
console.log('getAmount');

test('returns 0 for key not present', function() {
  assert.strictEqual(RC.getAmount(mockEntity(), 'alluvial_gold'), 0);
});

test('returns plain number for non-perishable', function() {
  const e = mockEntity(10, { alluvial_gold: 7 });
  assert.strictEqual(RC.getAmount(e, 'alluvial_gold'), 7);
});

test('returns array length for perishable', function() {
  const e = mockEntity(10, { honey: [1000, 2000, 3000] });
  assert.strictEqual(RC.getAmount(e, 'honey'), 3);
});

test('returns 0 for perishable with empty array', function() {
  const e = mockEntity(10, { honey: [] });
  assert.strictEqual(RC.getAmount(e, 'honey'), 0);
});

console.log('\ngetHeld');

test('returns empty object when no resources set', function() {
  assert.deepStrictEqual(RC.getHeld(mockEntity()), {});
});

test('returns copy not reference for non-perishable', function() {
  const e = mockEntity(10, { alluvial_gold: 5 });
  const held = RC.getHeld(e);
  held.alluvial_gold = 999;
  assert.strictEqual(RC.getHeld(e).alluvial_gold, 5);
});

test('returns copy not reference for perishable array', function() {
  const e = mockEntity(10, { honey: [1000, 2000] });
  const held = RC.getHeld(e);
  held.honey.push(9999);
  assert.strictEqual(RC.getAmount(e, 'honey'), 2);
});

console.log('\ngetTotalWeight');

test('zero for empty inventory', function() {
  assert.strictEqual(RC.getTotalWeight(mockEntity()), 0);
});

test('correctly sums weight across non-perishable and perishable', function() {
  const e = mockEntity(10, { alluvial_gold: 10, honey: [1000, 2000] });
  const expected = (1.4 * 10) + (19.8 * 2);
  assert.ok(Math.abs(RC.getTotalWeight(e) - expected) < 0.0001);
});

console.log('\ncanAdd');

test('returns ok:true when under capacity', function() {
  assert.deepStrictEqual(RC.canAdd(mockEntity(10), 'alluvial_gold', 1), { ok: true });
});

test('returns over_capacity when weight would exceed strength * multiplier', function() {
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
  // alluvial_gold: 1.4kg. strength=7 → capacity=70kg. 70/1.4=50 exactly.
  const e = mockEntity(7);
  assert.deepStrictEqual(RC.canAdd(e, 'alluvial_gold', 50), { ok: true });
});

test('one unit over capacity returns over_capacity', function() {
  const e = mockEntity(7);
  const result = RC.canAdd(e, 'alluvial_gold', 51);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'over_capacity');
});

console.log('\nadd - non-perishable');

test('adds non-perishable to empty inventory', function() {
  const e = mockEntity();
  RC.add(e, 'alluvial_gold', 3);
  assert.strictEqual(RC.getAmount(e, 'alluvial_gold'), 3);
});

test('accumulates non-perishable on top of existing', function() {
  const e = mockEntity(10, { alluvial_gold: 5 });
  RC.add(e, 'alluvial_gold', 3);
  assert.strictEqual(RC.getAmount(e, 'alluvial_gold'), 8);
});

test('returns ok:true on non-perishable success', function() {
  assert.deepStrictEqual(RC.add(mockEntity(), 'alluvial_gold', 10), { ok: true });
});

test('returns failure and does not mutate on over_capacity', function() {
  const e = mockEntity(1);
  const result = RC.add(e, 'wool', 1);
  assert.strictEqual(result.ok, false);
  assert.deepStrictEqual(RC.getHeld(e), {});
});

console.log('\nadd - perishable');

test('adds perishable with expiry tick', function() {
  const e = mockEntity(10);
  RC.add(e, 'honey', 1, 5000);
  assert.strictEqual(RC.getAmount(e, 'honey'), 1);
  assert.deepStrictEqual(RC.getHeld(e).honey, [5000]);
});

test('multiple units add multiple expiry entries', function() {
  const e = mockEntity(10);
  RC.add(e, 'honey', 3, 5000);
  assert.strictEqual(RC.getAmount(e, 'honey'), 3);
  assert.deepStrictEqual(RC.getHeld(e).honey, [5000, 5000, 5000]);
});

test('accumulates perishable on top of existing', function() {
  const e = mockEntity(10, { honey: [1000, 2000] });
  RC.add(e, 'honey', 2, 3000);
  assert.strictEqual(RC.getAmount(e, 'honey'), 4);
});

test('different batch expiries coexist in array', function() {
  const e = mockEntity(10);
  RC.add(e, 'honey', 2, 1000);
  RC.add(e, 'honey', 1, 2000);
  const ticks = RC.getHeld(e).honey.slice().sort((a, b) => a - b);
  assert.deepStrictEqual(ticks, [1000, 1000, 2000]);
});

test('returns missing_expiry when expiryTick omitted for perishable', function() {
  const result = RC.add(mockEntity(10), 'honey', 1);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'missing_expiry');
});

test('returns missing_expiry when expiryTick is null for perishable', function() {
  const result = RC.add(mockEntity(10), 'honey', 1, null);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'missing_expiry');
});

test('over_capacity check fires before missing_expiry check', function() {
  const result = RC.add(mockEntity(1), 'wool', 1);
  assert.strictEqual(result.reason, 'over_capacity');
});

console.log('\nremove - non-perishable');

test('removes correct amount from non-perishable', function() {
  const e = mockEntity(10, { alluvial_gold: 10 });
  RC.remove(e, 'alluvial_gold', 4);
  assert.strictEqual(RC.getAmount(e, 'alluvial_gold'), 6);
});

test('removes key entirely when non-perishable reaches zero', function() {
  const e = mockEntity(10, { alluvial_gold: 5 });
  RC.remove(e, 'alluvial_gold', 5);
  assert.ok(!('alluvial_gold' in RC.getHeld(e)));
});

test('returns insufficient when not enough non-perishable held', function() {
  const e = mockEntity(10, { alluvial_gold: 2 });
  const result = RC.remove(e, 'alluvial_gold', 5);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'insufficient');
});

test('does not mutate on insufficient non-perishable', function() {
  const e = mockEntity(10, { alluvial_gold: 2 });
  RC.remove(e, 'alluvial_gold', 5);
  assert.strictEqual(RC.getAmount(e, 'alluvial_gold'), 2);
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

console.log('\nremove - perishable');

test('removes soonest-expiring entries first', function() {
  const e = mockEntity(10, { honey: [3000, 1000, 2000] });
  RC.remove(e, 'honey', 1);
  const remaining = RC.getHeld(e).honey;
  assert.ok(!remaining.includes(1000), 'soonest tick 1000 should be gone');
  assert.strictEqual(remaining.length, 2);
});

test('removes key entirely when perishable array empties', function() {
  const e = mockEntity(10, { honey: [1000, 2000] });
  RC.remove(e, 'honey', 2);
  assert.ok(!('honey' in RC.getHeld(e)));
});

test('returns insufficient when perishable count too low', function() {
  const e = mockEntity(10, { honey: [1000] });
  const result = RC.remove(e, 'honey', 5);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'insufficient');
});

test('does not mutate perishable on insufficient', function() {
  const e = mockEntity(10, { honey: [1000, 2000] });
  RC.remove(e, 'honey', 5);
  assert.strictEqual(RC.getAmount(e, 'honey'), 2);
});

console.log('\ntransfer - atomicity');

test('transfers non-perishable from one entity to another', function() {
  const from = mockEntity(10, { alluvial_gold: 10 });
  const to = mockEntity(10);
  RC.transfer(from, to, { alluvial_gold: 5 });
  assert.strictEqual(RC.getAmount(from, 'alluvial_gold'), 5);
  assert.strictEqual(RC.getAmount(to, 'alluvial_gold'), 5);
});

test('transfers mixed types atomically', function() {
  const from = mockEntity(10, { alluvial_gold: 10, honey: [1000, 2000, 3000] });
  const to = mockEntity(10);
  const result = RC.transfer(from, to, { alluvial_gold: 3, honey: 1 });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(RC.getAmount(from, 'alluvial_gold'), 7);
  assert.strictEqual(RC.getAmount(from, 'honey'), 2);
  assert.strictEqual(RC.getAmount(to, 'alluvial_gold'), 3);
  assert.strictEqual(RC.getAmount(to, 'honey'), 1);
});

test('does not mutate either entity when from has insufficient', function() {
  const from = mockEntity(10, { alluvial_gold: 2 });
  const to = mockEntity(10);
  const result = RC.transfer(from, to, { alluvial_gold: 5 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'insufficient');
  assert.strictEqual(RC.getAmount(from, 'alluvial_gold'), 2);
  assert.deepStrictEqual(RC.getHeld(to), {});
});

test('does not mutate either entity when to is over capacity', function() {
  const from = mockEntity(10, { wool: [9999] });
  const to = mockEntity(1);
  const result = RC.transfer(from, to, { wool: 1 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'over_capacity');
  assert.strictEqual(RC.getAmount(from, 'wool'), 1);
  assert.deepStrictEqual(RC.getHeld(to), {});
});

test('partial failure in multi-resource map leaves both entities unchanged', function() {
  const from = mockEntity(10, { alluvial_gold: 10, honey: [9999] });
  const to = mockEntity(10);
  const result = RC.transfer(from, to, { alluvial_gold: 5, honey: 5 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'insufficient');
  assert.strictEqual(RC.getAmount(from, 'alluvial_gold'), 10);
  assert.strictEqual(RC.getAmount(from, 'honey'), 1);
  assert.deepStrictEqual(RC.getHeld(to), {});
});

test('returns unknown_resource for invalid key in map', function() {
  const from = mockEntity(10, { alluvial_gold: 5 });
  const result = RC.transfer(from, mockEntity(10), { ghost: 1 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'unknown_resource');
});

console.log('\ntransfer - expiry preservation');

test('transfers soonest-expiring perishable units first', function() {
  const from = mockEntity(10, { honey: [3000, 1000, 2000] });
  const to = mockEntity(10);
  RC.transfer(from, to, { honey: 2 });
  const received = RC.getHeld(to).honey;
  assert.ok(received.includes(1000), 'soonest tick 1000 should transfer');
  assert.ok(received.includes(2000), 'second soonest tick 2000 should transfer');
  assert.ok(!received.includes(3000), 'longest-lived tick 3000 should stay');
});

test('transferred expiry ticks are preserved exactly', function() {
  const from = mockEntity(10, { honey: [1234, 5678] });
  const to = mockEntity(10);
  RC.transfer(from, to, { honey: 1 });
  assert.ok(RC.getHeld(to).honey.includes(1234), 'exact tick should be preserved');
});

test('receiver accumulates expiry entries from multiple transfers', function() {
  const from = mockEntity(10, { honey: [1000, 2000, 3000] });
  const to = mockEntity(10, { honey: [9000] });
  RC.transfer(from, to, { honey: 2 });
  assert.strictEqual(RC.getAmount(to, 'honey'), 3);
});

console.log('\nsteal');

test('transfers resource from victim to thief', function() {
  const thief = mockEntity(10);
  const victim = mockEntity(10, { alluvial_gold: 20 });
  const result = RC.steal(thief, victim, 'alluvial_gold', 8);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(RC.getAmount(thief, 'alluvial_gold'), 8);
  assert.strictEqual(RC.getAmount(victim, 'alluvial_gold'), 12);
});

test('steals soonest-expiring perishable units', function() {
  const thief = mockEntity(10);
  const victim = mockEntity(10, { honey: [5000, 1000, 3000] });
  RC.steal(thief, victim, 'honey', 1);
  assert.ok(RC.getHeld(thief).honey.includes(1000));
  assert.strictEqual(RC.getAmount(victim, 'honey'), 2);
});

test('fails if victim does not have enough', function() {
  const thief = mockEntity(10);
  const victim = mockEntity(10, { alluvial_gold: 3 });
  const result = RC.steal(thief, victim, 'alluvial_gold', 10);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'insufficient');
  assert.deepStrictEqual(RC.getHeld(thief), {});
  assert.strictEqual(RC.getAmount(victim, 'alluvial_gold'), 3);
});

test('fails if thief cannot carry', function() {
  const thief = mockEntity(1);
  const victim = mockEntity(10, { wool: [9999, 9999, 9999, 9999, 9999] });
  const result = RC.steal(thief, victim, 'wool', 1);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'over_capacity');
  assert.deepStrictEqual(RC.getHeld(thief), {});
  assert.strictEqual(RC.getAmount(victim, 'wool'), 5);
});

test('returns unknown_resource for invalid key', function() {
  const result = RC.steal(mockEntity(10), mockEntity(10), 'fake', 1);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'unknown_resource');
});

console.log('\ngetDrops + clearAll');

test('getDrops returns amount map for non-perishables', function() {
  const e = mockEntity(10, { argentite: 5, alluvial_gold: 20 });
  const drops = RC.getDrops(e);
  assert.strictEqual(drops.argentite, 5);
  assert.strictEqual(drops.alluvial_gold, 20);
});

test('getDrops returns count for perishables', function() {
  const e = mockEntity(10, { honey: [1000, 2000, 3000] });
  const drops = RC.getDrops(e);
  assert.strictEqual(drops.honey, 3);
});

test('getDrops returns empty object for entity with no resources', function() {
  assert.deepStrictEqual(RC.getDrops(mockEntity()), {});
});

test('getDrops does not clear entity resources', function() {
  const e = mockEntity(10, { alluvial_gold: 10 });
  RC.getDrops(e);
  assert.strictEqual(RC.getAmount(e, 'alluvial_gold'), 10);
});

test('clearAll empties all resources', function() {
  const e = mockEntity(10, { alluvial_gold: 5, honey: [1000, 2000] });
  RC.clearAll(e);
  assert.deepStrictEqual(RC.getHeld(e), {});
});

test('clearAll on already empty entity does not throw', function() {
  assert.doesNotThrow(function() { RC.clearAll(mockEntity()); });
});

console.log('\nno ghost keys');

test('zero-value non-perishable keys not retained after remove', function() {
  const e = mockEntity(10, { alluvial_gold: 3 });
  RC.remove(e, 'alluvial_gold', 3);
  assert.ok(!('alluvial_gold' in RC.getHeld(e)));
});

test('empty perishable array key not retained after remove', function() {
  const e = mockEntity(10, { honey: [1000] });
  RC.remove(e, 'honey', 1);
  assert.ok(!('honey' in RC.getHeld(e)));
});

test('failed add leaves no trace in inventory', function() {
  const e = mockEntity(1);
  RC.add(e, 'wool', 1, 9999);
  assert.deepStrictEqual(RC.getHeld(e), {});
});

console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed > 0 ? 1 : 0);