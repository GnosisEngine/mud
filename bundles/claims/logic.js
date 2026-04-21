'use strict';
const enforcement = require('./lib/enforcement');
const { isSelf } = require('../lib/logic');
const NOOP = {};

function hasSubmitted(_, enforcer, { target } = NOOP) {
  return enforcement.isSubmittedTo(target.name, enforcer.name);
}

module.exports = {
  /** @type {import('types').LogicCheck} */
  hasEnforcablesNear: (_, player) => {
    let count = 0;

    for (const occupant of (player.room?.players ?? [])) {
      if (occupant === player) {
        continue;
      }

      if (!enforcement.getSubmission(occupant.name)) {
        count += 1;
      }
    }

    return count > 0;
  },

  /** @type {import('types').LogicCheck} */
  canClaimRoom: (state, player, { roomId, claim } = NOOP) => {
    if (claim === undefined) {
      roomId = roomId === undefined
        ? player.room?.entityReference
        : roomId;

      claim = state.StorageManager.store.getClaimByRoom(roomId);
    }

    if (claim) {
      if (!!(claim && claim.ownerId === player.name)) {
        return false;
      }
      return false;
    }

    return true;
  },

  /** @type {import('types').LogicCheck} */
  hasNoClaims: (state, player, { claims } = NOOP) => {
    const ownedClaims = claims ?? state.StorageManager.store.getClaimsByOwner(player.name);
    return ownedClaims.length === 0;
  },

  /** @type {import('types').LogicCheck} */
  claimIdExists: (state, player, { claimId, claims, claim } = NOOP) => {
    if (claim === undefined) {
      const ownedClaims = claims ?? state.StorageManager.store.getClaimsByOwner(player.name);
      claim = ownedClaims[parseInt(claimId) - 1];
    }

    return claim !== undefined;
  },

  /** @type {import('types').LogicCheck} */
  ownsClaim: (_, player, { claim } = NOOP) => {
    return !!(claim && claim.ownerId === player.name);
  },

  /** @type {import('types').LogicCheck} */
  isCollateralized: (_, __, { claim } = NOOP) => {
    return claim.taxRateLocked;
  },

  /** @type {import('types').LogicCheck} */
  isClaimExpiring: (state, _, { claimId } = NOOP) => {
    const claimState = state.StorageManager.store.getClaimState(claimId);
    return claimState === 'E';
  },

  /** @type {import('types').LogicCheck} */
  isTargetSelf: isSelf,

  /** @type {import('types').LogicCheck} */
  hasBeenThreatened: (_, enforcer, { target } = NOOP) => {
    return enforcement.hasThreat(enforcer.name, target.name);
  },

  /** @type {import('types').LogicCheck} */
  isThreatened: (_, player) => {
    return enforcement.findThreatAgainst(player.name) !== null;
  },

  /** @type {import('types').LogicCheck} */
  hasSubmitted,
};
