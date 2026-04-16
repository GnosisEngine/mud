// bundles/vendor-npcs/commands/mercs.js
'use strict';

const sprintf = require('sprintf-js').sprintf;
const { Broadcast: B } = require('ranvier');
const {
  hasNoContracts,
  getStatusLabel,
  formatUpkeep,
  getTargetLabel,
} = require('../logic');

module.exports = {
  usage: 'mercs',
  aliases: ['mercenaries'],
  command: state => (_args, player) => {
    const entries = state.MercenaryService.getContractsByPlayer(player.name);

    if (hasNoContracts(state, player, { entries })) {
      return B.sayAt(player, 'You have no active mercenary contracts.');
    }

    B.sayAt(player, '.' + B.center(78, 'Active Mercenaries', 'yellow', '-') + '.');

    for (const entry of entries) {
      const statusLabel = getStatusLabel(state, player, { entry });
      const upkeepStr   = formatUpkeep(state, player, { entry });
      const targetLabel = getTargetLabel(state, player, { entry });

      B.sayAt(player,
        '<yellow>|</yellow> ' +
        sprintf('<b><white>%-20s</white></b>', entry.mercName) +
        sprintf(' %-14s', statusLabel) +
        sprintf(' %-28s', targetLabel.slice(0, 28)) +
        sprintf(' <yellow>%6s</yellow>', upkeepStr) +
        ' <yellow>|</yellow>'
      );
    }

    B.sayAt(player, "'" + B.line(78, '-', 'yellow') + "'");
    B.sayAt(player, sprintf(
      '  <white>%d</white> of <white>%d</white> claim slots garrisoned.',
      entries.length,
      (state.StorageManager.store.getClaimsByOwner(player.name)).length
    ));
  },
};
