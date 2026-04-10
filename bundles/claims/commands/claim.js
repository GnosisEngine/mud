'use strict';

const { Broadcast } = require('ranvier');
const say = Broadcast.sayAt;

module.exports = {
  aliases: [],
  command: state => (args, player) => {
    const [sub, ...rest] = (args || '').trim().split(/\s+/);

    const { store } = state.StorageManager;

    // claim list
    if (sub === 'list') {
      const claims = store.getClaimsByOwner(player.name);
      if (!claims.length) {
        return say(player, 'You hold no claims.');
      }

      say(player, 'Your claims:');

      let i = 1;
      for (const claim of claims) {
        const claimState = store.getClaimState(claim.id);
        const locked   = claim.taxRateLocked ? ' [rate locked]' : '';
        const expiring = claimState === 'E' ? ' [EXPIRING]' : '';
        const room = state.RoomManager.getRoom(claim.roomId);

        say(player, `  ${i}.)  ${room.area.title} / ${room.title} @ ${claim.taxRate}%${locked}${expiring}`);
        i += 1;
      }
      return;
    }

    // claim release <claimId>
    if (sub === 'release') {
      const claimId = rest[0];
      if (!claimId) {
        return say(player, 'Usage: claim release <claimId>');
      }

      const claims = store.getClaimsByOwner(player.name);

      const claim = claims[parseInt(claimId) - 1];
      if (!claim) {
        return say(player, `No claim found at #${claimId}.`);
      }
      if (claim.ownerId !== player.name) {
        return say(player, 'That is not your claim.');
      }
      if (claim.taxRateLocked) {
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

    const room     = player.room;
    const roomId   = room.entityReference;
    const existing = store.getClaimByRoom(roomId);

    if (existing) {
      if (existing.ownerId === player.name) {
        return say(player, 'You already hold this room.');
      }
      return say(player, 'This room is already claimed by another player.');
    }

    store.claimRoom(player.name, roomId, { taxRate }).then((claim) => {
      say(player, `You've claimed ${room.title} at a tax rate of ${taxRate}%.`);
    }).catch((err) => {
      say(player, `Failed to claim room: ${err.message}`);
    });
  },
};
