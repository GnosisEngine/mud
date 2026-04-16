'use strict';
const NOOP = {};

module.exports = {
  hasPendingCommands: (_, player) => {
    return !!(player.commandQueue.hasPending && player.commandQueue.lagRemaining <= 0);
  },

  isIdleKickable: (_, player, { timeSinceLastCommand, maxIdleTime } = NOOP) => {
    return timeSinceLastCommand > maxIdleTime && !player.isInCombat();
  },

  hasRoomExit: (_, __, { roomExit } = NOOP) => {
    return !!roomExit;
  },

  isInCombat: (_, player) => {
    return player.isInCombat();
  },

  isDoorLocked: (_, __, { door } = NOOP) => {
    return !!(door && door.locked);
  },

  isDoorClosed: (_, __, { door } = NOOP) => {
    return !!(door && door.closed);
  },

  isFollowerInRoom: (_, __, { follower, room } = NOOP) => {
    return !!(follower && follower.room === room);
  },

  isNpcFollower: (_, __, { follower } = NOOP) => {
    return !!(follower && follower.isNpc);
  },

  isLevelUp: (_, player, { amount, totalTnl } = NOOP) => {
    return player.experience + amount > totalTnl;
  },
};
