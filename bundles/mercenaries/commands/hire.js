// bundles/vendor-npcs/commands/hire.js
'use strict';

const { Broadcast: B } = require('ranvier');

module.exports = {
  usage: 'hire <mercenary>',
  command: state => (args, player) => {
    if (!args || !args.trim().length) {
      return B.sayAt(player, 'Hire whom? Try: <b>hire <name></b>');
    }

    // Find a vendor NPC in the room that offers mercenary contracts
    const vendorNpc = Array.from(player.room.npcs)
      .find(npc => npc.getMeta('mercenary'));

    if (!vendorNpc) {
      return B.sayAt(player, 'There is no mercenary broker here.');
    }

    const target = state.getTarget(player.room, args.trim(), ['npc']);
    if (!target || target !== vendorNpc) {
      return B.sayAt(player, "You don't see anyone like that offering contracts here.");
    }

    state.MercenaryService.hire(player, vendorNpc, state);
  },
};
