'use strict';
const NOOP = {};

module.exports = {
  isRespawnReady: (_, __, { sinceLastTick, respawnInterval } = NOOP) => {
    return sinceLastTick >= respawnInterval * 1000;
  },

  isBelowMaxLoad: (_, __, { count, maxLoad } = NOOP) => {
    return count < maxLoad;
  },

  shouldReplaceOnRespawn: (_, __, { defaultItem } = NOOP) => {
    return !!(defaultItem && defaultItem.replaceOnRespawn);
  },
};
