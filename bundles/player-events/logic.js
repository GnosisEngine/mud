'use strict';
const { hasPendingCommands, isNpc, isInCombat, isDoorLocked, isDoorClosed } = require('../lib/logic');

const NOOP = {};

module.exports = {
  hasPendingCommands,

  isIdleKickable: (_, player, { timeSinceLastCommand, maxIdleTime } = NOOP) => {
    return timeSinceLastCommand > maxIdleTime && !player.isInCombat();
  },

  hasRoomExit: (_, __, { roomExit } = NOOP) => {
    return !!roomExit;
  },

  isInCombat,

  isDoorLocked,

  isDoorClosed,

  isFollowerInRoom: (_, __, { follower, room } = NOOP) => {
    return !!(follower && follower.room === room);
  },

  isNpc,

  isLevelUp: (_, player, { amount, totalTnl } = NOOP) => {
    return player.experience + amount > totalTnl;
  },
};
