// bundles/world/test/layer6.test.js
'use strict';

const assert      = require('assert');
const path        = require('path');
const fs          = require('fs');
const { resolve } = require('../lib/ExitResolver');
const { getRoomRef, getRoomId } = require('../lib/AreaSchema');
const { load }    = require('../lib/WorldLoader');
const { resolve: resolveCluster } = require('../lib/ClusterResolver');
const { build: buildIndex }       = require('../lib/TileIndex');

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

function tile(x, y, cluster) {
  return { coords: [x, y], terrain: 1, feature: 3, cluster, canonicalCluster: cluster };
}

function makeCoordMap(tiles) {
  const m = new Map();
  for (const t of tiles) m.set(`${t.coords[0]},${t.coords[1]}`, t);
  return m;
}

const REAL_WORLD_PATH      = path.resolve(__dirname, '../../../data/world.json');
const REAL_WORLD_AVAILABLE = fs.existsSync(REAL_WORLD_PATH);

console.log('\nLayer 6 — ExitResolver\n');


console.log('isolated tile');

test('tile with no neighbors returns empty array', () => {
  const t   = tile(5, 5, 1);
  const map = makeCoordMap([t]);
  assert.deepStrictEqual(resolve(t, map), []);
});

test('returns an array', () => {
  const t = tile(0, 0, 1);
  assert.ok(Array.isArray(resolve(t, makeCoordMap([t]))));
});


console.log('\ndirection mapping');

test('eastern neighbor produces east exit', () => {
  const origin = tile(0, 0, 1);
  const east   = tile(1, 0, 1);
  const exits  = resolve(origin, makeCoordMap([origin, east]));
  assert.ok(exits.some(e => e.direction === 'east'));
});

test('western neighbor produces west exit', () => {
  const origin = tile(1, 0, 1);
  const west   = tile(0, 0, 1);
  const exits  = resolve(origin, makeCoordMap([origin, west]));
  assert.ok(exits.some(e => e.direction === 'west'));
});

test('southern neighbor produces south exit', () => {
  const origin = tile(0, 0, 1);
  const south  = tile(0, 1, 1);
  const exits  = resolve(origin, makeCoordMap([origin, south]));
  assert.ok(exits.some(e => e.direction === 'south'));
});

test('northern neighbor produces north exit', () => {
  const origin = tile(0, 1, 1);
  const north  = tile(0, 0, 1);
  const exits  = resolve(origin, makeCoordMap([origin, north]));
  assert.ok(exits.some(e => e.direction === 'north'));
});

test('tile surrounded on all four sides has four exits', () => {
  const center = tile(1, 1, 1);
  const map    = makeCoordMap([
    center,
    tile(2, 1, 1), tile(0, 1, 1),
    tile(1, 2, 1), tile(1, 0, 1),
  ]);
  assert.strictEqual(resolve(center, map).length, 4);
});

test('only present neighbors produce exits — three neighbors gives three exits', () => {
  const center = tile(1, 1, 1);
  const map    = makeCoordMap([center, tile(2, 1, 1), tile(0, 1, 1), tile(1, 0, 1)]);
  assert.strictEqual(resolve(center, map).length, 3);
});

test('diagonal neighbors are ignored', () => {
  const center = tile(1, 1, 1);
  const map    = makeCoordMap([
    center,
    tile(0, 0, 1), tile(2, 0, 1),
    tile(0, 2, 1), tile(2, 2, 1),
  ]);
  assert.strictEqual(resolve(center, map).length, 0);
});


console.log('\nroomId format');

test('exit roomId uses getRoomRef format', () => {
  const origin   = tile(0, 0, 1);
  const neighbor = tile(1, 0, 1);
  const exits    = resolve(origin, makeCoordMap([origin, neighbor]));
  const east     = exits.find(e => e.direction === 'east');
  assert.strictEqual(east.roomId, getRoomRef(1, 1, 0));
});

test('exit roomId encodes neighbor coords, not origin coords', () => {
  const origin   = tile(5, 5, 1);
  const neighbor = tile(6, 5, 1);
  const exits    = resolve(origin, makeCoordMap([origin, neighbor]));
  const east     = exits.find(e => e.direction === 'east');
  assert.ok(east.roomId.includes(getRoomId(6, 5)));
});

test('exit roomId contains exactly one colon', () => {
  const origin   = tile(0, 0, 1);
  const neighbor = tile(1, 0, 2);
  const exits    = resolve(origin, makeCoordMap([origin, neighbor]));
  for (const exit of exits) {
    assert.strictEqual((exit.roomId.match(/:/g) || []).length, 1);
  }
});


console.log('\ncross-area exits');

test('neighbor in different cluster produces cross-area roomId', () => {
  const origin   = tile(0, 0, 1);
  const neighbor = tile(1, 0, 2);
  const exits    = resolve(origin, makeCoordMap([origin, neighbor]));
  const east     = exits.find(e => e.direction === 'east');
  assert.ok(east.roomId.startsWith('c2:'));
});

test('neighbor in cluster 0 produces roads: roomId', () => {
  const origin = tile(0, 0, 1);
  const road   = tile(1, 0, 0);
  const exits  = resolve(origin, makeCoordMap([origin, road]));
  const east   = exits.find(e => e.direction === 'east');
  assert.ok(east.roomId.startsWith('roads:'));
});

test('same-cluster neighbor uses same area folder prefix', () => {
  const origin   = tile(0, 0, 13);
  const neighbor = tile(1, 0, 13);
  const exits    = resolve(origin, makeCoordMap([origin, neighbor]));
  const east     = exits.find(e => e.direction === 'east');
  assert.ok(east.roomId.startsWith('c13:'));
});


console.log('\nreal world.json integration');

test('resolves exits for every tile in real world without throwing', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const loaded   = load(REAL_WORLD_PATH);
  const resolved = resolveCluster(loaded.tiles, loaded.clusters, loaded.legends);
  const { coordMap } = buildIndex(resolved.tiles);
  for (const tile of resolved.tiles) {
    resolve(tile, coordMap);
  }
});

test('real world: no tile has more than 4 exits', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const loaded   = load(REAL_WORLD_PATH);
  const resolved = resolveCluster(loaded.tiles, loaded.clusters, loaded.legends);
  const { coordMap } = buildIndex(resolved.tiles);
  for (const tile of resolved.tiles) {
    const exits = resolve(tile, coordMap);
    assert.ok(exits.length <= 4, `tile at ${tile.coords} has ${exits.length} exits`);
  }
});

test('real world: all exit roomIds contain exactly one colon', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const loaded   = load(REAL_WORLD_PATH);
  const resolved = resolveCluster(loaded.tiles, loaded.clusters, loaded.legends);
  const { coordMap } = buildIndex(resolved.tiles);
  for (const tile of resolved.tiles) {
    for (const exit of resolve(tile, coordMap)) {
      const colons = (exit.roomId.match(/:/g) || []).length;
      assert.strictEqual(colons, 1, `bad roomId: ${exit.roomId}`);
    }
  }
});

test('real world: all exit directions are valid compass directions', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const valid    = new Set(['north', 'south', 'east', 'west']);
  const loaded   = load(REAL_WORLD_PATH);
  const resolved = resolveCluster(loaded.tiles, loaded.clusters, loaded.legends);
  const { coordMap } = buildIndex(resolved.tiles);
  for (const tile of resolved.tiles) {
    for (const exit of resolve(tile, coordMap)) {
      assert.ok(valid.has(exit.direction), `invalid direction: ${exit.direction}`);
    }
  }
});


console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
