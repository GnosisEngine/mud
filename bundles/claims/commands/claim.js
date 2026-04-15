'use strict';

const { Broadcast } = require('ranvier');
const {
  hasNoClaims,
  claimIdExists,
  ownsClaim,
  isCollateralized,
  isClaimExpiring
} = require('../logic');
const say = Broadcast.sayAt;

/**
 *
 */
function claimList(state, player) {
  const { store } = state.StorageManager;

  const claims = store.getClaimsByOwner(player.name);
  if (hasNoClaims(state, player, { claims })) {
    return say(player, 'You hold no claims.');
  }

  say(player, 'Your claims:');

  let i = 1;
  for (const claim of claims) {
    const expiring = isClaimExpiring(state, player, { claimId: claim.id })
      ? ' [EXPIRING]'
      : '';
    const locked   = isCollateralized(state, player, { claim })
      ? ' [rate locked]'
      : '';
    const room = state.RoomManager.getRoom(claim.roomId);

    say(player, `  ${i}.)  ${room.area.title} / ${room.title} @ ${claim.taxRate}%${locked}${expiring}`);
    i += 1;
  }
}

module.exports = {
  claimList,
  aliases: [],
  command: state => (args, player) => {
    const [sub, ...rest] = (args || '').trim().split(/\s+/);

    const { store } = state.StorageManager;

    // claim list
    if (sub === 'list') {
      return claimList(state, player);
    }

    // claim release <claimId>
    if (sub === 'release') {
      const claimId = rest[0];
      if (!claimId) {
        return say(player, 'Usage: claim release <claimId>');
      }

      const claims = store.getClaimsByOwner(player.name);

      const claim = claims[parseInt(claimId) - 1];
      if (!claimIdExists(state, player, { claim, claims, claimId })) {
        return say(player, `No claim found at #${claimId}.`);
      }
      if (ownsClaim(state, player, { claim }) === false) {
        return say(player, 'That is not your claim.');
      }
      if (isCollateralized(state, player, { claim })) {
        return say(player, 'That claim has a locked tax rate — it is attached to a funded collateral package and cannot be released.');
      }

      store.expireClaim(claim.id).then(() => {
        const room = state.RoomManager.getRoom(claim.roomId);
        say(player, `Claim #${claimId} on ${room.title} released.`);
      });
      return;
    }

    // claim <taxRate>  — stake current room
    const taxRate = parseInt(sub, 10);
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      return say(player, 'Usage: claim <taxRate 0–100> | claim list | claim release <claimId>');
    }

    const room = player.room;
    const roomId = room.entityReference;
    const existing = store.getClaimByRoom(roomId);

    if (existing) {
      if (ownsClaim(state, player, { claim: existing })) {
        return say(player, 'You already hold this room.');
      }
      return say(player, 'This room is already claimed by another player.');
    }

    store.claimRoom(player.name, roomId, { taxRate }).then((/*claim*/) => {
      say(player, `You've claimed ${room.title} at a tax rate of ${taxRate}%.`);
    }).catch((err) => {
      say(player, `Failed to claim room: ${err.message}`);
    });
  },
};
