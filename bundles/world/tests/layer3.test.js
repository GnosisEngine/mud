// bundles/world/test/layer3.test.js
'use strict';

const assert        = require('assert');
const path          = require('path');
const fs            = require('fs');
const { build }     = require('../lib/TileIndex');
const { resolve }   = require('../lib/ClusterResolver');
const { load }      = require('../lib/WorldLoader');

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

const LEGENDS = {
  terrain:        { '0': 'none', '1': 'bog' },
  features:       { '0': 'none', '1': 'road', '2': 'wilderness', '3': 'supply', '4': 'outpost' },
  featuresByName: { none: 0, road: 1, wilderness: 2, supply: 3, outpost: 4 },
  terrainsByName: { none: 0, bog: 1 },
};

function tile(x, y, feature, cluster, canon) {
  return { coords: [x, y], terrain: 1, feature, cluster, canonicalCluster: canon };
}

const REAL_WORLD_PATH = path.resolve(__dirname, '../../../data/world.json');

console.log('\nLayer 3 — TileIndex\n');


console.log('coordMap');

test('returns a Map for coordMap', () => {
  const { coordMap } = build([]);
  assert.ok(coordMap instanceof Map);
});

test('empty input produces empty coordMap', () => {
  const { coordMap } = build([]);
  assert.strictEqual(coordMap.size, 0);
});

test('coordMap key format is "x,y"', () => {
  const { coordMap } = build([tile(3, 7, 3, 1, 1)]);
  assert.ok(coordMap.has('3,7'));
});

test('coordMap key handles negative coordinates', () => {
  const { coordMap } = build([tile(-5, -12, 2, 1, 1)]);
  assert.ok(coordMap.has('-5,-12'));
});

test('coordMap stores the tile as the value', () => {
  const t = tile(4, 8, 3, 1, 1);
  const { coordMap } = build([t]);
  assert.strictEqual(coordMap.get('4,8'), t);
});

test('all tiles appear in coordMap', () => {
  const tiles = [tile(0, 0, 3, 1, 1), tile(1, 0, 3, 1, 1), tile(2, 0, 2, 2, 2)];
  const { coordMap } = build(tiles);
  assert.strictEqual(coordMap.size, 3);
});

test('duplicate coordinates: last write wins', () => {
  const t1 = tile(0, 0, 3, 1, 1);
  const t2 = tile(0, 0, 2, 2, 2);
  const { coordMap } = build([t1, t2]);
  assert.strictEqual(coordMap.get('0,0'), t2);
});


console.log('\nclusterTiles');

test('returns a Map for clusterTiles', () => {
  const { clusterTiles } = build([]);
  assert.ok(clusterTiles instanceof Map);
});

test('empty input produces empty clusterTiles', () => {
  const { clusterTiles } = build([]);
  assert.strictEqual(clusterTiles.size, 0);
});

test('tiles grouped by canonicalCluster', () => {
  const tiles = [tile(0, 0, 3, 1, 1), tile(1, 0, 3, 2, 1), tile(2, 0, 2, 3, 3)];
  const { clusterTiles } = build(tiles);
  assert.strictEqual(clusterTiles.get(1).length, 2);
  assert.strictEqual(clusterTiles.get(3).length, 1);
});

test('cluster 0 tiles are grouped under key 0', () => {
  const tiles = [tile(0, 0, 1, 0, 0), tile(1, 0, 1, 0, 0)];
  const { clusterTiles } = build(tiles);
  assert.strictEqual(clusterTiles.get(0).length, 2);
});

test('each tile appears in exactly one clusterTiles group', () => {
  const tiles = [
    tile(0, 0, 3, 1, 1),
    tile(1, 0, 3, 2, 1),
    tile(2, 0, 2, 3, 3),
    tile(3, 0, 1, 0, 0),
  ];
  const { clusterTiles } = build(tiles);
  let total = 0;
  for (const group of clusterTiles.values()) total += group.length;
  assert.strictEqual(total, tiles.length);
});

test('clusterTiles values are arrays', () => {
  const tiles = [tile(0, 0, 3, 1, 1)];
  const { clusterTiles } = build(tiles);
  assert.ok(Array.isArray(clusterTiles.get(1)));
});

test('clusterTiles arrays contain tile references not copies', () => {
  const t = tile(5, 5, 3, 1, 1);
  const { clusterTiles } = build([t]);
  assert.strictEqual(clusterTiles.get(1)[0], t);
});


console.log('\nconsistency between coordMap and clusterTiles');

test('every tile in clusterTiles also appears in coordMap', () => {
  const tiles = [tile(0, 0, 3, 1, 1), tile(1, 0, 2, 2, 2), tile(0, 1, 1, 0, 0)];
  const { coordMap, clusterTiles } = build(tiles);
  for (const group of clusterTiles.values()) {
    for (const t of group) {
      const key = `${t.coords[0]},${t.coords[1]}`;
      assert.ok(coordMap.has(key), `missing ${key} in coordMap`);
    }
  }
});

test('total tiles in clusterTiles equals coordMap size (no duplicates)', () => {
  const tiles = [tile(0, 0, 3, 1, 1), tile(1, 0, 2, 2, 2), tile(2, 0, 1, 0, 0)];
  const { coordMap, clusterTiles } = build(tiles);
  let total = 0;
  for (const group of clusterTiles.values()) total += group.length;
  assert.strictEqual(total, coordMap.size);
});


console.log('\nreal world.json integration');

const REAL_WORLD_AVAILABLE = fs.existsSync(REAL_WORLD_PATH);

test('builds index from real world without throwing', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const loaded   = load(REAL_WORLD_PATH);
  const resolved = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  const index    = build(resolved.tiles);
  assert.ok(index.coordMap instanceof Map);
  assert.ok(index.clusterTiles instanceof Map);
});

test('real world coordMap has exactly 3665 entries', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const loaded   = load(REAL_WORLD_PATH);
  const resolved = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  const { coordMap } = build(resolved.tiles);
  assert.strictEqual(coordMap.size, 3665);
});

test('real world clusterTiles has 160 entries (one per canonical cluster)', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const loaded   = load(REAL_WORLD_PATH);
  const resolved = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  const { clusterTiles } = build(resolved.tiles);
  assert.strictEqual(clusterTiles.size, 160);
});

test('real world: every tile in resolved appears in coordMap', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const loaded   = load(REAL_WORLD_PATH);
  const resolved = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  const { coordMap } = build(resolved.tiles);
  for (const tile of resolved.tiles) {
    const key = `${tile.coords[0]},${tile.coords[1]}`;
    assert.ok(coordMap.has(key), `missing ${key}`);
  }
});

test('real world: total across clusterTiles equals 3665', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const loaded   = load(REAL_WORLD_PATH);
  const resolved = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  const { clusterTiles } = build(resolved.tiles);
  let total = 0;
  for (const group of clusterTiles.values()) total += group.length;
  assert.strictEqual(total, 3665);
});


console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
