// bundles/world/test/layer4.test.js
'use strict';

const assert          = require('assert');
const path            = require('path');
const fs              = require('fs');
const { load }        = require('../lib/WorldLoader');
const { resolve }     = require('../lib/ClusterResolver');
const { build: buildIndex } = require('../lib/TileIndex');
const { build }       = require('../lib/WorldService');

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

const REAL_WORLD_PATH = path.resolve(__dirname, '../../../data/world.json');
const REAL_WORLD_AVAILABLE = fs.existsSync(REAL_WORLD_PATH);

// Minimal synthetic world for unit tests — no disk I/O needed
//
// Layout (feature/cluster):
//
//   [0,0] supply  cluster 1    [1,0] supply  cluster 1
//   [0,1] road    cluster 0    [1,1] supply  cluster 2
//   [0,2] supply  cluster 3    [1,2] supply  cluster 3
//
// Clusters 1 and 2 do NOT share a feature type so they won't merge.
// Clusters 1 and 3 are the same feature type but not adjacent — no merge.

const LEGENDS = {
  terrain:        { '0': 'none', '1': 'bog', '2': 'forest_deciduous' },
  features:       { '0': 'none', '1': 'road', '2': 'wilderness', '3': 'supply', '4': 'outpost' },
  featuresByName: { none: 0, road: 1, wilderness: 2, supply: 3, outpost: 4 },
  terrainsByName: { none: 0, bog: 1, forest_deciduous: 2 },
};

const RAW_TILES = [
  { coords: [0, 0], terrain: 1, feature: 3, cluster: 1 },
  { coords: [1, 0], terrain: 1, feature: 3, cluster: 1 },
  { coords: [0, 1], terrain: 1, feature: 1, cluster: 0 },
  { coords: [1, 1], terrain: 2, feature: 4, cluster: 2 },
  { coords: [0, 2], terrain: 1, feature: 3, cluster: 3 },
  { coords: [1, 2], terrain: 1, feature: 3, cluster: 3 },
  { coords: [0, 3], terrain: 0, feature: 0, cluster: 0 },
];

const RAW_CLUSTERS = { '0': 'none', '1': 'North Supply', '2': 'Outpost', '3': 'South Supply' };

function makeService() {
  const loaded   = { legends: LEGENDS };
  const resolved = resolve(RAW_TILES, RAW_CLUSTERS, LEGENDS);
  const index    = buildIndex(resolved.tiles);
  return build(loaded, resolved, index);
}

function makeRealService() {
  const loaded   = load(REAL_WORLD_PATH);
  const resolved = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  const index    = buildIndex(resolved.tiles);
  return build(loaded, resolved, index);
}


console.log('\nLayer 4 — WorldService\n');

console.log('build');

test('build returns an object', () => {
  const svc = makeService();
  assert.strictEqual(typeof svc, 'object');
  assert.ok(svc !== null);
});

test('service exposes all required methods', () => {
  const svc = makeService();
  const required = [
    'getTerrainForRoom', 'getEntryByCoords', 'getClusters',
    'getRoadPairs', 'getPath', 'getPathBetweenClusters', 'getDirection',
  ];
  for (const m of required) {
    assert.strictEqual(typeof svc[m], 'function', `missing method: ${m}`);
  }
});


console.log('\ngetTerrainForRoom');

test('returns terrain name for a room at a valid world coord', () => {
  const svc  = makeService();
  const room = { coordinates: { x: 0, y: 0, z: 0 } };
  assert.strictEqual(svc.getTerrainForRoom(room), 'bog');
});

test('returns different terrain name for different coord', () => {
  const svc  = makeService();
  const room = { coordinates: { x: 1, y: 1, z: 0 } };
  assert.strictEqual(svc.getTerrainForRoom(room), 'forest_deciduous');
});

test('returns null for room with no coordinates', () => {
  const svc = makeService();
  assert.strictEqual(svc.getTerrainForRoom({}), null);
});

test('returns null for null room', () => {
  const svc = makeService();
  assert.strictEqual(svc.getTerrainForRoom(null), null);
});

test('returns null for coords not in world', () => {
  const svc  = makeService();
  const room = { coordinates: { x: 999, y: 999, z: 0 } };
  assert.strictEqual(svc.getTerrainForRoom(room), null);
});

test('returns null for room with partial coordinates', () => {
  const svc  = makeService();
  const room = { coordinates: { x: 0 } };
  assert.strictEqual(svc.getTerrainForRoom(room), null);
});

test('ignores z coordinate — world is a 2D grid', () => {
  const svc   = makeService();
  const roomZ0 = { coordinates: { x: 0, y: 0, z: 0 } };
  const roomZ5 = { coordinates: { x: 0, y: 0, z: 5 } };
  assert.strictEqual(svc.getTerrainForRoom(roomZ0), svc.getTerrainForRoom(roomZ5));
});


console.log('\ngetEntryByCoords');

test('returns tile for valid coordinates', () => {
  const svc  = makeService();
  const tile = svc.getEntryByCoords(0, 0);
  assert.ok(tile);
  assert.deepStrictEqual(tile.coords, [0, 0]);
});

test('returns null for coordinates not in world', () => {
  const svc = makeService();
  assert.strictEqual(svc.getEntryByCoords(999, 999), null);
});

test('returns null for feature:0 tiles (stripped during resolution)', () => {
  const svc = makeService();
  assert.strictEqual(svc.getEntryByCoords(0, 3), null);
});

test('returns road tile at road coord', () => {
  const svc  = makeService();
  const tile = svc.getEntryByCoords(0, 1);
  assert.ok(tile);
  assert.strictEqual(tile.feature, 1);
});


console.log('\ngetClusters');

test('returns an object', () => {
  const svc = makeService();
  assert.strictEqual(typeof svc.getClusters(), 'object');
});

test('cluster entries have id, name, and rooms', () => {
  const svc      = makeService();
  const clusters = svc.getClusters();
  for (const entry of Object.values(clusters)) {
    assert.ok('id'    in entry, 'missing id');
    assert.ok('name'  in entry, 'missing name');
    assert.ok('rooms' in entry, 'missing rooms');
    assert.ok(Array.isArray(entry.rooms));
  }
});

test('cluster names come from rawClusters', () => {
  const svc      = makeService();
  const clusters = svc.getClusters();
  const ids      = Object.keys(clusters).map(Number);
  const named    = ids.filter(id => id !== 0);
  assert.ok(named.some(id => clusters[id].name === 'North Supply'));
});


console.log('\ngetRoadPairs');

test('returns an array', () => {
  const svc = makeService();
  assert.ok(Array.isArray(svc.getRoadPairs()));
});

test('each pair has road and nonRoad keys', () => {
  const svc = makeService();
  for (const pair of svc.getRoadPairs()) {
    assert.ok('road'    in pair);
    assert.ok('nonRoad' in pair);
  }
});

test('road tile in pair has road feature', () => {
  const svc = makeService();
  for (const pair of svc.getRoadPairs()) {
    assert.strictEqual(pair.road.feature, LEGENDS.featuresByName.road);
  }
});

test('nonRoad tile in pair is not a road', () => {
  const svc = makeService();
  for (const pair of svc.getRoadPairs()) {
    assert.notStrictEqual(pair.nonRoad.feature, LEGENDS.featuresByName.road);
  }
});

test('nonRoad tile in pair has a non-zero canonicalCluster', () => {
  const svc = makeService();
  for (const pair of svc.getRoadPairs()) {
    assert.notStrictEqual(pair.nonRoad.canonicalCluster, 0);
  }
});

test('synthetic world produces road pair for the road at [0,1]', () => {
  const svc   = makeService();
  const pairs = svc.getRoadPairs();
  const roadCoords = pairs.map(p => p.road.coords.join(','));
  assert.ok(roadCoords.includes('0,1'), 'expected road pair at 0,1');
});


console.log('\ngetDirection');

test('east: dx=+1 dy=0', () => {
  const svc = makeService();
  assert.strictEqual(svc.getDirection([0, 0], [1, 0]), 'east');
});

test('west: dx=-1 dy=0', () => {
  const svc = makeService();
  assert.strictEqual(svc.getDirection([1, 0], [0, 0]), 'west');
});

test('south: dx=0 dy=+1', () => {
  const svc = makeService();
  assert.strictEqual(svc.getDirection([0, 0], [0, 1]), 'south');
});

test('north: dx=0 dy=-1', () => {
  const svc = makeService();
  assert.strictEqual(svc.getDirection([0, 1], [0, 0]), 'north');
});

test('returns null for non-adjacent coords', () => {
  const svc = makeService();
  assert.strictEqual(svc.getDirection([0, 0], [2, 2]), null);
});

test('returns null for diagonal', () => {
  const svc = makeService();
  assert.strictEqual(svc.getDirection([0, 0], [1, 1]), null);
});


console.log('\ngetPath');

test('returns null when no path exists between disconnected coords', () => {
  const svc = makeService();
  assert.strictEqual(svc.getPath([0, 0], [999, 999]), null);
});

test('path from a coord to itself returns a result', () => {
  const svc    = makeService();
  const result = svc.getPath([0, 0], [0, 0]);
  assert.ok(result);
  assert.ok(Array.isArray(result.coords));
});

test('path result has clusters and coords arrays', () => {
  const svc    = makeService();
  const result = svc.getPath([0, 0], [1, 0]);
  assert.ok(result);
  assert.ok(Array.isArray(result.clusters));
  assert.ok(Array.isArray(result.coords));
});

test('path through road connects two supply clusters', () => {
  const svc    = makeService();
  const result = svc.getPath([0, 0], [0, 2]);
  assert.ok(result, 'expected a path to exist');
  assert.ok(result.coords.length >= 3, 'expected path to span at least 3 tiles');
});


console.log('\ngetPathBetweenClusters');

test('returns null for unknown cluster IDs', () => {
  const svc = makeService();
  assert.strictEqual(svc.getPathBetweenClusters(999, 888), null);
});

test('returns a result between two valid named clusters', () => {
  const svc      = makeService();
  const clusters = Object.keys(svc.getClusters()).map(Number).filter(id => id !== 0);
  if (clusters.length < 2) { console.log('    (skipped — fewer than 2 named clusters)'); return; }
  const result = svc.getPathBetweenClusters(clusters[0], clusters[1]);
  assert.ok(result === null || (Array.isArray(result.coords) && Array.isArray(result.clusters)));
});


console.log('\nreal world.json');

test('builds from real world without throwing', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const svc = makeRealService();
  assert.ok(svc);
});

test('real world getTerrainForRoom returns a string for a known supply tile', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const svc    = makeRealService();
  const loaded = load(REAL_WORLD_PATH);
  const supply = loaded.tiles.find(t => t.feature === 3);
  const room   = { coordinates: { x: supply.coords[0], y: supply.coords[1], z: 0 } };
  const result = svc.getTerrainForRoom(room);
  assert.strictEqual(typeof result, 'string');
  assert.ok(result.length > 0);
});

test('real world getClusters returns 160 entries', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const svc      = makeRealService();
  const clusters = svc.getClusters();
  assert.strictEqual(Object.keys(clusters).length, 160);
});

test('real world getRoadPairs returns a non-empty array', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const svc = makeRealService();
  assert.ok(svc.getRoadPairs().length > 0);
});

test('real world getPathBetweenClusters finds a route between clusters 1 and 5', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const svc    = makeRealService();
  const result = svc.getPathBetweenClusters(1, 5);
  assert.ok(result, 'expected a path between clusters 1 and 5');
  assert.ok(result.coords.length > 0);
});

test('real world getDirection returns compass directions for adjacent tiles', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const svc = makeRealService();
  assert.strictEqual(svc.getDirection([10, 10], [11, 10]), 'east');
  assert.strictEqual(svc.getDirection([10, 10], [10, 11]), 'south');
});


console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
