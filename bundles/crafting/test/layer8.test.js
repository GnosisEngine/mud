// resources/test/layer8.test.js
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

console.log('\nLayer 8 - rotTicks\n');
console.log('getRotTicks');

test('returns positive integer for honey (perishable)', function() {
  assert.strictEqual(typeof RD.getRotTicks('honey'), 'number');
  assert.ok(RD.getRotTicks('honey') > 0);
  assert.strictEqual(RD.getRotTicks('honey'), 3669120);
});

test('returns positive integer for medicinal_herbs (perishable)', function() {
  assert.ok(RD.getRotTicks('medicinal_herbs') > 0);
  assert.strictEqual(RD.getRotTicks('medicinal_herbs'), 1440);
});

test('returns positive integer for clay (perishable)', function() {
  assert.ok(RD.getRotTicks('clay') > 0);
  assert.strictEqual(RD.getRotTicks('clay'), 10080);
});

test('returns null for alluvial_gold (non-perishable)', function() {
  assert.strictEqual(RD.getRotTicks('alluvial_gold'), null);
});

test('returns null for galena (non-perishable)', function() {
  assert.strictEqual(RD.getRotTicks('galena'), null);
});

test('returns null for rock_salt (non-perishable)', function() {
  assert.strictEqual(RD.getRotTicks('rock_salt'), null);
});

test('returns null for argentite (non-perishable ore)', function() {
  assert.strictEqual(RD.getRotTicks('argentite'), null);
});

test('returns null for unknown key', function() {
  assert.strictEqual(RD.getRotTicks('does_not_exist'), null);
});

test('null is distinct from zero - no resource has rotTicks of 0', function() {
  for (const key of RD.getAllKeys()) {
    assert.notStrictEqual(RD.getRotTicks(key), 0, key + ' must not have rotTicks of 0');
  }
});

test('all resources have rotTicks field present in definition', function() {
  for (const key of RD.getAllKeys()) {
    assert.ok('rotTicks' in RD.getDefinition(key), key + ' missing rotTicks field');
  }
});

test('getRotTicks is consistent with getDefinition for all resources', function() {
  for (const key of RD.getAllKeys()) {
    assert.strictEqual(RD.getRotTicks(key), RD.getDefinition(key).rotTicks);
  }
});

console.log('\nvalidation');

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

test('validation rejects resource missing rotTicks field entirely', function() {
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

test('validation accepts null rotTicks as valid non-perishable', function() {
  const Module = require('module');
  const origLoad = Module._load;
  const fakeResources = { coin: { title: 'Coin', quality: 'common', weight: 0.01, rotTicks: null, requires: { skills: [], effects: [] } } };
  const fakeSpawnTables = { default: [] };
  Module._load = function(req, ...rest) {
    if (req.endsWith('resources.json')) return fakeResources;
    if (req.endsWith('spawn-tables.json')) return fakeSpawnTables;
    return origLoad.call(this, req, ...rest);
  };
  try {
    delete require.cache[require.resolve('../lib/ResourceDefinitions')];
    assert.doesNotThrow(() => require('../lib/ResourceDefinitions'));
  } finally {
    Module._load = origLoad;
    delete require.cache[require.resolve('../lib/ResourceDefinitions')];
    require('../lib/ResourceDefinitions');
  }
});

console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed > 0 ? 1 : 0);
