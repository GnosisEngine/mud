'use strict';
const { ItemType } = require('ranvier');
const canSpeak = require('../moderation/lib/canSpeak');
const {
  isInCombat,
  hasMinimap,
  isContainerClosed,
  hasPendingCommands,
  isDoorBlocked,
  isSelf,
  hasInventorySpace
} = require('../lib/logic');

const NOOP = {};

module.exports = {
  /** @type {import('types').LogicCheck} */
  isPlayerInAnyRoom: (_, player) => {
    return !!player.room;
  },

  /** @type {import('types').LogicCheck} */
  isInCombat,

  /** @type {import('types').LogicCheck} */
  hasInventorySpace,

  /** @type {import('types').LogicCheck} */
  isSelf,

  /** @type {import('types').LogicCheck} */
  isSpeechBlocked: (_, player, { channel } = NOOP) => {
    return canSpeak(player, channel).blocked;
  },

  /** @type {import('types').LogicCheck} */
  isWearingEquipment: (_, player) => {
    return player.equipment.size > 0;
  },

  /** @type {import('types').LogicCheck} */
  isContainer: (_, __, { item } = NOOP) => {
    return !!(item && item.type === ItemType.CONTAINER);
  },

  /** @type {import('types').LogicCheck} */
  isContainerClosed,

  /** @type {import('types').LogicCheck} */
  isPickupAllowed: (_, __, { item } = NOOP) => {
    return !!(item && !item.metadata.noPickup);
  },

  /** @type {import('types').LogicCheck} */
  hasInventory: (_, player) => {
    return !!(player.inventory && player.inventory.size);
  },

  /** @type {import('types').LogicCheck} */
  isBriefMode: (_, player) => {
    return !!player.getMeta('config.brief');
  },

  /** @type {import('types').LogicCheck} */
  hasMinimap,

  /** @type {import('types').LogicCheck} */
  isDoorBlocked,

  /** @type {import('types').LogicCheck} */
  hasKey: (_, player, { keyRef } = NOOP) => {
    return !!player.hasItem(keyRef);
  },

  /** @type {import('types').LogicCheck} */
  hasPendingCommands,

  /** @type {import('types').LogicCheck} */
  isUsable: (_, __, { item } = NOOP) => {
    return !!(item && item.getBehavior('usable'));
  },

  /** @type {import('types').LogicCheck} */
  isDepletedCharges: (_, __, { usable } = NOOP) => {
    return !!(usable && 'charges' in usable && usable.charges <= 0);
  },

  /** @type {import('types').LogicCheck} */
  hasWearSlot: (_, __, { item } = NOOP) => {
    return !!(item && item.metadata.slot);
  },

  /** @type {import('types').LogicCheck} */
  meetsLevelRequirement: (_, player, { item } = NOOP) => {
    return !!(item && item.level <= player.level);
  },
};
