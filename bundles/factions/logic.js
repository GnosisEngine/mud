'use strict';
const NOOP = {};

const AXES = ['affinity', 'honor', 'trust', 'debt'];

module.exports = {
  hasFactionStanceChanged: (_, __, { before, after } = NOOP) => {
    if (!before || !after) return false;
    return !AXES.every(axis => before[axis] === after[axis]);
  },

  roomHasFaction: (_, __, { room } = NOOP) => {
    return !!(room && room.faction !== undefined);
  },

  isStranger: (_, __, { renown, factionDef } = NOOP) => {
    return renown < factionDef.renownThreshold;
  },
};
