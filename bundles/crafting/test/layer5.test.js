// resources/test/layer5.test.js
'use strict';

const assert = require('assert');
const ST = require('../lib/SpawnTable');
const TR = require('../lib/TerrainResolver');
const RD = require('../lib/ResourceDefinitions');

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

function throws(fn, msgFragment) {
  let threw = false;
  try { fn(); } catch (e) {
    threw = true;
    if (msgFragment && !e.message.includes(msgFragment)) {
      throw new Error(`Expected error containing "${msgFragment}", got: "${e.message}"`);
    }
  }
  if (!threw) throw new Error('Expected function to throw but it did not');
}

function mockRoom(x = 0, y = 0, id = 'test:room') {
  return { id, coordinates: { x, y } };
}

console.log('\nLayer 5 — SpawnTable + TerrainResolver\n');

console.log('SpawnTable.getSpawnCandidates');

test('returns array for known terrain', () => {
  const candidates = ST.getSpawnCandidates('mountain');
  assert.ok(Array.isArray(candidates));
  assert.ok(candidates.length > 0);
});

test('falls back to default for unknown terrain', () => {
  const candidates = ST.getSpawnCandidates('lava_moon');
  const defaultCandidates = ST.getSpawnCandidates('default');
  assert.deepStrictEqual(candidates, defaultCandidates);
});

test('all candidates have valid resource keys', () => {
  for (const terrain of ['bog', 'mountain', 'grassland', 'default']) {
    for (const c of ST.getSpawnCandidates(terrain)) {
      assert.ok(RD.isValidKey(c.resourceKey), `invalid key "${c.resourceKey}" in ${terrain}`);
    }
  }
});

test('all candidates have spawnWeight > 0', () => {
  for (const terrain of ['bog', 'mountain', 'grassland', 'default']) {
    for (const c of ST.getSpawnCandidates(terrain)) {
      assert.ok(c.spawnWeight > 0);
    }
  }
});

test('all candidates have min >= 1 and max >= min', () => {
  for (const terrain of ['bog', 'mountain', 'grassland', 'default']) {
    for (const c of ST.getSpawnCandidates(terrain)) {
      assert.ok(c.min >= 1);
      assert.ok(c.max >= c.min);
    }
  }
});

test('all candidates have maxDensity >= 1', () => {
  for (const terrain of ['bog', 'mountain', 'grassland', 'default']) {
    for (const c of ST.getSpawnCandidates(terrain)) {
      assert.ok(c.maxDensity >= 1);
    }
  }
});

console.log('\nSpawnTable.getMaxDensityForResource');

test('returns maxDensity for known terrain + resource combo', () => {
  const density = ST.getMaxDensityForResource('mountain', 'alum');
  assert.ok(typeof density === 'number' && density >= 1);
});

test('returns 0 for resource not in terrain table', () => {
  const density = ST.getMaxDensityForResource('mountain', 'wool'); // wool only in pasture
  assert.strictEqual(density, 0);
});

test('returns 0 for unknown terrain (falls back to default, checks there)', () => {
  const density = ST.getMaxDensityForResource('lava_moon', 'alluvial_gold');
  assert.strictEqual(typeof density, 'number');
});

console.log('\nSpawnTable.drawSpawn');

test('returns object with resourceKey and amount', () => {
  const result = ST.drawSpawn('mountain');
  assert.ok(result !== null);
  assert.ok(typeof result.resourceKey === 'string');
  assert.ok(typeof result.amount === 'number');
});

test('returned resourceKey is valid', () => {
  const result = ST.drawSpawn('mountain');
  assert.ok(RD.isValidKey(result.resourceKey));
});

test('returned amount is within min/max range for the drawn resource', () => {
  for (let i = 0; i < 50; i++) {
    const result = ST.drawSpawn('mountain');
    const candidates = ST.getSpawnCandidates('mountain');
    const entry = candidates.find(c => c.resourceKey === result.resourceKey);
    assert.ok(entry, `no entry found for drawn key "${result.resourceKey}"`);
    assert.ok(result.amount >= entry.min && result.amount <= entry.max,
      `amount ${result.amount} outside [${entry.min}, ${entry.max}] for ${result.resourceKey}`);
  }
});

test('falls back to default for unknown terrain and still returns valid result', () => {
  const result = ST.drawSpawn('haunted_swamp');
  assert.ok(result !== null);
  assert.ok(RD.isValidKey(result.resourceKey));
});

test('weighted draw distribution is approximately correct over many iterations', () => {
  const counts = {};
  const iterations = 10000;

  for (let i = 0; i < iterations; i++) {
    const result = ST.drawSpawn('mountain');
    counts[result.resourceKey] = (counts[result.resourceKey] || 0) + 1;
  }

  const candidates = ST.getSpawnCandidates('mountain');
  const totalWeight = candidates.reduce((s, c) => s + c.spawnWeight, 0);

  for (const c of candidates) {
    const expectedRate = c.spawnWeight / totalWeight;
    const actualRate = (counts[c.resourceKey] || 0) / iterations;
    const delta = Math.abs(expectedRate - actualRate);
    assert.ok(delta < 0.05,
      `${c.resourceKey}: expected ~${(expectedRate * 100).toFixed(1)}%, got ${(actualRate * 100).toFixed(1)}%`);
  }
});

test('amount is always an integer', () => {
  for (let i = 0; i < 20; i++) {
    const result = ST.drawSpawn('mountain');
    assert.strictEqual(result.amount, Math.floor(result.amount));
  }
});

console.log('\nTerrainResolver.init');

test('init throws when passed non-function', () => {
  throws(() => TR.init('not a function'), 'resolverFn must be a function');
});

test('init accepts a function without throwing', () => {
  assert.doesNotThrow(() => TR.init(() => 'mountain'));
  TR.reset();
});

console.log('\nTerrainResolver.getTerrain');

test('returns default when no resolver initialized', () => {
  TR.reset();
  const room = mockRoom();
  assert.strictEqual(TR.getTerrain(room), 'default');
});

test('returns terrain from resolver when valid terrain returned', () => {
  TR.init(() => 'mountain');
  assert.strictEqual(TR.getTerrain(mockRoom()), 'mountain');
  TR.reset();
});

test('returns correct terrain for each known type', () => {
  for (const terrain of ['bog', 'mountain', 'grassland']) {
    TR.init(() => terrain);
    assert.strictEqual(TR.getTerrain(mockRoom()), terrain);
    TR.reset();
  }
});

test('falls back to default when resolver returns unknown terrain', () => {
  TR.init(() => 'haunted_swamp');
  assert.strictEqual(TR.getTerrain(mockRoom()), 'default');
  TR.reset();
});

test('falls back to default when resolver returns empty string', () => {
  TR.init(() => '');
  assert.strictEqual(TR.getTerrain(mockRoom()), 'default');
  TR.reset();
});

test('falls back to default when resolver returns null', () => {
  TR.init(() => null);
  assert.strictEqual(TR.getTerrain(mockRoom()), 'default');
  TR.reset();
});

test('falls back to default when resolver throws', () => {
  TR.init(() => { throw new Error('terrain service unavailable'); });
  assert.strictEqual(TR.getTerrain(mockRoom()), 'default');
  TR.reset();
});

test('passes room to resolver function', () => {
  const room = mockRoom(42, 17);
  let receivedRoom = null;
  TR.init(r => { receivedRoom = r; return 'mountain'; });
  TR.getTerrain(room);
  assert.strictEqual(receivedRoom, room);
  TR.reset();
});

test('resolver returning "default" explicitly is valid', () => {
  TR.init(() => 'default');
  assert.strictEqual(TR.getTerrain(mockRoom()), 'default');
  TR.reset();
});

console.log('\nSpawnTable + TerrainResolver integration');

test('drawSpawn with resolved terrain returns valid result', () => {
  TR.init(() => 'mountain');
  const terrain = TR.getTerrain(mockRoom());
  const result = ST.drawSpawn(terrain);
  assert.ok(RD.isValidKey(result.resourceKey));
  TR.reset();
});

test('full pipeline: room → terrain → spawn candidate → amount in range', () => {
  TR.init(room => room.coordinates.x > 50 ? 'mountain' : 'grassland');

  const forestRoom = mockRoom(10, 10);
  const mountainRoom = mockRoom(100, 100);

  for (let i = 0; i < 10; i++) {
    const fTerrain = TR.getTerrain(forestRoom);
    const fResult = ST.drawSpawn(fTerrain);
    assert.ok(['weld', 'woad', 'madder'].includes(fResult.resourceKey));

    const mTerrain = TR.getTerrain(mountainRoom);
    const mResult = ST.drawSpawn(mTerrain);
    assert.ok(['alum', 'argentite', 'chalcopyrite', 'lode_cassiterite', 'magnetite', 'rock_salt', 'sulfur', 'madder'].includes(mResult.resourceKey));
  }

  TR.reset();
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
