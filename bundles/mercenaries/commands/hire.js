// bundles/vendor-npcs/commands/hire.js
'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

const { Broadcast: B } = require('ranvier');
const {
  isVendorTarget,
} = require('../logic');

module.exports = {
  usage: 'hire <mercenary>',

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (args, player) => {
    if (!args) {
      return B.sayAt(player, 'Hire whom? Try: <b>hire <n></b>');
    }

    const vendorNpc = Array.from(player.room.npcs)
      .find(npc => npc.getMeta('mercenary')) || null;

    if (!vendorNpc) {
      return B.sayAt(player, 'There is no mercenary broker here.');
    }

    const target = state.getTarget(player, args.trim(), ['npc']);
    if (!isVendorTarget(state, player, { target, vendorNpc })) {
      return B.sayAt(player, "You don't see anyone like that offering contracts here.");
    }

    state.MercenaryService.hire(player, vendorNpc, state);
  },
};
