// bundles/world/lib/TileIndex.js
'use strict';

/**
 * Builds O(1) lookup structures from resolved tiles.
 *
 * @param {object[]} resolvedTiles - tiles from ClusterResolver (feature !== 0, canonicalCluster set)
 * @returns {{ coordMap: Map, clusterTiles: Map }}
 *
 * coordMap:     Map<"x,y", tile>          — spatial lookup by coordinate string
 * clusterTiles: Map<canonicalId, tile[]>  — all tiles grouped by canonical cluster
 */
function build(resolvedTiles) {
  const coordMap = new Map();
  const clusterTiles = new Map();

  for (const tile of resolvedTiles) {
    const key = `${tile.coords[0]},${tile.coords[1]}`;
    coordMap.set(key, tile);

    const id = tile.canonicalCluster;
    if (!clusterTiles.has(id)) clusterTiles.set(id, []);
    clusterTiles.get(id).push(tile);
  }

  return { coordMap, clusterTiles };
}

module.exports = { build };