'use strict';

/** @typedef {import('types').LogicCheck} LogicCheck */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */
/** @typedef {import('types').RanvierCharacter} RanvierCharacter */
/** @typedef {import('types').RanvierPoom} RanvierPoom */

const { Player } = require('ranvier');
const { hasMinimap, isDoorBlocked, isContainerClosed } = require('../lib/logic');

const NOOP = {};

module.exports = {
  /** @type {LogicCheck} */
  hasBehavior: (_, player, { behavior }) => {
    return player.getBehavior && player.getBehavior(behavior);
  },

  /** @type {LogicCheck} */
  hasCoordinates: (_, player) => {
    return !!(player.room && player.room.coordinates);
  },

  /** @type {LogicCheck} */
  isDoorBlocked,

  /** @type {LogicCheck} */
  isPlayerEntity: (_, __, { entity } = NOOP) => {
    return entity instanceof Player;
  },

  /** @type {LogicCheck} */
  isContainerEmpty: (_, __, { container } = NOOP) => {
    return !container.inventory || !container.inventory.size;
  },

  /** @type {LogicCheck} */
  isContainerClosed,

  /** @type {LogicCheck} */
  isRotting: (_, __, { entity } = NOOP) => {
    return !!entity.timeUntilDecay;
  },

  /** @type {LogicCheck} */
  hasMinimap,

  /** @type {LogicCheck} */
  isListCommand: (_, __, { args } = NOOP) => {
    return !args || args.trim() === 'list';
  },

  /** @type {LogicCheck} */
  isRemoveCommand: (_, __, { args } = NOOP) => {
    return !!(args && args.trim().toLowerCase().startsWith('remove '));
  },

  /** @type {LogicCheck} */
  hasWaypointWithLabel: (_, __, { waypoints, label } = NOOP) => {
    return !!(waypoints && waypoints.some(w => w.label.toLowerCase() === label.toLowerCase()));
  },

  /** @type {LogicCheck} */
  isWaypointSameRoom: (_, __, { old, entry } = NOOP) => {
    return !!(old && entry &&
      old.areaId === entry.areaId &&
      old.coordinates.x === entry.coordinates.x &&
      old.coordinates.y === entry.coordinates.y &&
      old.coordinates.z === entry.coordinates.z
    );
  },

  /** @type {LogicCheck} */
  isExit(_, __, { exit }) {
    return exit.inferred !== undefined && exit.roomId !== undefined && exit.direction !== undefined;
  }
};
