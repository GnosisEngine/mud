'use strict';

const store = require('../lib/store');

module.exports = {
  name: 'claim',
  aliases: [],

  execute(args, { player, room }) {
    const [sub, ...rest] = (args || '').trim().split(/\s+/);

    // claim list
    if (sub === 'list') {
      const claims = store.getClaimsByOwner(player.id);

      if (!claims.length) {
        return player.emit('message', 'You hold no claims.');
      }

      player.emit('message', 'Your claims:');
      for (const claim of claims) {
        const state = store.getClaimState(claim.id);
        const locked = claim.taxRateLocked ? ' [rate locked]' : '';
        const expiring = state === 'E' ? ' [EXPIRING]' : '';
        player.emit('message', `  ${claim.id}  room:${claim.roomId}  rate:${claim.taxRate}%${locked}${expiring}`);
      }
      return;
    }

    // claim release <claimId>
    if (sub === 'release') {
      const claimId = rest[0];
      if (!claimId) {
        return player.emit('message', 'Usage: claim release <claimId>');
      }

      const claim = store.getClaim(claimId);
      if (!claim) {
        return player.emit('message', `No claim found with id ${claimId}.`);
      }
      if (claim.ownerId !== player.id) {
        return player.emit('message', 'That is not your claim.');
      }
      if (claim.taxRateLocked) {
        return player.emit('message', 'That claim has a locked tax rate — it is attached to a funded collateral package and cannot be released.');
      }

      store.expireClaim(claimId).then(() => {
        player.emit('message', `Claim ${claimId} on room ${claim.roomId} released.`);
      });
      return;
    }

    // claim <taxRate>  — stake current room
    const taxRate = parseInt(sub, 10);
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      return player.emit('message', 'Usage: claim <taxRate 0–100> | claim list | claim release <claimId>');
    }

    const roomId   = room.entityReference;
    const existing = store.getClaimByRoom(roomId);

    if (existing) {
      if (existing.ownerId === player.id) {
        return player.emit('message', 'You already hold this room.');
      }
      return player.emit('message', `This room is claimed by another player.`);
    }

    store.claimRoom(player.id, roomId, { taxRate }).then((claim) => {
      player.emit('message', `Room ${roomId} claimed. Tax rate: ${taxRate}%. Claim id: ${claim.id}`);
    }).catch((err) => {
      player.emit('message', `Failed to claim room: ${err.message}`);
    });
  },
};