'use strict';
const NOOP = {};

module.exports = {
  hasNoArgs: (_, __, { args } = NOOP) => {
    return !args || !args.length;
  },

  isSelf: (_, player, { target } = NOOP) => {
    return target === player;
  },

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

  isConfirmed: (_, __, { args, word } = NOOP) => {
    return args === word;
  },
};
