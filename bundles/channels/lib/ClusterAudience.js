// bundles/channels/lib/ClusterAudience.js
'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */
/** @typedef {import('../../../types/ranvier').RanvierNpc} RanvierNpc */
/** @typedef {import('../../../types/ranvier').RanvierRoom} RanvierRoom */
/** @typedef {import('../../../bundles/world/types').WorldManager} WorldManager */
/** @typedef {RanvierPlayer | RanvierNpc} RanvierCharacter */

const { AreaAudience } = require('ranvier');

const ROAD_CLUSTER = 0;

/** @type {Map<string, Set<string>>} */
const bfsCache = new Map();

/**
 * Audience class representing characters on the same contiguous road segment
 * as the sender. Road rooms are identified by canonicalCluster === 0 in the
 * world tile index. BFS walks exits from the sender's room and collects every
 * reachable room that is also a road tile.
 *
 * Falls back to AreaAudience behaviour when the sender is not on a road.
 *
 * @extends AreaAudience
 */
class ClusterAudience extends AreaAudience {
  /**
   * @returns {RanvierCharacter[]}
   */
  getBroadcastTargets() {
    if (!this.sender.room) {
      return [];
    }

    /** @type {WorldManager|undefined} */
    const worldManager = this.state.WorldManager;

    if (!worldManager) {
      return super.getBroadcastTargets();
    }

    if (!this._isRoadRoom(this.sender.room, worldManager)) {
      return super.getBroadcastTargets();
    }

    const coords = this.sender.room.coordinates;
    if (!coords) {
      throw new Error('Room has no coordinates');
    }
    const { x, y } = coords;
    const cacheKey = `${x},${y}`;

    let roadRooms = bfsCache.get(cacheKey);
    if (!roadRooms) {
      roadRooms = this._floodFillRoadRooms(this.sender.room, worldManager);
      for (const ref of roadRooms) {
        const room = this.state.RoomManager.getRoom(ref);
        if (room && room.coordinates) {
          bfsCache.set(`${room.coordinates.x},${room.coordinates.y}`, roadRooms);
        }
      }
    }

    /** @type {RanvierCharacter[]} */
    const players = this.state.PlayerManager.filter(player =>
      player !== this.sender &&
      !!player.room &&
      roadRooms.has(player.room.entityReference)
    );

    /** @type {RanvierNpc[]} */
    const npcs = [];
    for (const ref of roadRooms) {
      const room = this.state.RoomManager.getRoom(ref);
      if (room) {
        for (const npc of room.npcs) {
          npcs.push(npc);
        }
      }
    }

    return /** @type {RanvierCharacter[]} */ ([...players, ...npcs]);
  }

  /**
   * Returns true if the given room sits on a road tile (canonicalCluster === 0).
   *
   * @param {RanvierRoom}  room
   * @param {WorldManager} worldManager
   * @returns {boolean}
   */
  _isRoadRoom(room, worldManager) {
    if (!room.coordinates) return false;
    const { x, y } = room.coordinates;
    if (x === undefined || y === undefined) return false;
    const tile = worldManager.getEntryByCoords(x, y);
    return tile !== null && tile.canonicalCluster === ROAD_CLUSTER;
  }

  /**
   * BFS from startRoom through exits, collecting all reachable rooms that are
   * also road tiles. Returns a Set of entityReference strings.
   *
   * @param {RanvierRoom}  startRoom
   * @param {WorldManager} worldManager
   * @returns {Set<string>}
   */
  _floodFillRoadRooms(startRoom, worldManager) {
    /** @type {Set<string>} */
    const visited = new Set();
    /** @type {RanvierRoom[]} */
    const queue = [startRoom];
    visited.add(startRoom.entityReference);

    while (queue.length) {
      const current = queue.shift();

      if (current === undefined) {
        break;
      }

      for (const exit of current.getExits()) {
        const ref = exit.roomId;

        if (!ref || visited.has(ref)) continue;

        const neighbor = this.state.RoomManager.getRoom(ref);
        if (!neighbor) continue;

        visited.add(ref);

        if (this._isRoadRoom(neighbor, worldManager)) {
          queue.push(neighbor);
        }
      }
    }

    return visited;
  }
}

module.exports = ClusterAudience;
