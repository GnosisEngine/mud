// resources/test/layer9.test.js
'use strict';

const assert = require('assert');
const RR = require('../lib/ResourceRot');
const RC = require('../lib/ResourceContainer');

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
  };
}

console.log('\nLayer 9 - ResourceRot\n');

console.log('addRotEntry');

test('appends entry to empty resourceRot array', function() {
  const e = mockEntity();
  RR.addRotEntry(e, 'honey', 4, 1000);
  const entries = RR.getRotEntries(e);
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].key, 'honey');
  assert.strictEqual(entries[0].amount, 4);
  assert.strictEqual(entries[0].expiresAt, 1000);
});

test('appends second entry independently for same resource key', function() {
  const e = mockEntity();
  RR.addRotEntry(e, 'honey', 4, 1000);
  RR.addRotEntry(e, 'honey', 3, 1060);
  const entries = RR.getRotEntries(e);
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[0].expiresAt, 1000);
  assert.strictEqual(entries[1].expiresAt, 1060);
});

test('appends entries for different resource keys independently', function() {
  const e = mockEntity();
  RR.addRotEntry(e, 'honey', 2, 500);
  RR.addRotEntry(e, 'alluvial_gold', 5, 700);
  const entries = RR.getRotEntries(e);
  assert.strictEqual(entries.length, 2);
  assert.ok(entries.find(function(en) { return en.key === 'honey'; }));
  assert.ok(entries.find(function(en) { return en.key === 'alluvial_gold'; }));
});

test('no-op when expiresAt is null', function() {
  const e = mockEntity();
  RR.addRotEntry(e, 'honey', 4, null);
  assert.strictEqual(RR.getRotEntries(e).length, 0);
});

test('no-op when expiresAt is undefined', function() {
  const e = mockEntity();
  RR.addRotEntry(e, 'honey', 4, undefined);
  assert.strictEqual(RR.getRotEntries(e).length, 0);
});

test('no-op when amount is zero', function() {
  const e = mockEntity();
  RR.addRotEntry(e, 'honey', 0, 1000);
  assert.strictEqual(RR.getRotEntries(e).length, 0);
});

test('no-op when amount is negative', function() {
  const e = mockEntity();
  RR.addRotEntry(e, 'honey', -1, 1000);
  assert.strictEqual(RR.getRotEntries(e).length, 0);
});

console.log('\ngetRotEntries');

test('returns empty array when no rot entries exist', function() {
  const e = mockEntity();
  assert.deepStrictEqual(RR.getRotEntries(e), []);
});

test('returns a copy - mutations do not affect stored entries', function() {
  const e = mockEntity();
  RR.addRotEntry(e, 'honey', 4, 1000);
  const entries = RR.getRotEntries(e);
  entries[0].amount = 999;
  assert.strictEqual(RR.getRotEntries(e)[0].amount, 4);
});

console.log('\nprocessEntity - no expiry');

test('returns empty rotted map when nothing is expired', function() {
  const e = mockEntity(10, { honey: 4 });
  RR.addRotEntry(e, 'honey', 4, 2000);
  const result = RR.processEntity(e, 1000);
  assert.deepStrictEqual(result.rotted, {});
});

test('non-expired entries remain after processing', function() {
  const e = mockEntity(10, { honey: 4 });
  RR.addRotEntry(e, 'honey', 4, 2000);
  RR.processEntity(e, 1000);
  assert.strictEqual(RR.getRotEntries(e).length, 1);
});

test('no-op on entity with no rot entries', function() {
  const e = mockEntity(10, { honey: 4 });
  const result = RR.processEntity(e, 1000);
  assert.deepStrictEqual(result.rotted, {});
  assert.strictEqual(RC.getHeld(e).honey, 4);
});

console.log('\nprocessEntity - expiry');

test('removes resource amount when entry expires', function() {
  const e = mockEntity(10, { honey: 4 });
  RR.addRotEntry(e, 'honey', 4, 500);
  RR.processEntity(e, 1000);
  assert.ok(!RC.getHeld(e).honey);
});

test('returns correct rotted amount', function() {
  const e = mockEntity(10, { honey: 4 });
  RR.addRotEntry(e, 'honey', 4, 500);
  const result = RR.processEntity(e, 1000);
  assert.strictEqual(result.rotted.honey, 4);
});

test('expired entry is removed from rot array', function() {
  const e = mockEntity(10, { honey: 4 });
  RR.addRotEntry(e, 'honey', 4, 500);
  RR.processEntity(e, 1000);
  assert.strictEqual(RR.getRotEntries(e).length, 0);
});

test('expiresAt equal to currentTick is treated as expired', function() {
  const e = mockEntity(10, { honey: 4 });
  RR.addRotEntry(e, 'honey', 4, 1000);
  const result = RR.processEntity(e, 1000);
  assert.strictEqual(result.rotted.honey, 4);
});

test('processes only expired entries leaving future ones intact', function() {
  const e = mockEntity(25, { honey: 7 });
  RC.add(e, 'clay', 5);
  RR.addRotEntry(e, 'honey', 4, 500);
  RR.addRotEntry(e, 'honey', 3, 2000);
  RR.addRotEntry(e, 'clay', 5, 3000);
  RR.processEntity(e, 1000);
  assert.strictEqual(RC.getHeld(e).honey, 3);
  assert.strictEqual(RC.getHeld(e).clay, 5);
  assert.strictEqual(RR.getRotEntries(e).length, 2);
});

test('accumulates rotted totals across multiple expired entries for same key', function() {
  const e = mockEntity(10, { honey: 7 });
  RR.addRotEntry(e, 'honey', 4, 400);
  RR.addRotEntry(e, 'honey', 3, 500);
  const result = RR.processEntity(e, 1000);
  assert.strictEqual(result.rotted.honey, 7);
});

test('accumulates rotted totals across different keys', function() {
  const e = mockEntity(20, { honey: 4 });
  RC.add(e, 'clay', 5);
  RR.addRotEntry(e, 'honey', 4, 400);
  RR.addRotEntry(e, 'clay', 5, 500);
  const result = RR.processEntity(e, 1000);
  assert.strictEqual(result.rotted.honey, 4);
  assert.strictEqual(result.rotted.clay, 5);
});

console.log('\nprocessEntity - trade-away case (Math.min)');

test('rots only held amount when player traded some away', function() {
  const e = mockEntity(10, { honey: 2 });
  RR.addRotEntry(e, 'honey', 4, 500);
  const result = RR.processEntity(e, 1000);
  assert.strictEqual(result.rotted.honey, 2);
  assert.ok(!RC.getHeld(e).honey);
});

test('expired entry is cleared even when held amount is zero', function() {
  const e = mockEntity(10, {});
  RR.addRotEntry(e, 'honey', 4, 500);
  const result = RR.processEntity(e, 1000);
  assert.strictEqual(RR.getRotEntries(e).length, 0);
  assert.deepStrictEqual(result.rotted, {});
});

test('rotted map omits key entirely when nothing was actually removed', function() {
  const e = mockEntity(10, {});
  RR.addRotEntry(e, 'honey', 4, 500);
  const result = RR.processEntity(e, 1000);
  assert.ok(!('honey' in result.rotted));
});

console.log('\nprocessEntity - offline rot');

test('processes all entries expired during offline period in one call', function() {
  const e = mockEntity(35, { honey: 10, clay: 8 });
  RR.addRotEntry(e, 'honey', 4, 100);
  RR.addRotEntry(e, 'honey', 6, 200);
  RR.addRotEntry(e, 'clay', 8, 300);
  RR.addRotEntry(e, 'honey', 2, 5000);
  const result = RR.processEntity(e, 1000);
  assert.strictEqual(result.rotted.honey, 10);
  assert.strictEqual(result.rotted.clay, 8);
  assert.strictEqual(RR.getRotEntries(e).length, 1);
  assert.strictEqual(RR.getRotEntries(e)[0].expiresAt, 5000);
});

console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed > 0 ? 1 : 0);