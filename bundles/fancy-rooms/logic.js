'use strict';
const { Player } = require('ranvier');
const { hasMinimap, isDoorBlocked, isContainerClosed } = require('../lib/logic');

const NOOP = {};

module.exports = {
  hasBehavior: (_, player, { behavior }) => {
    return player.getBehavior && player.getBehavior(behavior);
  },

  hasCoordinates: (_, player) => {
    return !!(player.room && player.room.coordinates);
  },

  isDoorBlocked,

  isPlayerEntity: (_, __, { entity } = NOOP) => {
    return entity instanceof Player;
  },

  isContainerEmpty: (_, __, { entity } = NOOP) => {
    return !entity.inventory || !entity.inventory.size;
  },

  isContainerClosed,

  isRotting: (_, __, { entity } = NOOP) => {
    return !!entity.timeUntilDecay;
  },

  hasMinimap,

  isListCommand: (_, __, { args } = NOOP) => {
    return !args || args.trim() === 'list';
  },

  isRemoveCommand: (_, __, { args } = NOOP) => {
    return !!(args && args.trim().toLowerCase().startsWith('remove '));
  },

  hasWaypointWithLabel: (_, __, { waypoints, label } = NOOP) => {
    return !!(waypoints && waypoints.some(w => w.label.toLowerCase() === label.toLowerCase()));
  },

  isWaypointSameRoom: (_, __, { old, entry } = NOOP) => {
    return !!(old && entry &&
      old.areaId === entry.areaId &&
      old.coordinates.x === entry.coordinates.x &&
      old.coordinates.y === entry.coordinates.y &&
      old.coordinates.z === entry.coordinates.z
    );
  },

  isExit(_, __, { exit }) {
    return exit.inferred !== undefined && exit.roomId !== undefined && exit.direction !== undefined;
  }
};
