// bundles/world/test/layer5.test.js
'use strict';

const assert = require('assert');
const { getFolderName, getZoneType, getRoomId, getRoomRef } = require('../lib/AreaSchema');

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

console.log('\nLayer 5 — AreaSchema\n');


console.log('getFolderName');

test('cluster 0 returns "roads"', () => {
  assert.strictEqual(getFolderName(0), 'roads');
});

test('cluster 1 returns "c1"', () => {
  assert.strictEqual(getFolderName(1), 'c1');
});

test('cluster 13 returns "c13"', () => {
  assert.strictEqual(getFolderName(13), 'c13');
});

test('large cluster ID formats correctly', () => {
  assert.strictEqual(getFolderName(172), 'c172');
});

test('folder name never starts with a digit', () => {
  for (const id of [1, 13, 50, 100, 172]) {
    assert.ok(!/^\d/.test(getFolderName(id)), `getFolderName(${id}) starts with digit`);
  }
});


console.log('\ngetZoneType');

test('supply → SUPPLY', () => {
  assert.strictEqual(getZoneType('supply'), 'SUPPLY');
});

test('wilderness → WILDERNESS', () => {
  assert.strictEqual(getZoneType('wilderness'), 'WILDERNESS');
});

test('outpost → OUTPOST', () => {
  assert.strictEqual(getZoneType('outpost'), 'OUTPOST');
});

test('road → null (roads do not spawn resources)', () => {
  assert.strictEqual(getZoneType('road'), null);
});

test('null → null', () => {
  assert.strictEqual(getZoneType(null), null);
});

test('undefined → null', () => {
  assert.strictEqual(getZoneType(undefined), null);
});

test('unknown string → null', () => {
  assert.strictEqual(getZoneType('something_new'), null);
});

test('zoneType values are uppercase strings', () => {
  for (const feature of ['supply', 'wilderness', 'outpost']) {
    const zt = getZoneType(feature);
    assert.strictEqual(zt, zt.toUpperCase());
  }
});


console.log('\ngetRoomId');

test('positive coords format as r_{x}_{y}', () => {
  assert.strictEqual(getRoomId(42, 17), 'r_42_17');
});

test('zero coords', () => {
  assert.strictEqual(getRoomId(0, 0), 'r_0_0');
});

test('negative x coordinate', () => {
  assert.strictEqual(getRoomId(-5, 10), 'r_-5_10');
});

test('negative y coordinate', () => {
  assert.strictEqual(getRoomId(10, -12), 'r_10_-12');
});

test('both coords negative', () => {
  assert.strictEqual(getRoomId(-5, -12), 'r_-5_-12');
});

test('always starts with r_', () => {
  for (const [x, y] of [[0,0],[1,2],[99,99],[-1,-1]]) {
    assert.ok(getRoomId(x, y).startsWith('r_'), `getRoomId(${x},${y}) doesn't start with r_`);
  }
});

test('roundtrip: coords are recoverable from room ID', () => {
  const [x, y] = [42, 17];
  const id     = getRoomId(x, y);
  const parts  = id.slice(2).split('_');
  assert.strictEqual(Number(parts[0]), x);
  assert.strictEqual(Number(parts[1]), y);
});

test('negative coord roundtrip', () => {
  const [x, y] = [-5, -12];
  const id     = getRoomId(x, y);
  const parts  = id.replace(/^r_/, '').match(/^(-?\d+)_(-?\d+)$/);
  assert.ok(parts, `could not parse ${id}`);
  assert.strictEqual(Number(parts[1]), x);
  assert.strictEqual(Number(parts[2]), y);
});


console.log('\ngetRoomRef');

test('named cluster produces areaName:roomId format', () => {
  assert.strictEqual(getRoomRef(13, 42, 17), 'c13:r_42_17');
});

test('cluster 0 produces roads:roomId format', () => {
  assert.strictEqual(getRoomRef(0, 80, 60), 'roads:r_80_60');
});

test('ref contains exactly one colon', () => {
  const ref = getRoomRef(5, 10, 20);
  assert.strictEqual((ref.match(/:/g) || []).length, 1);
});

test('left of colon is getFolderName result', () => {
  for (const id of [0, 1, 13, 100]) {
    const ref    = getRoomRef(id, 0, 0);
    const [area] = ref.split(':');
    assert.strictEqual(area, getFolderName(id));
  }
});

test('right of colon is getRoomId result', () => {
  for (const [x, y] of [[0,0],[42,17],[-5,-12]]) {
    const ref    = getRoomRef(1, x, y);
    const roomId = ref.split(':')[1];
    assert.strictEqual(roomId, getRoomId(x, y));
  }
});


console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
