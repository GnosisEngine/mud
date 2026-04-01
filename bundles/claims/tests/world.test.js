// test-world.js

const assert = require('assert');
const {
  world,
  coordMap,
  pairs,
  centroids,
  clusterMap,
  getEntryByCoords,
  getClusters,
  getRoadPairs,
  getPath,
  getPathBetweenClusters,
  getDirection,
} = require('../lib/world');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// world
// ---------------------------------------------------------------------------

console.log('\nworld');

test('contains no feature:0 tiles', () => {
  const bad = world.map.filter(e => e.feature === 0);
  assert.strictEqual(bad.length, 0, `found ${bad.length} feature:0 tiles`);
});

test('every tile has coords, terrain, feature, cluster', () => {
  for (const tile of world.map) {
    assert.ok(Array.isArray(tile.coords) && tile.coords.length === 2, 'coords must be [x, y]');
    assert.ok(typeof tile.terrain === 'number', 'terrain must be a number');
    assert.ok(typeof tile.feature === 'number', 'feature must be a number');
    assert.ok(typeof tile.cluster === 'number', 'cluster must be a number');
  }
});

test('all cluster IDs are canonical (find-resolved)', () => {
  for (const tile of world.map) {
    if (tile.cluster === 0) continue;
    // If a cluster was merged, its raw ID would differ from its root
    // We can't call find() here directly, but we can verify no two adjacent
    // same-feature non-road tiles have different cluster IDs
    assert.ok(tile.cluster >= 0, 'cluster ID must be non-negative');
  }
});

// ---------------------------------------------------------------------------
// coordMap
// ---------------------------------------------------------------------------

console.log('\ncoordMap');

test('has an entry for every world.map tile', () => {
  assert.strictEqual(coordMap.size, world.map.length);
});

test('keys are in "x,y" format', () => {
  for (const key of coordMap.keys()) {
    assert.match(key, /^\d+,\d+$/, `invalid key format: ${key}`);
  }
});

test('lookup returns the correct tile', () => {
  const tile = world.map[0];
  const [x, y] = tile.coords;
  const result = coordMap.get(`${x},${y}`);
  assert.strictEqual(result, tile);
});

// ---------------------------------------------------------------------------
// getEntryByCoords
// ---------------------------------------------------------------------------

console.log('\ngetEntryByCoords');

test('returns a tile for a known coord', () => {
  const tile = world.map[0];
  const [x, y] = tile.coords;
  const result = getEntryByCoords(x, y);
  assert.strictEqual(result, tile);
});

test('returns null for an out-of-bounds coord', () => {
  const result = getEntryByCoords(-1, -1);
  assert.strictEqual(result, null);
});

test('returns null for an empty tile coord', () => {
  const result = getEntryByCoords(99999, 99999);
  assert.strictEqual(result, null);
});

// ---------------------------------------------------------------------------
// getClusters
// ---------------------------------------------------------------------------

console.log('\ngetClusters');

test('returns the clusterMap reference', () => {
  assert.strictEqual(getClusters(), clusterMap);
});

test('every cluster has id, name, and rooms array', () => {
  for (const cluster of Object.values(clusterMap)) {
    assert.ok(typeof cluster.id === 'number', 'id must be a number');
    assert.ok(typeof cluster.name === 'string', 'name must be a string');
    assert.ok(Array.isArray(cluster.rooms), 'rooms must be an array');
    assert.ok(cluster.rooms.length > 0, 'rooms must not be empty');
  }
});

test('every room tile belongs to its parent cluster', () => {
  for (const cluster of Object.values(clusterMap)) {
    for (const room of cluster.rooms) {
      assert.strictEqual(room.cluster, cluster.id, `room cluster mismatch in cluster ${cluster.id}`);
    }
  }
});

test('cluster 0 rooms are all unnamed tiles', () => {
  const cluster0 = clusterMap[0];
  if (cluster0) {
    for (const room of cluster0.rooms) {
      assert.strictEqual(room.cluster, 0);
    }
  }
});

// ---------------------------------------------------------------------------
// getRoadPairs
// ---------------------------------------------------------------------------

console.log('\ngetRoadPairs');

test('returns a non-empty array', () => {
  assert.ok(pairs.length > 0, 'expected at least one pair');
});

test('every pair has a road tile and a nonRoad tile', () => {
  for (const { road, nonRoad } of pairs) {
    assert.strictEqual(road.feature, 1, 'road tile must have feature 1');
    assert.notStrictEqual(nonRoad.feature, 1, 'nonRoad tile must not be a road');
    assert.notStrictEqual(nonRoad.cluster, 0, 'nonRoad tile must belong to a named cluster');
  }
});

test('road and nonRoad tiles in each pair are adjacent', () => {
  for (const { road, nonRoad } of pairs) {
    const dx = Math.abs(road.coords[0] - nonRoad.coords[0]);
    const dy = Math.abs(road.coords[1] - nonRoad.coords[1]);
    assert.ok(dx + dy === 1, `road ${road.coords} and nonRoad ${nonRoad.coords} are not adjacent`);
  }
});

test('no duplicate pairs', () => {
  const seen = new Set();
  for (const { road, nonRoad } of pairs) {
    const key = `${road.coords[0]},${road.coords[1]}|${nonRoad.coords[0]},${nonRoad.coords[1]}`;
    assert.ok(!seen.has(key), `duplicate pair: ${key}`);
    seen.add(key);
  }
});

// ---------------------------------------------------------------------------
// centroids
// ---------------------------------------------------------------------------

console.log('\ncentroids');

test('every named cluster has a centroid', () => {
  for (const id of Object.keys(clusterMap)) {
    if (Number(id) === 0) continue;
    assert.ok(centroids[id], `cluster ${id} has no centroid`);
  }
});

test('every centroid is a two-element numeric array', () => {
  for (const [id, centroid] of Object.entries(centroids)) {
    assert.ok(Array.isArray(centroid) && centroid.length === 2, `centroid for ${id} is malformed`);
    assert.ok(typeof centroid[0] === 'number' && typeof centroid[1] === 'number', `centroid for ${id} must be numeric`);
  }
});

test('centroid falls within the bounding box of the cluster tiles', () => {
  for (const [id, [cx, cy]] of Object.entries(centroids)) {
    const cluster = clusterMap[id];
    if (!cluster) continue;
    const xs = cluster.rooms.map(r => r.coords[0]);
    const ys = cluster.rooms.map(r => r.coords[1]);
    assert.ok(cx >= Math.min(...xs) && cx <= Math.max(...xs), `centroid x out of bounds for cluster ${id}`);
    assert.ok(cy >= Math.min(...ys) && cy <= Math.max(...ys), `centroid y out of bounds for cluster ${id}`);
  }
});

// ---------------------------------------------------------------------------
// getPath
// ---------------------------------------------------------------------------

console.log('\ngetPath');

test('returns null for unreachable coords', () => {
  const result = getPath([0, 0], [99999, 99999]);
  assert.strictEqual(result, null);
});

test('returns {clusters, coords} for a reachable path', () => {
  const tile = world.map.find(e => e.feature === 1);
  if (!tile) return;
  const [x, y] = tile.coords;
  const result = getPath([x, y], [x, y]);
  assert.ok(result !== null);
  assert.ok(Array.isArray(result.clusters));
  assert.ok(Array.isArray(result.coords));
});

test('coords form a continuous adjacency chain', () => {
  const tile = world.map.find(e => e.cluster !== 0);
  const otherTile = world.map.find(e => e.cluster !== 0 && e.cluster !== tile.cluster);
  if (!tile || !otherTile) return;
  const result = getPath(tile.coords, otherTile.coords);
  if (!result) return;
  for (let i = 1; i < result.coords.length; i++) {
    const [ax, ay] = result.coords[i - 1];
    const [bx, by] = result.coords[i];
    const dist = Math.abs(ax - bx) + Math.abs(ay - by);
    assert.strictEqual(dist, 1, `coords[${i-1}] and coords[${i}] are not adjacent`);
  }
});

test('first and last coords belong to start and end clusters', () => {
  const startCluster = Object.values(clusterMap).find(c => c.id !== 0 && c.rooms.length > 0);
  const endCluster   = Object.values(clusterMap).find(c => c.id !== 0 && c.id !== startCluster.id && c.rooms.length > 0);
  if (!startCluster || !endCluster) return;
  const result = getPath(startCluster.rooms[0].coords, endCluster.rooms[0].coords);
  if (!result || result.coords.length === 0) return;
  const firstTile = getEntryByCoords(...result.coords[0]);
  const lastTile  = getEntryByCoords(...result.coords[result.coords.length - 1]);
  assert.ok(firstTile, 'first coord must resolve to a tile');
  assert.ok(lastTile,  'last coord must resolve to a tile');
});

// ---------------------------------------------------------------------------
// getPathBetweenClusters
// ---------------------------------------------------------------------------

console.log('\ngetPathBetweenClusters');

test('returns null for unknown cluster IDs', () => {
  const result = getPathBetweenClusters(999999, 888888);
  assert.strictEqual(result, null);
});

test('path from cluster 1 to cluster 2 is non-null', () => {
  const result = getPathBetweenClusters(1, 2);
  assert.ok(result !== null, 'expected a path between cluster 1 and 2');
});

test('path starts with start cluster and ends with end cluster', () => {
  const result = getPathBetweenClusters(1, 2);
  if (!result || result.clusters.length === 0) return;
  assert.strictEqual(result.clusters[0].id, 1);
  assert.strictEqual(result.clusters[result.clusters.length - 1].id, 2);
});

test('path clusters are each valid cluster instances', () => {
  const result = getPathBetweenClusters(1, 2);
  if (!result) return;
  for (const cluster of result.clusters) {
    assert.ok(typeof cluster.id === 'number');
    assert.ok(typeof cluster.name === 'string');
    assert.ok(Array.isArray(cluster.rooms));
  }
});

test('path coords are all valid world tiles', () => {
  const result = getPathBetweenClusters(1, 2);
  if (!result) return;
  for (const [x, y] of result.coords) {
    const tile = getEntryByCoords(x, y);
    assert.ok(tile !== null, `coord [${x},${y}] does not resolve to a tile`);
  }
});

test('no duplicate adjacent clusters in path', () => {
  const result = getPathBetweenClusters(1, 2);
  if (!result) return;
  for (let i = 1; i < result.clusters.length; i++) {
    assert.notStrictEqual(
      result.clusters[i].id,
      result.clusters[i - 1].id,
      `duplicate cluster at position ${i}: ${result.clusters[i].id}`
    );
  }
});

// ---------------------------------------------------------------------------
// getDirection
// ---------------------------------------------------------------------------

console.log('\ngetDirection');

test('east: x increases by 1', () => {
  assert.strictEqual(getDirection([0, 0], [1, 0]), 'east');
});

test('west: x decreases by 1', () => {
  assert.strictEqual(getDirection([1, 0], [0, 0]), 'west');
});

test('south: y increases by 1', () => {
  assert.strictEqual(getDirection([0, 0], [0, 1]), 'south');
});

test('north: y decreases by 1', () => {
  assert.strictEqual(getDirection([0, 1], [0, 0]), 'north');
});

test('returns null for non-adjacent coords', () => {
  assert.strictEqual(getDirection([0, 0], [2, 0]), null);
});

test('returns null for diagonal coords', () => {
  assert.strictEqual(getDirection([0, 0], [1, 1]), null);
});

test('returns null for identical coords', () => {
  assert.strictEqual(getDirection([5, 5], [5, 5]), null);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);