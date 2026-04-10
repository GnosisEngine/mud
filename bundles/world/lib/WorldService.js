// bundles/world/lib/WorldService.js
'use strict';

const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Internal builders

function _buildCentroids(clusterTiles) {
  const centroids = {};

  for (const [id, tiles] of clusterTiles.entries()) {
    if (id === 0) continue;
    let sx = 0, sy = 0;
    for (const { coords } of tiles) { sx += coords[0]; sy += coords[1]; }
    centroids[id] = [sx / tiles.length, sy / tiles.length];
  }

  return centroids;
}

function _buildRoadPairs(tiles, coordMap, featuresByName) {
  const roadId = featuresByName.road;
  const pairs = [];
  const seen = new Set();

  for (const tile of tiles) {
    if (tile.feature !== roadId) continue;
    const [x, y] = tile.coords;

    for (const [dx, dy] of DIRECTIONS) {
      const neighbor = coordMap.get(`${x + dx},${y + dy}`);
      if (!neighbor || neighbor.feature === roadId || neighbor.canonicalCluster === 0) continue;

      const key = `${x},${y}|${neighbor.coords[0]},${neighbor.coords[1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push({ road: tile, nonRoad: neighbor });
      }
    }
  }

  return pairs;
}

function _buildClusterMap(clusterTiles, clusterIndex) {
  const clusterMap = {};

  for (const [id, tiles] of clusterTiles.entries()) {
    const entry = clusterIndex.get(id);
    const name = entry ? entry.name : `Cluster(${id})`;
    clusterMap[id] = { id, name, rooms: tiles };
  }

  return clusterMap;
}

// A* pathfinding

function _getPath(startCoords, endCoords, coordMap, clusterMap) {
  const [ex, ey] = endCoords;
  const endKey = `${Math.round(ex)},${Math.round(ey)}`;
  const endTile = coordMap.get(endKey);
  const endCluster = endTile ? endTile.canonicalCluster : null;

  const h = (x, y) => Math.abs(x - ex) + Math.abs(y - ey);

  const startKey = `${Math.round(startCoords[0])},${Math.round(startCoords[1])}`;
  const gScore = new Map([[startKey, 0]]);
  const fScore = new Map([[startKey, h(...startCoords)]]);
  const prev = new Map([[startKey, null]]);
  const open = new Set([startKey]);

  let foundKey = null;

  while (open.size) {
    let cur = null, bestF = Infinity;
    for (const node of open) {
      const f = fScore.get(node);
      if (f < bestF) { bestF = f; cur = node; }
    }
    open.delete(cur);

    const curTile = coordMap.get(cur);
    if (curTile && endCluster && curTile.canonicalCluster === endCluster) { foundKey = cur; break; }
    if (cur === endKey) { foundKey = cur; break; }

    const [x, y] = cur.split(',').map(Number);
    const ng = (gScore.get(cur) ?? 0) + 1;

    for (const [dx, dy] of DIRECTIONS) {
      const nx = x + dx, ny = y + dy;
      const nk = `${nx},${ny}`;
      if (!coordMap.has(nk)) continue;
      if (ng < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, ng);
        fScore.set(nk, ng + h(nx, ny));
        prev.set(nk, cur);
        open.add(nk);
      }
    }
  }

  if (!foundKey) return null;

  const tilePath = [];
  for (let cur = foundKey; cur !== null; cur = prev.get(cur)) tilePath.unshift(cur);

  const clusters = [];
  const coords = [];
  let lastCluster = null;

  for (const key of tilePath) {
    const t = coordMap.get(key);
    if (!t) continue;
    coords.push(t.coords);
    if (t.canonicalCluster !== 0 && t.canonicalCluster !== lastCluster) {
      clusters.push(clusterMap[t.canonicalCluster]);
      lastCluster = t.canonicalCluster;
    }
  }

  return { clusters, coords };
}

// Factory

/**
 * Builds the WorldService from the outputs of the three preceding layers.
 *
 * @param {object} loaded   - result of WorldLoader.load()
 * @param {object} resolved - result of ClusterResolver.resolve()
 * @param {object} index    - result of TileIndex.build()
 * @returns {object} WorldService — registered as state.WorldManager at runtime
 */
function build(loaded, resolved, index) {
  const { legends } = loaded;
  const { tiles, clusterIndex } = resolved;
  const { coordMap, clusterTiles } = index;

  const centroids = _buildCentroids(clusterTiles);
  const roadPairs = _buildRoadPairs(tiles, coordMap, legends.featuresByName);
  const clusterMap = _buildClusterMap(clusterTiles, clusterIndex);

  return {

    /**
     * Returns the terrain name string for a Ranvier room.
     * Reads room.coordinates.{x, y} and maps to the world tile terrain name.
     * Returns null if the room has no coordinates or no matching tile.
     */
    getTerrainForRoom(room) {
      if (!room || !room.coordinates) return null;
      const { x, y } = room.coordinates;
      if (x === undefined || y === undefined) return null;
      const tile = coordMap.get(`${x},${y}`);
      if (!tile) return null;
      return legends.terrain[String(tile.terrain)] ?? null;
    },

    /**
     * Returns the tile at the given grid coordinates, or null.
     */
    getEntryByCoords(x, y) {
      return coordMap.get(`${x},${y}`) ?? null;
    },

    /**
     * Returns the full cluster map: { [canonicalId]: { id, name, rooms[] } }
     */
    getClusters() {
      return clusterMap;
    },

    /**
     * Returns all road↔named-cluster adjacency pairs.
     * Each pair: { road: tile, nonRoad: tile }
     */
    getRoadPairs() {
      return roadPairs;
    },

    /**
     * A* path between two [x, y] coordinate arrays.
     * Returns { clusters[], coords[] } or null if no path exists.
     */
    getPath(startCoords, endCoords) {
      return _getPath(startCoords, endCoords, coordMap, clusterMap);
    },

    /**
     * A* path between two canonical cluster IDs, seeded from their centroids.
     * Returns { clusters[], coords[] } or null.
     */
    getPathBetweenClusters(startId, endId) {
      const start = centroids[startId];
      const end = centroids[endId];
      if (!start || !end) return null;
      return _getPath(start, end, coordMap, clusterMap);
    },

    /**
     * Returns the compass direction from one adjacent coord to another.
     * Returns null if coords are not adjacent.
     */
    getDirection(from, to) {
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      if (dx === 1 && dy === 0) return 'east';
      if (dx === -1 && dy === 0) return 'west';
      if (dx === 0 && dy === 1) return 'north';
      if (dx === 0 && dy === -1) return 'south';
      return null;
    },

    /**
     * Returns the clusterIndex Map for generator and internal use.
     */
    getClusterIndex() {
      return clusterIndex;
    },
  };
}

module.exports = { build };
