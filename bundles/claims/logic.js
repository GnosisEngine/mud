'use strict';

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
    return claim.ownerId === player.name;
  },

  isCollateralized: (_, __, { claim }) => {
    return claim.taxRateLocked;
  }
};
