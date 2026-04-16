'use strict';
const CombatErrors = require('./lib/CombatErrors');
const { hasWeapon, hasExits, isNpc, isDoorImpassable, isInCombat } = require('../lib/logic');
const NOOP = {};

module.exports = {
  isNpc,

  roomExists: (state, _, { room, roomId } = NOOP) => {
    if (roomId !== undefined) {
      room = state.RoomManager.getRoom(roomId);
    }

    return room !== undefined;
  },

  isDoorImpassable,

  isInCombat,

  isPvpFlagged: (_, player) => {
    return player.getMeta('pvp');
  },

  isLevelDiff: (_, player, { target, amount }) => {
    return player.level  - target.level > amount;
  },

  hasPvpTargetsNear: (_, player) => {
    if (player.getMeta('pvp') === false) {
      return false;
    }

    const candidates = player.room.players;

    return candidates.filter(c =>
      c !== player
      && c.hasAttribute('health')
      && (c.getAttribute('health') > 0
      && !!c.combatData.killed === false)
      && c.getMeta('pvp')
    ).length > 0;
  },

  hasPveTargetsNear: (_, player) => {
    const candidates = player.room.npcs;

    return candidates.filter(c =>
      c.hasAttribute('health')
      && (c.getAttribute('health') > 0
      && !!c.combatData.killed === false)
      && c.isNpc
    ).length > 0;
  },

  hasTargetsNear: (_, player) => {
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

  hasWeapon,

  isRegenerating: (_, player) => {
    return player.hasEffectType('regen');
  },

  canPerformCriticalAttack: (_, player) => {
    return player.hasAttribute('critical');
  },

  isAlive: (_, player) => {
    return player.getAttribute('health') > 0;
  },

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

  hasExits,

  cannotFight: (_, __, { e, error }) => {
    const thrown = e ?? error;
    return thrown instanceof CombatErrors.CombatSelfError
      || thrown instanceof CombatErrors.CombatNonPvpError
      || thrown instanceof CombatErrors.CombatInvalidTargetError
      || thrown instanceof CombatErrors.CombatPacifistError;
  }
};
