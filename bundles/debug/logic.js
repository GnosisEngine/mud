'use strict';
const { PlayerRoles } = require('ranvier');
const NOOP = {};

module.exports = {
  isAdmin: (_, player) => {
    return player.role >= PlayerRoles.ADMIN;
  },

  hasNoArgs: (_, __, { args } = NOOP) => {
    return !args || !args.length;
  },

  isCommandKnown: (state, __, { commandName } = NOOP) => {
    return !!state.CommandManager.get(commandName);
  },

  isAlreadyAdmin: (_, __, { target } = NOOP) => {
    return !!(target && target.role === PlayerRoles.ADMIN);
  },

  isImmediateShutdown: (_, __, { time } = NOOP) => {
    return time === 'now';
  },

  isConfirmed: (_, __, { args, word } = NOOP) => {
    return args === word;
  },

  isRoomReference: (_, __, { target } = NOOP) => {
    return !!(target && target.includes(':'));
  },

  isAlreadyHere: (_, player, { targetRoom } = NOOP) => {
    return targetRoom === player.room;
  },

  isInCombat: (_, player) => {
    return player.isInCombat();
  },
};
