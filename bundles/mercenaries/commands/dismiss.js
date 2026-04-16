// bundles/vendor-npcs/commands/dismiss.js
'use strict';

const { Broadcast: B } = require('ranvier');
const {
  hasEmptyInventory,
  findContractInInventory,
  hasActiveContract,
  isContractRetiring,
} = require('../logic');

module.exports = {
  usage: 'dismiss <mercenary name>',
  command: state => (args, player) => {
    if (!args) {
      return B.sayAt(player, 'Dismiss which mercenary? Try: <b>dismiss <n></b>');
    }

    if (hasEmptyInventory(state, player)) {
      return B.sayAt(player, 'You hold no mercenary contracts.');
    }

    const query = args.trim().toLowerCase();
    const match = findContractInInventory(state, player, { query });

    if (!match) {
      return B.sayAt(player, `You hold no contract for a mercenary matching '${args.trim()}'.`);
    }

    const { contractId, mercName } = match;
    const entries = state.MercenaryService.getContractsByPlayer(player.name);

    if (!hasActiveContract(state, player, { entries, contractId })) {
      return B.sayAt(player, `${mercName}'s contract is no longer active.`);
    }

    const active = entries.find(e => e.contractId === contractId);
    if (isContractRetiring(state, player, { active })) {
      return B.sayAt(player, `${mercName} is already on their way home.`);
    }

    state.MercenaryService.dismiss(contractId, state);
  },
};
