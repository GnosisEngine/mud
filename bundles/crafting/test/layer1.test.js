// resources/test/layer1.test.js
'use strict';

const assert = require('assert');
const RD = require('../lib/ResourceDefinitions');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); passed++; }
  catch (e) { console.error('  \u2717 ' + name); console.error('    ' + e.message); failed++; }
}

function throws(fn, msgFragment) {
  let threw = false;
  try { fn(); } catch (e) {
    threw = true;
    if (msgFragment && !e.message.includes(msgFragment))
      throw new Error('Expected "' + msgFragment + '", got: "' + e.message + '"');
  }
  if (!threw) throw new Error('Expected throw');
}

console.log('\nLayer 1 - Data & Definitions\n');
console.log('resources.json schema');

test('module loads without throwing', function() { assert.ok(RD); });

test('getDefinition returns full object for known key', function() {
  const def = RD.getDefinition('alluvial_gold');
  assert.ok(def);
  assert.strictEqual(typeof def.title, 'string');
  assert.strictEqual(typeof def.weight, 'number');
  assert.ok(def.weight > 0);
  assert.ok(Array.isArray(def.requires.skills));
  assert.ok(Array.isArray(def.requires.effects));
});

test('getDefinition returns null for unknown key', function() {
  assert.strictEqual(RD.getDefinition('does_not_exist'), null);
});

test('getWeight returns positive number for known key', function() {
  const w = RD.getWeight('argentite');
  assert.strictEqual(typeof w, 'number');
  assert.ok(w > 0);
});

test('getWeight returns null for unknown key', function() {
  assert.strictEqual(RD.getWeight('does_not_exist'), null);
});

test('getRequirements returns skills and effects arrays', function() {
  const req = RD.getRequirements('argentite');
  assert.ok(Array.isArray(req.skills));
  assert.ok(Array.isArray(req.effects));
  assert.ok(req.skills.includes('mining'));
});

test('getRequirements returns null for unknown key', function() {
  assert.strictEqual(RD.getRequirements('does_not_exist'), null);
});

test('getAllKeys returns array of strings with no duplicates', function() {
  const keys = RD.getAllKeys();
  assert.ok(Array.isArray(keys));
  assert.ok(keys.length > 0);
  assert.strictEqual(new Set(keys).size, keys.length);
});

test('isValidKey returns true for known key', function() {
  assert.strictEqual(RD.isValidKey('alluvial_gold'), true);
});

test('isValidKey returns false for unknown key', function() {
  assert.strictEqual(RD.isValidKey('fake_key'), false);
});

test('resource with skill requirement has non-empty skills array', function() {
  const req = RD.getRequirements('argentite');
  assert.ok(req.skills.length > 0);
});

test('resource with no requirements has empty arrays not null', function() {
  const req = RD.getRequirements('alluvial_gold');
  assert.deepStrictEqual(req.skills, []);
  assert.deepStrictEqual(req.effects, []);
});

console.log('\nspawn-tables.json schema');

test('getSpawnTable returns array for known terrain', function() {
  const table = RD.getSpawnTable('mountain');
  assert.ok(Array.isArray(table));
  assert.ok(table.length > 0);
});

test('getSpawnTable falls back to default for unknown terrain', function() {
  const table = RD.getSpawnTable('underwater_volcano');
  const def = RD.getSpawnTable('default');
  assert.deepStrictEqual(table, def);
});

test('all spawn table entries reference valid resource keys', function() {
  for (const terrain of ['bog', 'cave', 'forest_deciduous', 'mountain', 'river', 'default']) {
    for (const entry of RD.getSpawnTable(terrain)) {
      assert.ok(RD.isValidKey(entry.resourceKey), terrain + ': invalid key "' + entry.resourceKey + '"');
    }
  }
});

test('all spawn table entries have spawnWeight > 0', function() {
  for (const terrain of ['bog', 'mountain', 'grassland', 'default']) {
    for (const entry of RD.getSpawnTable(terrain)) {
      assert.ok(entry.spawnWeight > 0);
    }
  }
});

test('all spawn table entries have valid min/max range', function() {
  for (const terrain of ['bog', 'mountain', 'river', 'default']) {
    for (const entry of RD.getSpawnTable(terrain)) {
      assert.ok(entry.min >= 1);
      assert.ok(entry.max >= entry.min);
    }
  }
});

test('all spawn table entries have maxDensity >= 1', function() {
  for (const terrain of ['bog', 'cave', 'meadow', 'default']) {
    for (const entry of RD.getSpawnTable(terrain)) {
      assert.ok(entry.maxDensity >= 1);
    }
  }
});

console.log('\nvalidation at load time');

test('bad resources.json throws on load', function() {
  const Module = require('module');
  const origLoad = Module._load;
  const fakeResources = { bad: { title: '', quality: 'common', weight: 1.0, rotTicks: null, requires: { skills: [], effects: [] } } };
  const fakeSpawnTables = { default: [] };
  Module._load = function(req, ...rest) {
    if (req.endsWith('resources.json')) return fakeResources;
    if (req.endsWith('spawn-tables.json')) return fakeSpawnTables;
    return origLoad.call(this, req, ...rest);
  };
  try {
    delete require.cache[require.resolve('../lib/ResourceDefinitions')];
    throws(() => require('../lib/ResourceDefinitions'), 'missing title');
  } finally {
    Module._load = origLoad;
    delete require.cache[require.resolve('../lib/ResourceDefinitions')];
    require('../lib/ResourceDefinitions');
  }
});

test('spawn table referencing unknown resource key throws on load', function() {
  const Module = require('module');
  const origLoad = Module._load;
  const fakeResources = { real: { title: 'Real', quality: 'common', weight: 1.0, rotTicks: null, requires: { skills: [], effects: [] } } };
  const fakeSpawnTables = { default: [{ resourceKey: 'ghost', spawnWeight: 10, min: 1, max: 2, maxDensity: 2 }] };
  Module._load = function(req, ...rest) {
    if (req.endsWith('resources.json')) return fakeResources;
    if (req.endsWith('spawn-tables.json')) return fakeSpawnTables;
    return origLoad.call(this, req, ...rest);
  };
  try {
    delete require.cache[require.resolve('../lib/ResourceDefinitions')];
    throws(() => require('../lib/ResourceDefinitions'), 'ghost');
  } finally {
    Module._load = origLoad;
    delete require.cache[require.resolve('../lib/ResourceDefinitions')];
    require('../lib/ResourceDefinitions');
  }
});

test('spawn table missing default entry throws on load', function() {
  const Module = require('module');
  const origLoad = Module._load;
  const fakeResources = { r: { title: 'R', quality: 'common', weight: 1.0, rotTicks: null, requires: { skills: [], effects: [] } } };
  const fakeSpawnTables = { forest: [{ resourceKey: 'r', spawnWeight: 10, min: 1, max: 2, maxDensity: 2 }] };
  Module._load = function(req, ...rest) {
    if (req.endsWith('resources.json')) return fakeResources;
    if (req.endsWith('spawn-tables.json')) return fakeSpawnTables;
    return origLoad.call(this, req, ...rest);
  };
  try {
    delete require.cache[require.resolve('../lib/ResourceDefinitions')];
    throws(() => require('../lib/ResourceDefinitions'), 'default');
  } finally {
    Module._load = origLoad;
    delete require.cache[require.resolve('../lib/ResourceDefinitions')];
    require('../lib/ResourceDefinitions');
  }
});

console.log('\nLayer 8 - rotTicks');

test('getRotTicks returns positive integer for perishable resource', function() {
  assert.strictEqual(typeof RD.getRotTicks('honey'), 'number');
  assert.ok(RD.getRotTicks('honey') > 0);
});

test('getRotTicks returns null for non-perishable resource', function() {
  assert.strictEqual(RD.getRotTicks('alluvial_gold'), null);
  assert.strictEqual(RD.getRotTicks('galena'), null);
  assert.strictEqual(RD.getRotTicks('rock_salt'), null);
});

test('null is distinct from zero - no resource has rotTicks of 0', function() {
  for (const key of RD.getAllKeys()) {
    assert.notStrictEqual(RD.getRotTicks(key), 0, key + ' must not have rotTicks of 0');
  }
});

test('getRotTicks returns null for unknown key', function() {
  assert.strictEqual(RD.getRotTicks('does_not_exist'), null);
});

test('all resources have rotTicks field present', function() {
  for (const key of RD.getAllKeys()) {
    assert.ok('rotTicks' in RD.getDefinition(key), key + ' missing rotTicks');
  }
});

test('getRotTicks is consistent with getDefinition', function() {
  for (const key of RD.getAllKeys()) {
    assert.strictEqual(RD.getRotTicks(key), RD.getDefinition(key).rotTicks);
  }
});

test('validation rejects resource with rotTicks of 0', function() {
  const Module = require('module');
  const origLoad = Module._load;
  const fakeResources = { bad: { title: 'Bad', quality: 'common', weight: 1.0, rotTicks: 0, requires: { skills: [], effects: [] } } };
  const fakeSpawnTables = { default: [] };
  Module._load = function(req, ...rest) {
    if (req.endsWith('resources.json')) return fakeResources;
    if (req.endsWith('spawn-tables.json')) return fakeSpawnTables;
    return origLoad.call(this, req, ...rest);
  };
  try {
    delete require.cache[require.resolve('../lib/ResourceDefinitions')];
    throws(() => require('../lib/ResourceDefinitions'), 'rotTicks');
  } finally {
    Module._load = origLoad;
    delete require.cache[require.resolve('../lib/ResourceDefinitions')];
    require('../lib/ResourceDefinitions');
  }
});

test('validation rejects resource missing rotTicks field', function() {
  const Module = require('module');
  const origLoad = Module._load;
  const fakeResources = { bad: { title: 'Bad', quality: 'common', weight: 1.0, requires: { skills: [], effects: [] } } };
  const fakeSpawnTables = { default: [] };
  Module._load = function(req, ...rest) {
    if (req.endsWith('resources.json')) return fakeResources;
    if (req.endsWith('spawn-tables.json')) return fakeSpawnTables;
    return origLoad.call(this, req, ...rest);
  };
  try {
    delete require.cache[require.resolve('../lib/ResourceDefinitions')];
    throws(() => require('../lib/ResourceDefinitions'), 'rotTicks');
  } finally {
    Module._load = origLoad;
    delete require.cache[require.resolve('../lib/ResourceDefinitions')];
    require('../lib/ResourceDefinitions');
  }
});

console.log('\nisPerishable');

test('isPerishable returns true for a resource with rotTicks', function() {
  assert.strictEqual(RD.isPerishable('medicinal_herbs'), true);
  assert.strictEqual(RD.isPerishable('honey'), true);
  assert.strictEqual(RD.isPerishable('woad'), true);
});

test('isPerishable returns false for a resource with null rotTicks', function() {
  assert.strictEqual(RD.isPerishable('alluvial_gold'), false);
  assert.strictEqual(RD.isPerishable('rock_salt'), false);
  assert.strictEqual(RD.isPerishable('galena'), false);
});

test('isPerishable returns false for unknown key', function() {
  assert.strictEqual(RD.isPerishable('does_not_exist'), false);
});

test('isPerishable is consistent with getRotTicks across all keys', function() {
  for (const key of RD.getAllKeys()) {
    const expected = RD.getRotTicks(key) !== null;
    assert.strictEqual(RD.isPerishable(key), expected, key + ' mismatch');
  }
});

console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed > 0 ? 1 : 0);
