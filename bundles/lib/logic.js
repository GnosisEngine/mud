'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierCharacter} RanvierCharacter */
/** @typedef {import('types').RanvierDoor} RanvierDoor */
/** @typedef {import('types').RanvierItem} RanvierItem */
/** @typedef {import('types').RanvierExit} RanvierExit */

const { PlayerRoles, Config } = require('ranvier');

module.exports = {
  /** @type {import('types').LogicCheckAsCharacterWithNoOptions} */
  isNpc: (_, player) => {
    return !!player.isNpc;
  },

  /** @type {import('types').LogicCheck<{ exits: RanvierExit[] }>} */
  hasExits: (state, player, { exits }) => {
    const knownExits = exits
      ? exits
      : player.room?.getExits() ?? [];
    let count = knownExits.length;

    for (const exit of knownExits) {
      if (!state.RoomManager.getRoom(exit.roomId ?? '')) {
        count -= 1;
      }
    }

    return count > 0;
  },

  /** @type {import('types').LogicCheckNoOptions} */
  hasInventorySpace: (_, player) => {
    return !player.isInventoryFull();
  },

  /** @type {import('types').LogicCheckNoOptions} */
  hasMinimap: (_, player) => {
    return !!player.getMeta('config.minimap');
  },

  /** @type {import('types').LogicCheckNoOptions} */
  hasPendingCommands: (_, player) => {
    return !!(player.commandQueue.hasPending && player.commandQueue.lagRemaining <= 0);
  },

  /** @type {import('types').LogicCheckNoOptions} */
  isAdmin: (_, player) => {
    return player.role >= PlayerRoles.ADMIN;
  },

  /** @type {import('types').LogicCheckAsCharacterWithNoOptions} */
  isAdminOnline: state => {
    if (Config.get('allowPlayerCreation')) return true;
    return state.PlayerManager.getPlayersAsArray().some(p => p.role >= PlayerRoles.ADMIN);
  },

  /** @type {import('types').LogicCheckOptionsOnly<{ door: RanvierDoor }>} */
  isDoorPassable: ({ door }) => {
    return !door || (!door.locked && !door.closed);
  },

  /** @type {import('types').LogicCheckOptionsOnly<{ door: RanvierDoor }>} */
  isDoorImpassable: ({ door }) => {
    return door && (door.locked || door.closed);
  },

  /** @type {import('types').LogicCheckNoOptions} */
  isInCombat: (_, player) => {
    return player.isInCombat && player.isInCombat();
  },

  /** @type {import('types').LogicCheckOptionsOnly<{ door: RanvierDoor }>} */
  isDoorLocked: ({ door }) => {
    return !!(door && door.locked);
  },

  /** @type {import('types').LogicCheckOptionsOnly<{ door: RanvierDoor }>} */
  isDoorClosed: ({ door }) => {
    return !!(door && door.closed);
  },

  /** @type {import('types').LogicCheck<{ door: RanvierDoor }>} */
  isDoorBlocked: (_, __, { door }) => {
    return !!(door && (door.locked || door.closed));
  },

  /** @type {import('types').LogicCheck<{ target: RanvierCharacter }>} */
  isSelf: (_, player, { target }) => {
    return target === player;
  },

  /** @type {import('types').LogicCheck<{ container: RanvierItem }>} */
  isContainerClosed: (_, __, { container }) => {
    return !!(container && container.closed);
  },

  /** @type {import('types').LogicCheck<{ targetName: string }>} */
  isPlayerOnline: (state, __, { targetName }) => {
    return !!state.PlayerManager.getPlayer(targetName);
  },

  /** @type {import('types').LogicCheckNoOptions} */
  hasWeapon: (_, player) => {
    return player.equipment.get('wield');
  },
};
