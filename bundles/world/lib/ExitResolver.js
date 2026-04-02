// bundles/world/lib/ExitResolver.js
'use strict';

const { getRoomRef } = require('./AreaSchema');

const NEIGHBORS = [
  { dx:  1, dy:  0, direction: 'east'  },
  { dx: -1, dy:  0, direction: 'west'  },
  { dx:  0, dy:  1, direction: 'south' },
  { dx:  0, dy: -1, direction: 'north' },
];

/**
 * Computes the cardinal exits for a single tile.
 *
 * For each of the four cardinal neighbors, if a tile exists in coordMap
 * an exit is emitted pointing to that neighbor's area and room ID.
 * Neighbors with no tile in coordMap are silently omitted.
 *
 * Cross-area exits (neighbor belongs to a different canonical cluster) use
 * the fully-qualified 'areaFolder:roomId' Ranvier reference format.
 * Same-area exits use the same format — Ranvier handles both identically,
 * and consistency makes the YAML easier to reason about.
 *
 * @param {object}  tile     - resolved tile with coords and canonicalCluster
 * @param {Map}     coordMap - Map<"x,y", tile> from TileIndex
 * @returns {{ direction: string, roomId: string }[]}
 */
function resolve(tile, coordMap) {
  const [x, y] = tile.coords;
  const exits  = [];

  for (const { dx, dy, direction } of NEIGHBORS) {
    const neighbor = coordMap.get(`${x + dx},${y + dy}`);
    if (!neighbor) continue;

    exits.push({
      direction,
      roomId: getRoomRef(neighbor.canonicalCluster, neighbor.coords[0], neighbor.coords[1]),
    });
  }

  return exits;
}

module.exports = { resolve };