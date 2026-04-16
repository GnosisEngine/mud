'use strict';
const { ItemType } = require('ranvier');
const canSpeak = require('../moderation/lib/canSpeak');
const NOOP = {};

module.exports = {
  hasNoArgs: (_, __, { args } = NOOP) => {
    return !args || !args.length;
  },

  hasRoom: (_, player) => {
    return !!player.room;
  },

  isInCombat: (_, player) => {
    return player.isInCombat();
  },

  hasInventorySpace: (_, player) => {
    return !player.isInventoryFull();
  },

  isSelf: (_, player, { target } = NOOP) => {
    return target === player;
  },

  isSpeechBlocked: (_, player, { channel } = NOOP) => {
    return canSpeak(player, channel).blocked;
  },

  isWearingEquipment: (_, player) => {
    return player.equipment.size > 0;
  },

  isContainer: (_, __, { item } = NOOP) => {
    return !!(item && item.type === ItemType.CONTAINER);
  },

  isContainerClosed: (_, __, { container } = NOOP) => {
    return !!(container && container.closed);
  },

  isPickupAllowed: (_, __, { item } = NOOP) => {
    return !!(item && !item.metadata.noPickup);
  },

  hasInventory: (_, player) => {
    return !!(player.inventory && player.inventory.size);
  },

  isBriefMode: (_, player) => {
    return !!player.getMeta('config.brief');
  },

  hasMinimap: (_, player) => {
    return !!player.getMeta('config.minimap');
  },

  isDoorBlocked: (_, __, { door } = NOOP) => {
    return !!(door && (door.locked || door.closed));
  },

  hasKey: (_, player, { keyRef } = NOOP) => {
    return !!player.hasItem(keyRef);
  },

  hasPendingCommands: (_, player) => {
    return !!player.commandQueue.hasPending;
  },

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
