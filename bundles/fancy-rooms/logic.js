'use strict';
const { Player } = require('ranvier');
const NOOP = {};

module.exports = {
  hasArgs: (_, __, { args } = NOOP) => {
    return !!args;
  },

  hasCoordinates: (_, player) => {
    return !!(player.room && player.room.coordinates);
  },

  isDoorBlocked: (_, __, { door } = NOOP) => {
    return !!(door && (door.locked || door.closed));
  },

  isPlayerEntity: (_, __, { entity } = NOOP) => {
    return entity instanceof Player;
  },

  isContainerEmpty: (_, __, { entity } = NOOP) => {
    return !entity.inventory || !entity.inventory.size;
  },

  isContainerClosed: (_, __, { entity } = NOOP) => {
    return !!entity.closed;
  },

  isRotting: (_, __, { entity } = NOOP) => {
    return !!entity.timeUntilDecay;
  },

  hasMinimap: (_, player) => {
    return !!player.getMeta('config.minimap');
  },

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
};
