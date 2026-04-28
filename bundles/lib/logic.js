'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierCharacter} RanvierCharacter */
/** @typedef {import('types').RanvierDoor} RanvierDoor */
/** @typedef {import('types').RanvierItem} RanvierItem */

const { PlayerRoles } = require('ranvier');

const NOOP = {};

module.exports = {
  /**
    * @param {GameState} state
    * @param {RanvierCharacter} player
    * @returns {entity is RanvierNpc}
    */
  isNpc: (state, player) => {
    return !!player.isNpc;
  },

  hasExits: (state, player, { exits }) => {
    const knownExits = exits
      ? exits
      : player.room.getExits();
    let count = knownExits.length;

    for (const exit of knownExits) {
      if (!state.RoomManager.getRoom(exit.roomId)) {
        count -= 1;
      }
    }

    return count > 0;
  },

  hasInventorySpace: (_, player) => {
    return !player.isInventoryFull();
  },

  /** @type {import('types').LogicCheckNoOptions} */
  hasMinimap: (_, player) => {
    return !!player.getMeta('config.minimap');
  },

  hasPendingCommands: (_, player) => {
    return !!(player.commandQueue.hasPending && player.commandQueue.lagRemaining <= 0);
  },

  isAdmin: (_, player) => {
    return player.role >= PlayerRoles.ADMIN;
  },

  isDoorPassable: (_, __, { door } = NOOP) => {
    return !door || (!door.locked && !door.closed);
  },

  isDoorImpassable: (_, __, { door } = NOOP) => {
    return door && (door.locked || door.closed);
  },

  isInCombat: (_, player) => {
    return player.isInCombat && player.isInCombat();
  },

  isDoorLocked: (_, __, { door } = NOOP) => {
    return !!(door && door.locked);
  },

  isDoorClosed: (_, __, { door } = NOOP) => {
    return !!(door && door.closed);
  },

  /** @type {import('types').LogicCheck<{ door: RanvierDoor }>} */
  isDoorBlocked: (_, __, { door }) => {
    return !!(door && (door.locked || door.closed));
  },

  isSelf: (_, player, { target } = NOOP) => {
    return target === player;
  },

  /** @type {import('types').LogicCheck<{ container: RanvierItem }>} */
  isContainerClosed: (_, __, { container }) => {
    return !!(container && container.closed);
  },

  isPlayerOnline: (state, __, { targetName } = NOOP) => {
    return !!state.PlayerManager.getPlayer(targetName);
  },

  hasWeapon: (_, player) => {
    return player.equipment.get('wield');
  },
};
