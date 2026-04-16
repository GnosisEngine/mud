// bundles/communication/commands/gags.js
'use strict';

const { Broadcast } = require('ranvier');
const {
  isAdmin,
  hasCommEffects,
} = require('../logic');

module.exports = {
  requiredRole: require('ranvier').PlayerRoles.ADMIN,
  usage: 'gags',
  command: state => (_args, player) => {
    if (!isAdmin(state, player)) {
      return Broadcast.sayAt(player, 'You do not have permission to use this command.');
    }

    const rows = [];

    for (const target of state.PlayerManager.getPlayersAsArray()) {
      if (!hasCommEffects(state, player, { target })) {
        continue;
      }

      const effectNames = target.effects.entries()
        .filter(e => Array.isArray(e.config.blockedChannels))
        .map(e => e.config.type)
        .join(', ');

      rows.push(`  ${target.name.padEnd(20)} ${effectNames}`);
    }

    if (!rows.length) {
      Broadcast.sayAt(player, 'No players have active communication effects.');
      return;
    }

    Broadcast.sayAt(player, `${'Player'.padEnd(20)} Effects`);
    Broadcast.sayAt(player, `${'-'.repeat(20)} ${'-'.repeat(30)}`);
    for (const row of rows) {
      Broadcast.sayAt(player, row);
    }
  },
};
