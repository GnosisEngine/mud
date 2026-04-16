'use strict';
const NOOP = {};

module.exports = {
  isInCombat: (_, npc) => {
    return npc.isInCombat();
  },

  hasAggroTarget: (_, npc) => {
    return !!npc._aggroTarget;
  },

  isTargetInRoom: (_, npc, { target } = NOOP) => {
    return !!(target && target.room === npc.room);
  },

  isAttackReady: (_, __, { sinceLastCheck, delayLength } = NOOP) => {
    return sinceLastCheck >= delayLength;
  },

  isWarnReady: (_, __, { sinceLastCheck, delayLength } = NOOP) => {
    return sinceLastCheck >= delayLength / 2;
  },

  hasWarned: (_, npc) => {
    return !!npc._aggroWarned;
  },

  hasPlayersInRoom: (_, npc) => {
    return !!(npc.room && npc.room.players.size);
  },

  isAggroTowardsNpc: (_, __, { config, targetNpc } = NOOP) => {
    return !!(config.towards.npcs === true ||
      (Array.isArray(config.towards.npcs) && config.towards.npcs.includes(targetNpc.entityReference)));
  },

  isWanderReady: (_, npc, { interval } = NOOP) => {
    return Date.now() - npc._lastWanderTime >= interval * 1000;
  },

  hasExits: (_, __, { exits } = NOOP) => {
    return !!(exits && exits.length);
  },

  isDoorPassable: (_, __, { door } = NOOP) => {
    return !door || (!door.locked && !door.closed);
  },

  isRoomAllowed: (_, npc, { config, randomRoom } = NOOP) => {
    if (!randomRoom) return false;
    if (config.restrictTo && !config.restrictTo.includes(randomRoom.entityReference)) return false;
    if (config.areaRestricted && randomRoom.area !== npc.area) return false;
    return true;
  },
};
