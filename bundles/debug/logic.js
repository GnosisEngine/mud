'use strict';

/** @typedef {import('types').LogicCheck} LogicCheck */

const { isAdmin, isInCombat } = require('../lib/logic');

const NOOP = {};

module.exports = {
  /** @type {LogicCheck} */
  isAdmin,

  /** @type {LogicCheck} */
  isCommandKnown: (state, __, { commandName } = NOOP) => {
    return !!state.CommandManager.get(commandName);
  },

  /** @type {LogicCheck} */
  isImmediateShutdown: (_, __, { time } = NOOP) => {
    return time === 'now';
  },

  /** @type {LogicCheck} */
  isRoomReference: (_, __, { target } = NOOP) => {
    return !!(target && target.includes(':'));
  },

  /** @type {LogicCheck} */
  isAlreadyHere: (_, player, { targetRoom } = NOOP) => {
    return targetRoom === player.room;
  },

  /** @type {LogicCheck} */
  isInCombat,
};
