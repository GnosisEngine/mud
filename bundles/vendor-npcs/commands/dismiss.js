// bundles/vendor-npcs/commands/dismiss.js
'use strict';

const { Broadcast: B } = require('ranvier');

module.exports = {
  usage: 'dismiss <mercenary name>',
  command: state => (args, player) => {
    if (!args || !args.trim().length) {
      return B.sayAt(player, 'Dismiss which mercenary? Try: <b>dismiss <name></b>');
    }

    if (!player.inventory || !player.inventory.size) {
      return B.sayAt(player, 'You hold no mercenary contracts.');
    }

    const query = args.trim().toLowerCase();

    // Search player inventory for a contract item whose merc name matches the query
    let contractId = null;
    let mercName = null;
    for (const [, item] of player.inventory) {
      const contract = item.getMeta ? item.getMeta('contract') : null;
      if (!contract || !contract.contractId) continue;
      if (contract.mercName && contract.mercName.toLowerCase().includes(query)) {
        contractId = contract.contractId;
        mercName = contract.mercName;
        break;
      }
    }

    if (!contractId) {
      return B.sayAt(player, `You hold no contract for a mercenary matching '${args.trim()}'.`);
    }

    // Verify this contract is still active in the service registry
    const entries = state.MercenaryService.getContractsByPlayer(player.name);
    const active = entries.find(e => e.contractId === contractId);

    if (!active) {
      return B.sayAt(player, `${mercName}'s contract is no longer active.`);
    }

    if (active.status === 'RETURNING' || active.status === 'FLEEING') {
      return B.sayAt(player, `${mercName} is already on their way home.`);
    }

    state.MercenaryService.dismiss(contractId, state);
  },
};
