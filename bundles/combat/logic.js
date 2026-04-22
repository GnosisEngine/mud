'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */
/** @typedef {import('types').RanvierNpc} RanvierNpc */
/** @typedef {import('types').LogicCheck} LogicCheck */

const CombatErrors = require('./lib/CombatErrors');
const { hasWeapon, hasExits, isNpc, isDoorImpassable, isInCombat } = require('../lib/logic');
const NOOP = {};

module.exports = {
  /** @type {LogicCheck} */
  isNpc,

  /** @type {LogicCheck} */
  roomExists: (state, _, { room, roomId } = NOOP) => {
    if (roomId !== undefined) {
      room = state.RoomManager.getRoom(roomId);
    }

    return room !== undefined;
  },

  /** @type {LogicCheck} */
  isDoorImpassable,

  /** @type {LogicCheck} */
  isInCombat,

  /** @type {LogicCheck} */
  isPvpFlagged: (_, player) => {
    return player.getMeta('pvp');
  },

  /** @type {LogicCheck} */
  isLevelDiff: (_, player, { target, amount }) => {
    return player.level  - target.level > amount;
  },

  /** @type {LogicCheck} */
  hasPvpTargetsNear: (_, player) => {
    if (player.getMeta('pvp') === false) {
      return false;
    }

    if (player.room === null) {
      return false;
    }

    const candidates = [...player.room.players];

    return candidates.filter(c =>
      c !== player
      && c.hasAttribute('health')
      && (c.getAttribute('health') > 0
      && !!c.combatData.killed === false)
      && c.getMeta('pvp')
    ).length > 0;
  },

  /** @type {LogicCheck} */
  hasPveTargetsNear: (_, player) => {
    if (player.room === null) {
      return false;
    }

    const candidates = [...player.room.npcs];

    return candidates.filter(c =>
      c.hasAttribute('health')
      && (c.getAttribute('health') > 0
      && !!c.combatData.killed === false)
      && c.isNpc
    ).length > 0;
  },

  /** @type {LogicCheck} */
  hasTargetsNear: (_, player) => {
    if (player.room === null) {
      return false;
    }

    const candidates = [
      ...player.room.players,
      ...player.room.npcs
    ];

    return candidates.filter(c => {
      const isAlive = c.hasAttribute('health')
          && (c.getAttribute('health') > 0
          && !!c.combatData.killed === false);

      const conditions = c.isNpc
        // PvE
        ? true
        // PvP
        : c.getMeta && c.getMeta('pvp') && player.getMeta('pvp');

      return c !== player
          && isAlive
          && conditions;
    }).length > 0;
  },

  /** @type {LogicCheck} */
  hasWeapon,

  /** @type {LogicCheck} */
  isRegenerating: (_, player) => {
    return player.hasEffectType('regen');
  },

  /** @type {LogicCheck} */
  canPerformCriticalAttack: (_, player) => {
    return player.hasAttribute('critical');
  },

  /** @type {LogicCheck} */
  isAlive: (_, player) => {
    return player.getAttribute('health') > 0;
  },

  /** @type {LogicCheck} */
  canBeAtatcked: (_, player, { target }) => {
    const isAlive = target.hasAttribute('health')
      && (target.getAttribute('health') > 0
      && !!target.combatData.killed === false);

    const conditions = target.isNpc
      // PvE
      ? true
      // PvP
      : target.getMeta && target.getMeta('pvp') && player.getMeta('pvp');

    return target !== player
      && isAlive
      && conditions;
  },

  /** @type {LogicCheck} */
  hasExits,

  /** @type {LogicCheck} */
  cannotFight: (_, __, { e, error }) => {
    const thrown = e ?? error;
    return thrown instanceof CombatErrors.CombatSelfError
      || thrown instanceof CombatErrors.CombatNonPvpError
      || thrown instanceof CombatErrors.CombatInvalidTargetError
      || thrown instanceof CombatErrors.CombatPacifistError;
  }
};
