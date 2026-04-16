'use strict';
const { isAdmin, isInCombat } = require('../lib/logic');

const NOOP = {};

module.exports = {
  isAdmin,

  isCommandKnown: (state, __, { commandName } = NOOP) => {
    return !!state.CommandManager.get(commandName);
  },

  isImmediateShutdown: (_, __, { time } = NOOP) => {
    return time === 'now';
  },

  isRoomReference: (_, __, { target } = NOOP) => {
    return !!(target && target.includes(':'));
  },

  isAlreadyHere: (_, player, { targetRoom } = NOOP) => {
    return targetRoom === player.room;
  },

  isInCombat,
};
