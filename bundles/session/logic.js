// bundles/session/logic.js
'use strict';

const NOOP = {};

module.exports = {
  isEthereal: (_, player) => {
    return player.hasEffectType('ethereal');
  },

  ownsSocket: (_, player, { stream } = NOOP) => {
    return player.socket === stream;
  },
};
