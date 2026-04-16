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
  isPlayerInAnyRoom: (_, player) => {
    return !!player.room;
  },

  isInCombat,

  hasInventorySpace,

  isSelf,

  isSpeechBlocked: (_, player, { channel } = NOOP) => {
    return canSpeak(player, channel).blocked;
  },

  isWearingEquipment: (_, player) => {
    return player.equipment.size > 0;
  },

  isContainer: (_, __, { item } = NOOP) => {
    return !!(item && item.type === ItemType.CONTAINER);
  },

  isContainerClosed,

  isPickupAllowed: (_, __, { item } = NOOP) => {
    return !!(item && !item.metadata.noPickup);
  },

  hasInventory: (_, player) => {
    return !!(player.inventory && player.inventory.size);
  },

  isBriefMode: (_, player) => {
    return !!player.getMeta('config.brief');
  },

  hasMinimap,

  isDoorBlocked,

  hasKey: (_, player, { keyRef } = NOOP) => {
    return !!player.hasItem(keyRef);
  },

  hasPendingCommands,

  isUsable: (_, __, { item } = NOOP) => {
    return !!(item && item.getBehavior('usable'));
  },

  isDepletedCharges: (_, __, { usable } = NOOP) => {
    return !!(usable && 'charges' in usable && usable.charges <= 0);
  },

  hasWearSlot: (_, __, { item } = NOOP) => {
    return !!(item && item.metadata.slot);
  },

  meetsLevelRequirement: (_, player, { item } = NOOP) => {
    return !!(item && item.level <= player.level);
  },
};
