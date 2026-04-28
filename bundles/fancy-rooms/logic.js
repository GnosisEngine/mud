'use strict';

/** @typedef {import('types').LogicCheck} LogicCheck */
/** @typedef {import('types').LogicCheckNoOptions} LogicCheckNoOptions */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */
/** @typedef {import('types').RanvierWaypoint} RanvierWaypoint */
/** @typedef {import('types').RanvierRoom} RanvierRoom */
/** @typedef {import('types').RanvierItem} RanvierItem */
/** @typedef {import('types').RanvierExit} RanvierExit */
/** @typedef {import('types').RanvierNpc} RanvierNpc */

const { Player } = require('ranvier');
const { hasMinimap, isDoorBlocked, isContainerClosed } = require('../lib/logic');

module.exports = {
  /** @type {import('types').LogicCheck<{ entity: RanvierItem | RanvierNpc, behavior: string }>} */
  hasBehavior: (_, __, { entity, behavior }) => {
    return entity.getBehavior && entity.getBehavior(behavior);
  },

  /** @type {LogicCheckNoOptions} */
  hasCoordinates: (_, player) => {
    return !!(player.room && player.room.coordinates);
  },

  isDoorBlocked,

  /** @type {import('types').LogicCheck<{ entity: any }>} */
  isPlayerEntity: (_, __, { entity }) => {
    return entity instanceof Player;
  },

  /** @type {import('types').LogicCheck<{ container: RanvierItem }>} */
  isContainerEmpty: (_, __, { container }) => {
    return !container?.inventory || !container.inventory.size;
  },

  isContainerClosed,

  /** @type {import('types').LogicCheck<{ entity: any }>} */
  isRotting: (_, __, { entity }) => {
    return !!entity.timeUntilDecay;
  },

  hasMinimap,

  /** @type {import('types').LogicCheckOptionsOnly<{ args: string }>} */
  isListCommand: ({ args }) => {
    return !args || args.trim() === 'list';
  },

  /** @type {import('types').LogicCheckOptionsOnly<{ args: string }>} */
  isRemoveCommand: ({ args }) => {
    return !!(args && args.trim().toLowerCase().startsWith('remove '));
  },

  /** @type {import('types').LogicCheckOptionsOnly<{ waypoints: any[], label: string  }>} */
  hasWaypointWithLabel: ({ waypoints, label }) => {
    return !!(waypoints && waypoints.some(w => w.label.toLowerCase() === label?.toLowerCase()));
  },

  /** @type {import('types').LogicCheck<{ old: RanvierWaypoint, entry: RanvierWaypoint  }>} */
  isWaypointSameRoom: (_, __, { old, entry }) => {
    return !!(old && entry &&
      old.areaId === entry.areaId &&
      old.coordinates?.x === entry?.coordinates.x &&
      old.coordinates?.y === entry?.coordinates.y &&
      old.coordinates?.z === entry?.coordinates.z
    );
  },

  /** @type {import('types').LogicCheck<{ exit: RanvierExit }>} */
  isExit(_, __, { exit }) {
    return exit.inferred !== undefined && exit.roomId !== undefined && exit.direction !== undefined;
  }
};
