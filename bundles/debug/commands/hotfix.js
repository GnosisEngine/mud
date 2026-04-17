'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

require('../hints');
const { Broadcast: B, PlayerRoles } = require('ranvier');
const { isAdmin, isCommandKnown } = require('../logic');

module.exports = {
  requiredRole: PlayerRoles.ADMIN,
  usage: 'hotfix <command name>',

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (commandName, player) => {
    if (!isAdmin(state, player)) {
      return B.sayAt(player, 'You do not have permission to use this command.');
    }

    if (!commandName) {
      return B.sayAt(player, 'Hotfix which command?');
    }

    if (!isCommandKnown(state, player, { commandName })) {
      return B.sayAt(player, 'There is no such command, restart the server to add new commands.');
    }

    const command = state.CommandManager.get(commandName);
    delete require.cache[require.resolve(command.file)];
    B.sayAt(player, `<b><red>HOTFIX</red></b>: Reloading [${commandName}]...`);

    const newCommand = state.BundleManager.createCommand(command.file, command.name, command.bundle);
    state.CommandManager.add(newCommand);
    B.sayAt(player, '<b><red>HOTFIX</red></b>: Done!');
  }
};
