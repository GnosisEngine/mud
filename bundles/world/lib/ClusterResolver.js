// bundles/world/lib/ClusterResolver.js
'use strict';

// ---------------------------------------------------------------------------
// MAINTENANCE CONTRACT
// The union-find logic here is the single canonical implementation for the
// entire project. claims/lib/world.js previously duplicated this logic and
// has been removed. Any change to cluster-merging behaviour must be made
// here and reflected in tests — never duplicated elsewhere.
// ---------------------------------------------------------------------------

const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Feature name priority for dominantFeature resolution.
// Higher index = higher priority. supply beats wilderness beats outpost beats road.
const FEATURE_PRIORITY = ['road', 'outpost', 'wilderness', 'supply'];

// ---------------------------------------------------------------------------
// Union-Find
// ---------------------------------------------------------------------------

function _makeUF() {
  const parent = {};

  function find(id) {
    if (parent[id] === undefined) parent[id] = id;
    if (parent[id] !== id) parent[id] = find(parent[id]);
    return parent[id];
  }

  function union(a, b) {
    parent[find(a)] = find(b);
  }

  return { find, union };
}

// ---------------------------------------------------------------------------
// Dominant feature
// The highest-priority feature present across all tiles in a cluster.
// Expressed as a feature name string, never an integer.
// ---------------------------------------------------------------------------

function _dominantFeature(featureNames) {
  let best = -1;
  let bestName = null;

  for (const name of featureNames) {
    const priority = FEATURE_PRIORITY.indexOf(name);
    if (priority > best) {
      best = priority;
      bestName = name;
    }
  }

  return bestName;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolves raw world tiles into canonical cluster assignments.
 *
 * @param {object[]} rawTiles    - tiles array from WorldLoader (includes feature:0)
 * @param {object}   rawClusters - clusters object from WorldLoader { "0": "none", ... }
 * @param {object}   legends     - legends object from WorldLoader (with featuresByName)
 * @returns {{ tiles: object[], clusterIndex: Map }}
 *
 * tiles:        feature !== 0 only, each with canonicalCluster field added
 * clusterIndex: Map<canonicalId, { id, name, dominantFeature }>
 */
function resolve(rawTiles, rawClusters, legends) {
  const { featuresByName } = legends;
  const roadFeatureId = featuresByName.road;
  const noneFeatureId = featuresByName.none;

  // Build a temporary coord index from all non-empty tiles for adjacency checks
  const rawCoordMap = new Map();
  for (const tile of rawTiles) {
    if (tile.feature !== noneFeatureId) {
      rawCoordMap.set(`${tile.coords[0]},${tile.coords[1]}`, tile);
    }
  }

  const uf = _makeUF();

  // Walk every non-road, non-zero-cluster tile.
  // If it touches a neighbour with a different cluster ID but the same feature
  // type, union them — they are one logical area split across raw IDs.
  for (const tile of rawCoordMap.values()) {
    if (tile.cluster === 0 || tile.feature === roadFeatureId) continue;

    const [x, y] = tile.coords;
    for (const [dx, dy] of DIRECTIONS) {
      const neighbor = rawCoordMap.get(`${x + dx},${y + dy}`);
      if (
        neighbor &&
        neighbor.cluster !== 0 &&
        neighbor.feature !== roadFeatureId &&
        neighbor.cluster !== tile.cluster &&
        neighbor.feature === tile.feature
      ) {
        uf.union(tile.cluster, neighbor.cluster);
      }
    }
  }

  // Filter to non-empty tiles and attach canonicalCluster
  const tiles = rawTiles
    .filter(t => t.feature !== noneFeatureId)
    .map(t => ({
      ...t,
      canonicalCluster: t.cluster !== 0 ? uf.find(t.cluster) : 0,
    }));

  // ---------------------------------------------------------------------------
  // Build clusterIndex
  // For each canonical ID, collect all raw IDs that resolved to it, gather
  // their feature names, pick the name from the lowest raw cluster ID.
  // ---------------------------------------------------------------------------

  const featureNameById = {};
  for (const [id, name] of Object.entries(legends.features)) {
    featureNameById[Number(id)] = name;
  }

  // rawId → canonicalId mapping (only for named, non-zero raw clusters)
  const canonicalOf = {};
  for (const tile of rawTiles) {
    if (tile.cluster !== 0) {
      canonicalOf[tile.cluster] = uf.find(tile.cluster);
    }
  }

  // Group raw cluster IDs by their canonical root
  const rawIdsByCanonical = {};
  for (const [rawId, canonId] of Object.entries(canonicalOf)) {
    if (!rawIdsByCanonical[canonId]) rawIdsByCanonical[canonId] = [];
    rawIdsByCanonical[canonId].push(Number(rawId));
  }

  // Collect feature names per canonical cluster from its tiles
  const featureNamesPerCanonical = {};
  for (const tile of tiles) {
    const cid = tile.canonicalCluster;
    const name = featureNameById[tile.feature] || null;
    if (!featureNamesPerCanonical[cid]) featureNamesPerCanonical[cid] = new Set();
    if (name) featureNamesPerCanonical[cid].add(name);
  }

  const clusterIndex = new Map();

  // Named clusters (non-zero)
  for (const [canonIdStr, rawIds] of Object.entries(rawIdsByCanonical)) {
    const canonId = Number(canonIdStr);
    const lowestId = rawIds.sort((a, b) => a - b)[0];
    const name = rawClusters[String(lowestId)] || `Cluster ${lowestId}`;
    const featureNames = featureNamesPerCanonical[canonId]
      ? [...featureNamesPerCanonical[canonId]]
      : [];

    clusterIndex.set(canonId, {
      id: canonId,
      name,
      dominantFeature: _dominantFeature(featureNames),
    });
  }

  // Cluster 0 — the unnamed road backbone.
  // Regardless of any stray supply or wilderness tiles that the world editor
  // may have left unassigned, cluster 0 is always road-dominant so the roads
  // area never becomes a resource-spawning zone.
  clusterIndex.set(0, { id: 0, name: 'Roads', dominantFeature: 'road' });

  return { tiles, clusterIndex };
}

module.exports = { resolve };