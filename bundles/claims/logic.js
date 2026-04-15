'use strict';
const enforcement = require('./lib/enforcement');

module.exports = {
  hasNoClaims: (state, player, { claims } ) => {
    const ownedClaims = claims ?? state.StorageManager.getClaimsByOwner(player.name);
    return ownedClaims.length === 0;
  },

  claimIdExists: (state, player, { claimId, claims, claim }) => {
    if (claim === undefined) {
      const ownedClaims = claims ?? state.StorageManager.getClaimsByOwner(player.name);
      claim = ownedClaims[parseInt(claimId) - 1];
    }

    return claim !== undefined;
  },

  ownsClaim: (_, player, { claim }) => {
    return claim && claim.ownerId === player.name;
  },

  isCollateralized: (_, __, { claim }) => {
    return claim.taxRateLocked;
  },

  isClaimExpiring: (state, _, { claimId }) => {
    const claimState = state.StorageManager.store.getClaimState(claimId);
    return claimState === 'E';
  },

  isTargetSelf: (_, player, { target }) => {
    return target === player;
  },

  hasBeenThreatened: (_, enforcer, { target }) => {
    return enforcement.hasThreat(enforcer.name, target.name);
  },

  hasSubmitted: (state, enforcer, { target }) => {
    return enforcement.isSubmittedTo(target.name, enforcer.name);
  }
};
