// bundles/vendor-npcs/lib/MercPathfinder.js
'use strict';

// Maximum number of consecutive path coordinates to scan forward when the
// current coord has no matching exit. World tiles outnumber Ranvier rooms,
// so gaps in coverage are expected and must be skipped silently.
const MAX_LOOKAHEAD = 10;

/**
 * Compute an A* path from one room to another using the WorldManager.
 * Returns the ordered list of [x, y] coordinate pairs the merc must pass
 * through, or null if no path exists or either room lacks coordinates.
 *
 * The first element of the returned array corresponds to the first step
 * AWAY from fromRoom (i.e. fromRoom itself is not included).
 *
 * @param {Room}   fromRoom
 * @param {Room}   toRoom
 * @param {object} worldManager — state.WorldManager
 * @returns {number[][]|null}
 */
function computePath(fromRoom, toRoom, worldManager) {
  if (!fromRoom.coordinates || !toRoom.coordinates) return null;

  const startCoords = [fromRoom.coordinates.x, fromRoom.coordinates.y];
  const endCoords   = [toRoom.coordinates.x,   toRoom.coordinates.y];

  const result = worldManager.getPath(startCoords, endCoords);
  if (!result || !result.coords || result.coords.length === 0) return null;

  // Drop the first coord if it matches the starting room's own position —
  // the merc is already there and should not "step onto" their current tile.
  const coords = result.coords;
  const first = coords[0];
  if (first[0] === startCoords[0] && first[1] === startCoords[1]) {
    return coords.slice(1);
  }
  return coords;
}

/**
 * Advance one step along a cached coord path by matching the next target
 * coordinate against the NPC's current room exits.
 *
 * Scans forward up to MAX_LOOKAHEAD positions when a coordinate has no
 * matching exit (world tile with no Ranvier room, or no reachable exit).
 * Skips exits that are blocked by a locked or closed door.
 *
 * @param {Npc}    npc
 * @param {number[][]} path       — full coords array from computePath
 * @param {number}     pathIndex  — next index to attempt
 * @param {object}     state      — Ranvier GameState
 * @returns {{ room: Room, newIndex: number }|null}
 *   null if path is exhausted, fully blocked, or stale
 */
function nextStep(npc, path, pathIndex, state) {
  if (pathIndex >= path.length) return null;

  const exits = npc.room.getExits();

  // Build a map of coord key → { exit, destRoom } for the current exits so
  // we only resolve each exit's destination room once per tick.
  const exitMap = new Map();
  for (const exit of exits) {
    const destRoom = state.RoomManager.getRoom(exit.roomId);
    if (!destRoom || !destRoom.coordinates) continue;

    const door = npc.room.getDoor(destRoom) || destRoom.getDoor(npc.room);
    if (door && (door.locked || door.closed)) continue;

    const key = `${destRoom.coordinates.x},${destRoom.coordinates.y}`;
    if (!exitMap.has(key)) {
      exitMap.set(key, { exit, destRoom });
    }
  }

  // Scan forward from pathIndex, skipping coords with no matching exit.
  const limit = Math.min(pathIndex + MAX_LOOKAHEAD, path.length);
  for (let i = pathIndex; i < limit; i++) {
    const coord = path[i];
    const key = `${coord[0]},${coord[1]}`;
    const match = exitMap.get(key);
    if (match) {
      return { room: match.destRoom, newIndex: i + 1 };
    }
  }

  return null;
}

module.exports = { computePath, nextStep, MAX_LOOKAHEAD };
