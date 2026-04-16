'use strict';

const { Broadcast, PlayerRoles } = require('ranvier');
const { isAdmin, isImmediateShutdown } = require('../logic');

module.exports = {
  requiredRole: PlayerRoles.ADMIN,
  command: state => async(time, player) => {
    if (!isAdmin(state, player)) {
      return Broadcast.sayAt(player, 'You do not have permission to use this command.');
    }

    if (isImmediateShutdown(state, player, { time })) {
      Broadcast.sayAt(state.PlayerManager, '<b><yellow>Game is shutting down now!</yellow></b>');
      await state.PlayerManager.saveAll();
      process.exit();
      return;
    }

    if (time !== 'sure') {
      return Broadcast.sayAt(player, 'You must confirm the shutdown with "shutdown sure" or force immediate shutdown with "shutdown now"');
    }

    Broadcast.sayAt(state.PlayerManager, `<b><yellow>Game will shut down in ${30} seconds.</yellow></b>`);
    setTimeout(async _ => {
      Broadcast.sayAt(state.PlayerManager, '<b><yellow>Game is shutting down now!</yellow></b>');
      state.PlayerManager.saveAll();
      await process.exit();
    }, 30000);
  }
};
