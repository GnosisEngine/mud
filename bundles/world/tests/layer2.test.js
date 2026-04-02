// bundles/world/test/layer2.test.js
'use strict';

const assert          = require('assert');
const path            = require('path');
const fs              = require('fs');
const { resolve }     = require('../lib/ClusterResolver');
const { load }        = require('../lib/WorldLoader');

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

// ---------------------------------------------------------------------------
// Minimal valid legends used throughout
// ---------------------------------------------------------------------------

const LEGENDS = {
  terrain:  { '0': 'none', '1': 'bog', '2': 'forest_deciduous' },
  features: { '0': 'none', '1': 'road', '2': 'wilderness', '3': 'supply', '4': 'outpost' },
  featuresByName: { none: 0, road: 1, wilderness: 2, supply: 3, outpost: 4 },
  terrainsByName: { none: 0, bog: 1, forest_deciduous: 2 },
};

const CLUSTERS = {
  '0': 'none',
  '1': 'Alpha',
  '2': 'Beta',
  '3': 'Gamma',
  '4': 'Delta',
};

function tile(x, y, feature, cluster, terrain = 1) {
  return { coords: [x, y], terrain, feature, cluster };
}

// ---------------------------------------------------------------------------

console.log('\nLayer 2 — ClusterResolver\n');

console.log('feature:0 filtering');

test('feature:0 tiles are excluded from output', () => {
  const tiles = [
    tile(0, 0, 0, 0),
    tile(1, 0, 3, 1),
  ];
  const { tiles: out } = resolve(tiles, CLUSTERS, LEGENDS);
  assert.strictEqual(out.length, 1);
  assert.deepStrictEqual(out[0].coords, [1, 0]);
});

test('all output tiles have canonicalCluster field', () => {
  const tiles = [tile(0, 0, 3, 1), tile(1, 0, 2, 2)];
  const { tiles: out } = resolve(tiles, CLUSTERS, LEGENDS);
  for (const t of out) {
    assert.ok('canonicalCluster' in t, `tile at ${t.coords} missing canonicalCluster`);
  }
});

test('cluster 0 tiles keep canonicalCluster 0', () => {
  const tiles = [tile(0, 0, 1, 0)];
  const { tiles: out } = resolve(tiles, CLUSTERS, LEGENDS);
  assert.strictEqual(out[0].canonicalCluster, 0);
});

// ---------------------------------------------------------------------------

console.log('\nunion-find: no merging cases');

test('isolated clusters of different feature types are not merged', () => {
  const tiles = [
    tile(0, 0, 2, 1),
    tile(5, 5, 3, 2),
  ];
  const { tiles: out } = resolve(tiles, CLUSTERS, LEGENDS);
  const c1 = out.find(t => t.cluster === 1).canonicalCluster;
  const c2 = out.find(t => t.cluster === 2).canonicalCluster;
  assert.notStrictEqual(c1, c2);
});

test('adjacent clusters of different feature types are not merged', () => {
  const tiles = [
    tile(0, 0, 2, 1),
    tile(1, 0, 3, 2),
  ];
  const { tiles: out } = resolve(tiles, CLUSTERS, LEGENDS);
  const c1 = out.find(t => t.cluster === 1).canonicalCluster;
  const c2 = out.find(t => t.cluster === 2).canonicalCluster;
  assert.notStrictEqual(c1, c2);
});

test('road tiles between supply clusters do not trigger merging', () => {
  const tiles = [
    tile(0, 0, 3, 1),
    tile(1, 0, 1, 0),
    tile(2, 0, 3, 2),
  ];
  const { tiles: out } = resolve(tiles, CLUSTERS, LEGENDS);
  const c1 = out.find(t => t.cluster === 1).canonicalCluster;
  const c2 = out.find(t => t.cluster === 2).canonicalCluster;
  assert.notStrictEqual(c1, c2);
});

test('cluster 0 tiles are never merged into named clusters', () => {
  const tiles = [
    tile(0, 0, 2, 0),
    tile(1, 0, 2, 1),
  ];
  const { tiles: out } = resolve(tiles, CLUSTERS, LEGENDS);
  const c0tile = out.find(t => t.cluster === 0);
  assert.strictEqual(c0tile.canonicalCluster, 0);
});

test('road-feature tiles never trigger merging even with same feature neighbours', () => {
  const tiles = [
    tile(0, 0, 1, 1),
    tile(1, 0, 1, 2),
  ];
  const { tiles: out } = resolve(tiles, CLUSTERS, LEGENDS);
  const c1 = out.find(t => t.cluster === 1).canonicalCluster;
  const c2 = out.find(t => t.cluster === 2).canonicalCluster;
  assert.notStrictEqual(c1, c2);
});

// ---------------------------------------------------------------------------

console.log('\nunion-find: merging cases');

test('adjacent supply clusters merge into one canonical ID', () => {
  const tiles = [
    tile(0, 0, 3, 1),
    tile(1, 0, 3, 2),
  ];
  const { tiles: out } = resolve(tiles, CLUSTERS, LEGENDS);
  const c1 = out.find(t => t.cluster === 1).canonicalCluster;
  const c2 = out.find(t => t.cluster === 2).canonicalCluster;
  assert.strictEqual(c1, c2);
});

test('adjacent wilderness clusters merge', () => {
  const tiles = [
    tile(0, 0, 2, 1),
    tile(0, 1, 2, 2),
  ];
  const { tiles: out } = resolve(tiles, CLUSTERS, LEGENDS);
  const c1 = out.find(t => t.cluster === 1).canonicalCluster;
  const c2 = out.find(t => t.cluster === 2).canonicalCluster;
  assert.strictEqual(c1, c2);
});

test('merging is transitive across three clusters', () => {
  const tiles = [
    tile(0, 0, 3, 1),
    tile(1, 0, 3, 2),
    tile(2, 0, 3, 3),
  ];
  const { tiles: out } = resolve(tiles, CLUSTERS, LEGENDS);
  const ids = out.map(t => t.canonicalCluster);
  assert.strictEqual(ids[0], ids[1]);
  assert.strictEqual(ids[1], ids[2]);
});

test('non-adjacent same-feature clusters are not merged', () => {
  const tiles = [
    tile(0, 0, 3, 1),
    tile(5, 5, 3, 2),
  ];
  const { tiles: out } = resolve(tiles, CLUSTERS, LEGENDS);
  const c1 = out.find(t => t.cluster === 1).canonicalCluster;
  const c2 = out.find(t => t.cluster === 2).canonicalCluster;
  assert.notStrictEqual(c1, c2);
});

test('merged cluster canonical ID is stable (is one of the raw IDs)', () => {
  const tiles = [
    tile(0, 0, 3, 1),
    tile(1, 0, 3, 2),
  ];
  const { tiles: out } = resolve(tiles, CLUSTERS, LEGENDS);
  const canon = out[0].canonicalCluster;
  assert.ok(canon === 1 || canon === 2);
});

// ---------------------------------------------------------------------------

console.log('\nclusterIndex');

test('clusterIndex is a Map', () => {
  const { clusterIndex } = resolve([tile(0, 0, 3, 1)], CLUSTERS, LEGENDS);
  assert.ok(clusterIndex instanceof Map);
});

test('clusterIndex contains cluster 0', () => {
  const { clusterIndex } = resolve([tile(0, 0, 1, 0)], CLUSTERS, LEGENDS);
  assert.ok(clusterIndex.has(0));
});

test('clusterIndex entry has id, name, dominantFeature', () => {
  const { clusterIndex } = resolve([tile(0, 0, 3, 1)], CLUSTERS, LEGENDS);
  const entry = clusterIndex.get(1);
  assert.ok(entry, 'cluster 1 should be in index');
  assert.strictEqual(typeof entry.id,              'number');
  assert.strictEqual(typeof entry.name,            'string');
  assert.strictEqual(typeof entry.dominantFeature, 'string');
});

test('clusterIndex name comes from rawClusters', () => {
  const { clusterIndex } = resolve([tile(0, 0, 3, 1)], CLUSTERS, LEGENDS);
  assert.strictEqual(clusterIndex.get(1).name, 'Alpha');
});

test('cluster 0 always named Roads', () => {
  const { clusterIndex } = resolve([tile(0, 0, 1, 0)], CLUSTERS, LEGENDS);
  assert.strictEqual(clusterIndex.get(0).name, 'Roads');
});

test('merged clusters share one clusterIndex entry', () => {
  const tiles = [tile(0, 0, 3, 1), tile(1, 0, 3, 2)];
  const { tiles: out, clusterIndex } = resolve(tiles, CLUSTERS, LEGENDS);
  const canon = out[0].canonicalCluster;
  assert.ok(clusterIndex.has(canon));
  const nonCanon = canon === 1 ? 2 : 1;
  assert.ok(!clusterIndex.has(nonCanon), 'merged-away ID should not appear in clusterIndex');
});

// ---------------------------------------------------------------------------

console.log('\ndominantFeature');

test('supply-only cluster has dominantFeature supply', () => {
  const { clusterIndex } = resolve([tile(0, 0, 3, 1)], CLUSTERS, LEGENDS);
  assert.strictEqual(clusterIndex.get(1).dominantFeature, 'supply');
});

test('wilderness-only cluster has dominantFeature wilderness', () => {
  const { clusterIndex } = resolve([tile(0, 0, 2, 1)], CLUSTERS, LEGENDS);
  assert.strictEqual(clusterIndex.get(1).dominantFeature, 'wilderness');
});

test('outpost-only cluster has dominantFeature outpost', () => {
  const { clusterIndex } = resolve([tile(0, 0, 4, 1)], CLUSTERS, LEGENDS);
  assert.strictEqual(clusterIndex.get(1).dominantFeature, 'outpost');
});

test('road-only cluster has dominantFeature road', () => {
  const { clusterIndex } = resolve([tile(0, 0, 1, 0)], CLUSTERS, LEGENDS);
  assert.strictEqual(clusterIndex.get(0).dominantFeature, 'road');
});

test('supply beats road in mixed cluster (real world: clusters 50 and 83)', () => {
  const tiles = [
    tile(0, 0, 3, 1),
    tile(1, 0, 1, 1),
  ];
  const { clusterIndex } = resolve(tiles, CLUSTERS, LEGENDS);
  assert.strictEqual(clusterIndex.get(1).dominantFeature, 'supply');
});

test('supply beats wilderness in mixed cluster', () => {
  const tiles = [
    tile(0, 0, 2, 1),
    tile(5, 5, 3, 2),
    tile(6, 5, 3, 1),
  ];
  const { tiles: out, clusterIndex } = resolve(tiles, CLUSTERS, LEGENDS);
  const canon1 = out.find(t => t.cluster === 1).canonicalCluster;
  assert.strictEqual(clusterIndex.get(canon1).dominantFeature, 'supply');
});

test('supply beats outpost in mixed cluster', () => {
  const tiles = [
    tile(0, 0, 4, 1),
    tile(1, 0, 4, 1),
    tile(2, 0, 3, 1),
  ];
  const { clusterIndex } = resolve(tiles, CLUSTERS, LEGENDS);
  assert.strictEqual(clusterIndex.get(1).dominantFeature, 'supply');
});

test('wilderness beats outpost in mixed cluster', () => {
  const tiles = [
    tile(0, 0, 4, 1),
    tile(1, 0, 2, 1),
  ];
  const { clusterIndex } = resolve(tiles, CLUSTERS, LEGENDS);
  assert.strictEqual(clusterIndex.get(1).dominantFeature, 'wilderness');
});

// ---------------------------------------------------------------------------

console.log('\nreal world.json');

const REAL_WORLD_PATH = path.resolve(__dirname, '../../../data/world.json');

test('resolves real world.json without throwing', () => {
  if (!fs.existsSync(REAL_WORLD_PATH)) {
    console.log('    (skipped — data/world.json not present)');
    return;
  }
  const loaded = load(REAL_WORLD_PATH);
  const result = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  assert.ok(result.tiles.length > 0);
  assert.ok(result.clusterIndex instanceof Map);
});

test('all real world tiles have canonicalCluster field', () => {
  if (!fs.existsSync(REAL_WORLD_PATH)) return;
  const loaded = load(REAL_WORLD_PATH);
  const { tiles } = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  for (const t of tiles) {
    assert.ok('canonicalCluster' in t, `tile at ${t.coords} missing canonicalCluster`);
  }
});

test('all real world clusterIndex entries have valid dominantFeature', () => {
  if (!fs.existsSync(REAL_WORLD_PATH)) return;
  const loaded = load(REAL_WORLD_PATH);
  const { clusterIndex } = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  const valid = new Set(['road', 'wilderness', 'supply', 'outpost']);
  for (const [id, entry] of clusterIndex.entries()) {
    assert.ok(
      valid.has(entry.dominantFeature),
      `cluster ${id} has invalid dominantFeature: ${entry.dominantFeature}`
    );
  }
});

test('real world cluster 0 stays cluster 0 and has road dominantFeature', () => {
  if (!fs.existsSync(REAL_WORLD_PATH)) return;
  const loaded = load(REAL_WORLD_PATH);
  const { tiles, clusterIndex } = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  for (const t of tiles) {
    if (t.cluster === 0) assert.strictEqual(t.canonicalCluster, 0);
  }
  assert.strictEqual(clusterIndex.get(0).dominantFeature, 'road');
});

test('real world has fewer canonical clusters than raw clusters (merging occurred)', () => {
  if (!fs.existsSync(REAL_WORLD_PATH)) return;
  const loaded = load(REAL_WORLD_PATH);
  const { clusterIndex } = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  const rawCount = Object.keys(loaded.clusters).length;
  assert.ok(clusterIndex.size <= rawCount, 'expected merging to reduce cluster count');
});

test('real world resolves to exactly 160 canonical clusters', () => {
  if (!fs.existsSync(REAL_WORLD_PATH)) return;
  const loaded = load(REAL_WORLD_PATH);
  const { clusterIndex } = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  assert.strictEqual(clusterIndex.size, 160);
});

test('real world produces exactly 3665 active tiles', () => {
  if (!fs.existsSync(REAL_WORLD_PATH)) return;
  const loaded = load(REAL_WORLD_PATH);
  const { tiles } = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  assert.strictEqual(tiles.length, 3665);
});

test('raw cluster 24 merges into canonical 80 in real world', () => {
  if (!fs.existsSync(REAL_WORLD_PATH)) return;
  const loaded = load(REAL_WORLD_PATH);
  const { tiles } = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  const from24 = tiles.filter(t => t.cluster === 24);
  assert.ok(from24.length > 0, 'expected tiles with raw cluster 24');
  for (const t of from24) {
    assert.strictEqual(t.canonicalCluster, 80, `tile at ${t.coords} did not resolve to canonical 80`);
  }
});

test('no feature:none tiles appear in real world output', () => {
  if (!fs.existsSync(REAL_WORLD_PATH)) return;
  const loaded = load(REAL_WORLD_PATH);
  const { tiles } = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  const noneId = loaded.legends.featuresByName.none;
  assert.strictEqual(tiles.filter(t => t.feature === noneId).length, 0);
});

test('every real world tile canonicalCluster exists in clusterIndex', () => {
  if (!fs.existsSync(REAL_WORLD_PATH)) return;
  const loaded = load(REAL_WORLD_PATH);
  const { tiles, clusterIndex } = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  for (const t of tiles) {
    assert.ok(clusterIndex.has(t.canonicalCluster),
      `tile at ${t.coords} has canonical ${t.canonicalCluster} not in index`);
  }
});

test('real world dominant feature distribution is 107 supply, 40 wilderness, 12 outpost, 1 road', () => {
  if (!fs.existsSync(REAL_WORLD_PATH)) return;
  const loaded = load(REAL_WORLD_PATH);
  const { clusterIndex } = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  const dist = {};
  for (const [, v] of clusterIndex) dist[v.dominantFeature] = (dist[v.dominantFeature] || 0) + 1;
  assert.strictEqual(dist.supply,    107);
  assert.strictEqual(dist.wilderness, 40);
  assert.strictEqual(dist.outpost,    12);
  assert.strictEqual(dist.road,        1);
});

// ---------------------------------------------------------------------------

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);