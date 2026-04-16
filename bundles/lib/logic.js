'use strict';
const { PlayerRoles } = require('ranvier');

const NOOP = {};

module.exports = {
  hasExits: (state, player) => {
    const exits = player.room.getExits();
    let count = exits.length;

    for (const exit of exits) {
      if (!state.RoomManager.getRoom(exit.roomId)) {
        count -= 1;
      }
    }

    return count > 0;
  },

  hasInventorySpace: (_, player) => {
    return !player.isInventoryFull();
  },

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

  isDoorBlocked: (_, __, { door } = NOOP) => {
    return !!(door && (door.locked || door.closed));
  },

  isSelf: (_, player, { target } = NOOP) => {
    return target === player;
  },

  isContainerClosed: (_, __, { container } = NOOP) => {
    return !!(container && container.closed);
  },

  isPlayerOnline: (state, __, { targetName } = NOOP) => {
    return !!state.PlayerManager.getPlayer(targetName);
  },

  hasWeapon: (_, player) => {
    return player.equipment.get('wield');
  },
};
