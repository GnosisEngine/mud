// resources/test/layer9.test.js
'use strict';

const assert = require('assert');
const RC = require('../lib/ResourceContainer');

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

// honey:           19.8kg, perishable
// medicinal_herbs: 184kg,  perishable, shortest timer
// alluvial_gold:   1.4kg,  non-perishable
// rock_salt:       12.8kg, non-perishable

console.log('\nLayer 9 - ResourceContainer.isDirty + processRot\n');

console.log('isDirty');

test('returns false for entity with no resources', function() {
  assert.strictEqual(RC.isDirty(mockEntity()), false);
});

test('returns false for entity with only non-perishables', function() {
  const e = mockEntity(10, { alluvial_gold: 5, rock_salt: 3 });
  assert.strictEqual(RC.isDirty(e), false);
});

test('returns true for entity with a perishable', function() {
  const e = mockEntity(10, { honey: [5000, 6000] });
  assert.strictEqual(RC.isDirty(e), true);
});

test('returns true when perishable and non-perishable coexist', function() {
  const e = mockEntity(10, { alluvial_gold: 5, honey: [9999] });
  assert.strictEqual(RC.isDirty(e), true);
});

test('returns false after all perishables removed', function() {
  const e = mockEntity(10, { honey: [1000] });
  RC.remove(e, 'honey', 1);
  assert.strictEqual(RC.isDirty(e), false);
});

console.log('\nprocessRot - no expiry');

test('returns empty rotted map when nothing has expired', function() {
  const e = mockEntity(10, { honey: [9999, 9999] });
  const result = RC.processRot(e, 1000);
  assert.deepStrictEqual(result.rotted, {});
});

test('surviving entries remain untouched', function() {
  const e = mockEntity(10, { honey: [9999, 9999] });
  RC.processRot(e, 1000);
  assert.strictEqual(RC.getAmount(e, 'honey'), 2);
});

test('no-op on entity with no perishables', function() {
  const e = mockEntity(10, { alluvial_gold: 5 });
  const result = RC.processRot(e, 1000);
  assert.deepStrictEqual(result.rotted, {});
  assert.strictEqual(RC.getAmount(e, 'alluvial_gold'), 5);
});

test('no-op on entity with empty resource map', function() {
  const e = mockEntity();
  const result = RC.processRot(e, 1000);
  assert.deepStrictEqual(result.rotted, {});
});

console.log('\nprocessRot - expiry');

test('removes expired entries and reports count', function() {
  const e = mockEntity(10, { honey: [500, 500] });
  const result = RC.processRot(e, 1000);
  assert.strictEqual(result.rotted.honey, 2);
  assert.strictEqual(RC.getAmount(e, 'honey'), 0);
});

test('tick equal to currentTick is treated as expired', function() {
  const e = mockEntity(10, { honey: [1000] });
  const result = RC.processRot(e, 1000);
  assert.strictEqual(result.rotted.honey, 1);
});

test('removes key entirely when all entries expire', function() {
  const e = mockEntity(10, { honey: [100, 200] });
  RC.processRot(e, 1000);
  assert.ok(!('honey' in RC.getHeld(e)));
});

test('processes only expired entries leaving future ones intact', function() {
  const e = mockEntity(10, { honey: [500, 500, 9999, 9999] });
  const result = RC.processRot(e, 1000);
  assert.strictEqual(result.rotted.honey, 2);
  assert.strictEqual(RC.getAmount(e, 'honey'), 2);
});

test('accumulates count across multiple expired entries for same key', function() {
  const e = mockEntity(10, { honey: [100, 200, 300] });
  const result = RC.processRot(e, 1000);
  assert.strictEqual(result.rotted.honey, 3);
});

test('processes multiple perishable keys independently', function() {
  const e = mockEntity(20, { honey: [500, 500], medicinal_herbs: [400, 9999] });
  const result = RC.processRot(e, 1000);
  assert.strictEqual(result.rotted.honey, 2);
  assert.strictEqual(result.rotted.medicinal_herbs, 1);
  assert.strictEqual(RC.getAmount(e, 'honey'), 0);
  assert.strictEqual(RC.getAmount(e, 'medicinal_herbs'), 1);
});

test('non-perishable keys are not touched', function() {
  const e = mockEntity(10, { alluvial_gold: 5, honey: [500] });
  RC.processRot(e, 1000);
  assert.strictEqual(RC.getAmount(e, 'alluvial_gold'), 5);
});

test('rotted map omits keys where nothing expired', function() {
  const e = mockEntity(10, { honey: [9999], medicinal_herbs: [500] });
  const result = RC.processRot(e, 1000);
  assert.ok(!('honey' in result.rotted));
  assert.strictEqual(result.rotted.medicinal_herbs, 1);
});

console.log('\nprocessRot - multiple calls (simulating poll loop)');

test('second call is a no-op after everything already rotted', function() {
  const e = mockEntity(10, { honey: [500] });
  RC.processRot(e, 1000);
  const result = RC.processRot(e, 2000);
  assert.deepStrictEqual(result.rotted, {});
});

test('entries added between polls are processed on the next poll', function() {
  const e = mockEntity(10);
  RC.add(e, 'honey', 2, 3000);
  const first = RC.processRot(e, 1000);
  assert.deepStrictEqual(first.rotted, {});
  assert.strictEqual(RC.getAmount(e, 'honey'), 2);
  const second = RC.processRot(e, 5000);
  assert.strictEqual(second.rotted.honey, 2);
});

console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed > 0 ? 1 : 0);