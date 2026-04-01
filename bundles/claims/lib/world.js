/**
 * world.js
 *
 * Loads and indexes the game world from data/world.json.
 *
 * The world is a grid of tiles, each with:
 *   - coords:  [x, y] position on the grid
 *   - terrain: terrain type ID (see world.legends.terrain)
 *   - feature: gameplay feature ID (see world.legends.features)
 *              0 = none (unused), 1 = road, 2 = wilderness,
 *              3 = supply, 4 = outpost
 *   - cluster: ID of the named area this tile belongs to (0 = unnamed)
 *
 * On load, feature:0 tiles are stripped entirely. Clusters of the same
 * feature type that are physically adjacent (without a road between them)
 * are merged into one logical cluster using union-find.
 *
 * Exports:
 *   world          — filtered/merged map data
 *   coordMap       — Map<"x,y", tile> for O(1) tile lookup
 *   pairs          — road↔cluster adjacency pairs
 *   centroids      — Map<clusterId, [avgX, avgY]>
 *   clusterMap     — Map<clusterId, { id, name, rooms[] }>
 *   getEntryByCoords(x, y)                    → tile | null
 *   getClusters()                             → clusterMap
 *   getRoadPairs()                            → pairs[]
 *   getPathBetweenClusters(startId, endId)    → { clusters[], coords[] } | null
 */

const fs   = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'data', 'world.json'), 'utf8'));
//const raw        = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'data', 'world.json'), 'utf8'));
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// ---------------------------------------------------------------------------
// Union-Find
// Used to merge logically identical clusters that appear as separate IDs in
// the raw data (e.g. two adjacent supply tiles that form one continuous area).
// ---------------------------------------------------------------------------

const parent = {};

/**
 * Returns the canonical root ID for a cluster, with path compression.
 * @param {number} id
 * @returns {number}
 */
function find(id) {
  if (parent[id] === undefined) parent[id] = id;
  if (parent[id] !== id) parent[id] = find(parent[id]);
  return parent[id];
}

/**
 * Merges two clusters into the same logical group.
 * @param {number} a
 * @param {number} b
 */
function union(a, b) {
  parent[find(a)] = find(b);
}

// ---------------------------------------------------------------------------
// Cluster merging
// Build a temporary coord index from all non-empty tiles, then walk each
// non-road cluster tile. If it directly touches another cluster tile of the
// same feature type (with no road in between), union them — they are the
// same logical area split across multiple raw cluster IDs.
// ---------------------------------------------------------------------------

const rawCoordMap = new Map();
for (const entry of raw.map) {
  if (entry.feature !== 0) {
    rawCoordMap.set(`${entry.coords[0]},${entry.coords[1]}`, entry);
  }
}

for (const entry of rawCoordMap.values()) {
  if (entry.cluster === 0 || entry.feature === 1) continue;
  const [x, y] = entry.coords;
  for (const [dx, dy] of DIRECTIONS) {
    const neighbor = rawCoordMap.get(`${x + dx},${y + dy}`);
    if (
      neighbor &&
      neighbor.cluster !== 0 &&
      neighbor.feature !== 1 &&
      neighbor.cluster !== entry.cluster &&
      neighbor.feature === entry.feature  // only merge tiles of the same type
    ) {
      union(entry.cluster, neighbor.cluster);
    }
  }
}

// ---------------------------------------------------------------------------
// World map
// Strip feature:0 tiles (unused expansion placeholders) and apply merged
// cluster IDs so all downstream code works with canonical cluster roots.
// ---------------------------------------------------------------------------

const world = {
  ...raw,
  map: raw.map
    .filter(e => e.feature !== 0)
    .map(e => ({ ...e, cluster: e.cluster !== 0 ? find(e.cluster) : 0 }))
};

// ---------------------------------------------------------------------------
// Coord index
// Primary lookup table for all gameplay tiles. Used by pathfinding,
// adjacency checks, and the public getEntryByCoords() API.
// ---------------------------------------------------------------------------

const coordMap = new Map();
for (const entry of world.map) {
  coordMap.set(`${entry.coords[0]},${entry.coords[1]}`, entry);
}

// ---------------------------------------------------------------------------
// Road pairs
// A "pair" is a unique (road tile, adjacent cluster tile) edge. This captures
// every point where a road enters or exits a named cluster, and is the basis
// for understanding how the road network connects clusters.
// ---------------------------------------------------------------------------

/**
 * Returns all unique pairs of a road tile and an adjacent named cluster tile.
 * @returns {{ road: tile, nonRoad: tile }[]}
 */
function getRoadPairs() {
  const pairs = [];
  const seen  = new Set();

  for (const entry of world.map) {
    if (entry.feature !== 1) continue;
    const [x, y] = entry.coords;

    for (const [dx, dy] of DIRECTIONS) {
      const neighbor = coordMap.get(`${x + dx},${y + dy}`);
      if (!neighbor || neighbor.feature === 1 || neighbor.cluster === 0) continue;

      const key = `${x},${y}|${neighbor.coords[0]},${neighbor.coords[1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push({ road: entry, nonRoad: neighbor });
      }
    }
  }

  return pairs;
}

const pairs = getRoadPairs();

// ---------------------------------------------------------------------------
// Cluster centroids
// The geometric center of each cluster, computed as the average x and y
// of all its tiles. Used as the A* start/goal and heuristic anchor.
// ---------------------------------------------------------------------------

const centroids = (() => {
  const sums   = {};
  const counts = {};

  for (const { coords, cluster } of world.map) {
    if (cluster === 0) continue;
    if (!sums[cluster]) { sums[cluster] = [0, 0]; counts[cluster] = 0; }
    sums[cluster][0] += coords[0];
    sums[cluster][1] += coords[1];
    counts[cluster]++;
  }

  const result = {};
  for (const id of Object.keys(sums)) {
    result[id] = [sums[id][0] / counts[id], sums[id][1] / counts[id]];
  }
  return result;
})();

// ---------------------------------------------------------------------------
// Cluster map
// Pre-built index of every named cluster and its member tiles. Built once at
// module load so getClusters() and getPathBetweenClusters() share the same
// instances without repeated allocation.
// ---------------------------------------------------------------------------

const clusterMap = (() => {
  const clusters = {};
  for (const entry of world.map) {
    const { cluster: id } = entry;
    if (!clusters[id]) {
      clusters[id] = { id, name: raw.clusters[id] ?? `Merged(${id})`, rooms: [] };
    }
    clusters[id].rooms.push(entry);
  }
  return clusters;
})();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the tile at the given grid coordinates, or null if none exists.
 * @param {number} x
 * @param {number} y
 * @returns {tile | null}
 */
function getEntryByCoords(x, y) {
  return coordMap.get(`${x},${y}`) ?? null;
}

/**
 * Returns the full cluster index: { [clusterId]: { id, name, rooms[] } }
 * @returns {object}
 */
function getClusters() {
  return clusterMap;
}

/**
 * Finds the shortest traversable path between two grid coordinates using A*.
 *
 * Searches outward across all gameplay tiles (roads, wilderness, supply,
 * outpost). The search terminates when any tile belonging to the same cluster
 * as the end coord is reached.
 *
 * @param {number[]} startCoords - [x, y] origin
 * @param {number[]} endCoords   - [x, y] destination
 * @returns {{ clusters: object[], coords: number[][] } | null}
 */
function getPath(startCoords, endCoords) {
  const [ex, ey] = endCoords;
  const endKey   = `${Math.round(ex)},${Math.round(ey)}`;
  const endTile  = coordMap.get(endKey);
  const endCluster = endTile ? find(endTile.cluster) : null;

  // Manhattan distance to end coord — admissible heuristic for grid A*
  const h = (x, y) => Math.abs(x - ex) + Math.abs(y - ey);

  const startKey = `${Math.round(startCoords[0])},${Math.round(startCoords[1])}`;
  const gScore   = new Map([[startKey, 0]]);
  const fScore   = new Map([[startKey, h(...startCoords)]]);
  const prev     = new Map([[startKey, null]]);
  const open     = new Set([startKey]);

  let foundKey = null;

  while (open.size) {
    // Select the open node with the lowest f score
    let cur = null, bestF = Infinity;
    for (const node of open) {
      const f = fScore.get(node);
      if (f < bestF) { bestF = f; cur = node; }
    }
    open.delete(cur);

    // Stop as soon as we step onto any tile in the destination cluster
    const curTile = coordMap.get(cur);
    if (curTile && endCluster && find(curTile.cluster) === endCluster) { foundKey = cur; break; }
    if (cur === endKey) { foundKey = cur; break; }

    const [x, y] = cur.split(',').map(Number);
    const ng = (gScore.get(cur) ?? 0) + 1;

    for (const [dx, dy] of DIRECTIONS) {
      const nx = x + dx, ny = y + dy;
      const nk = `${nx},${ny}`;
      if (!coordMap.has(nk)) continue; // tile doesn't exist — impassable
      if (ng < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, ng);
        fScore.set(nk, ng + h(nx, ny));
        prev.set(nk, cur);
        open.add(nk);
      }
    }
  }

  if (!foundKey) return null;

  // Reconstruct the tile-level path by walking backwards through prev
  const tilePath = [];
  for (let cur = foundKey; cur !== null; cur = prev.get(cur)) tilePath.unshift(cur);

  // Collect coords and unique named clusters in traversal order
  const clusters = [];
  const coords   = [];
  let lastCluster = null;

  for (const key of tilePath) {
    const tile = coordMap.get(key);
    if (!tile) continue;
    coords.push(tile.coords);
    if (tile.cluster !== 0 && tile.cluster !== lastCluster) {
      clusters.push(clusterMap[tile.cluster]);
      lastCluster = tile.cluster;
    }
  }

  return { clusters, coords };
}

/**
 * Finds the shortest traversable path between two clusters using A*.
 * Resolves each cluster to its centroid and delegates to getPath().
 *
 * @param {number} startClusterId
 * @param {number} endClusterId
 * @returns {{ clusters: object[], coords: number[][] } | null}
 */
function getPathBetweenClusters(startClusterId, endClusterId) {
  const startCentroid = centroids[find(startClusterId)];
  const endCentroid   = centroids[find(endClusterId)];
  if (!startCentroid || !endCentroid) return null;
  return getPath(startCentroid, endCentroid);
}

/**
 * Returns the compass direction needed to move from one coord to another.
 * The two coords must be adjacent (one step apart on either axis).
 *
 * @param {number[]} from - [x, y] origin coord
 * @param {number[]} to   - [x, y] destination coord
 * @returns {'north' | 'south' | 'east' | 'west' | null} null if not adjacent
 */
function getDirection(from, to) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];

  if (dx === 1  && dy === 0) return 'east';
  if (dx === -1 && dy === 0) return 'west';
  if (dx === 0  && dy === 1) return 'south';
  if (dx === 0  && dy === -1) return 'north';

  return null;
}

module.exports = {
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
};