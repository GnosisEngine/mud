'use strict';
const NOOP = {};

module.exports = {
  hasArgs: (_, __, { args } = NOOP) => {
    return !!(args && args.length);
  },

  hasVendorInRoom: (_, player) => {
    return !!Array.from(player.room.npcs).find(npc => npc.getMeta('vendor'));
  },

  canAfford: (_, player, { cost, currencyKey } = NOOP) => {
    return (player.getMeta(currencyKey) || 0) >= cost;
  },

  hasInventorySpace: (_, player) => {
    return !player.isInventoryFull();
  },

  isSellable: (_, __, { item } = NOOP) => {
    return !!(item && item.getMeta('sellable'));
  },

  requiresSellConfirm: (_, __, { item, noConfirmQualities } = NOOP) => {
    const quality = item && (item.metadata.quality || 'common');
    return !noConfirmQualities.has(quality);
  },

  hasSellConfirm: (_, __, { confirm, confirmWord } = NOOP) => {
    return confirm === confirmWord;
  },
};
