'use strict';
const { isSelf } = require('../lib/logic');

const NOOP = {};

module.exports = {
  isSelf,

  isFollowing: (_, player) => {
    return !!player.following;
  },

  isInParty: (_, player) => {
    return !!player.party;
  },

  isPartyLeader: (_, player) => {
    return !!(player.party && player === player.party.leader);
  },

  isTargetInParty: (_, __, { target } = NOOP) => {
    return !!(target && target.party);
  },

  isTargetPartyLeader: (_, __, { target } = NOOP) => {
    return !!(target && target.party && target === target.party.leader);
  },

  isInvited: (_, player, { target } = NOOP) => {
    return !!(target && target.party && target.party.isInvited(player));
  },
};
