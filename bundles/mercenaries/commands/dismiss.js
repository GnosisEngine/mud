// bundles/vendor-npcs/commands/dismiss.js
'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */

/**
 *
 * @param {RanvierPlayer} player
 * @param {string} query
 * @returns
 */
const findContractInInventory = (player, query) => {
  for (const [, item] of player.inventory ?? []) {
    const contract = item.getMeta ? item.getMeta('contract') : null;
    if (!contract || !contract.contractId) continue;
    if (contract.mercName && contract.mercName.toLowerCase().includes(query)) {
      return { contractId: contract.contractId, mercName: contract.mercName };
    }
  }
  return null;
};

const { Broadcast: B } = require('ranvier');
const {
  hasEmptyInventory,
  hasActiveContract,
  isContractRetiring,
} = require('../logic');

module.exports = {
  usage: 'dismiss <mercenary name>',

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
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
