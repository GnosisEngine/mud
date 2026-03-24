'use strict';

// const store = require('../lib/store');

const USAGE = `
Collateral commands:
  collateral create <name>
  collateral attach <packageId> <roomId>
  collateral detach <packageId> <roomId>
  collateral list
  collateral status <packageId>
  collateral pledge <packageId> <amount> <durationDays> <yieldFloor>
  collateral cancel <packageId>
  collateral offers
  collateral accept <packageId>
`.trim();

module.exports = {
  aliases: ['col'],
  command: state => (args, player) => {
    const parts = (args || '').trim().split(/\s+/);
    const sub   = parts[0];
    const { store } = state.StorageManager

    switch (sub) {

      case 'create': {
        const name = parts.slice(1).join(' ');
        if (!name) return player.emit('message', 'Usage: collateral create <name>');
        try {
          const pkg = store.listPackage({
            claimantId:      player.id,
            name,
            attachedRoomIds: [],
            requestedAmount: 0,
            durationDays:    0,
            yieldFloor:      0,
          });
          player.emit('message', `Package created. ID: ${pkg.id}  Name: "${pkg.name}"`);
        } catch (err) {
          player.emit('message', `Could not create package: ${err.message}`);
        }
        break;
      }

      case 'attach': {
        const [, packageId, roomId] = parts;
        if (!packageId || !roomId) return player.emit('message', 'Usage: collateral attach <packageId> <roomId>');

        const pkg = store.getPackage(packageId);
        if (!pkg) return player.emit('message', `Package ${packageId} not found.`);
        if (pkg.claimantId !== player.id) return player.emit('message', 'That is not your package.');
        if (pkg.status !== 'O') return player.emit('message', 'Can only attach rooms to open (unfunded) packages.');

        const claim = store.getClaimByRoom(roomId);
        if (!claim) return player.emit('message', `Room ${roomId} is not claimed.`);
        if (claim.ownerId !== player.id) return player.emit('message', 'You do not own the claim on that room.');
        if (claim.taxRateLocked) return player.emit('message', 'That room is already attached to a funded package.');

        const alreadyAttached = store.getPackagesByClaimant(player.id).some(
          p => p.id !== packageId && p.attachedRoomIds.includes(roomId)
        );
        if (alreadyAttached) return player.emit('message', 'That room is already in another package. No rehypothecation.');

        const updated = { ...pkg, attachedRoomIds: [...pkg.attachedRoomIds, roomId] };
        store.deletePackage(packageId);
        store.listPackage(updated);
        player.emit('message', `Room ${roomId} attached to package ${packageId}.`);
        break;
      }

      case 'detach': {
        const [, packageId, roomId] = parts;
        if (!packageId || !roomId) return player.emit('message', 'Usage: collateral detach <packageId> <roomId>');

        const pkg = store.getPackage(packageId);
        if (!pkg) return player.emit('message', `Package ${packageId} not found.`);
        if (pkg.claimantId !== player.id) return player.emit('message', 'That is not your package.');
        if (pkg.status !== 'O') return player.emit('message', 'Cannot detach rooms from a funded or closed package.');
        if (!pkg.attachedRoomIds.includes(roomId)) return player.emit('message', `Room ${roomId} is not attached to this package.`);

        const updated = { ...pkg, attachedRoomIds: pkg.attachedRoomIds.filter(r => r !== roomId) };
        store.deletePackage(packageId);
        store.listPackage(updated);
        player.emit('message', `Room ${roomId} detached from package ${packageId}.`);
        break;
      }

      case 'list': {
        const asClaimant = store.getPackagesByClaimant(player.id);
        const asLender   = store.getPackagesByLender(player.id);

        if (!asClaimant.length && !asLender.length) {
          return player.emit('message', 'You have no collateral packages.');
        }
        if (asClaimant.length) {
          player.emit('message', 'Your packages (claimant):');
          for (const p of asClaimant) {
            player.emit('message', `  ${p.id}  "${p.name}"  status:${p.status}  rooms:${p.attachedRoomIds.join(',') || 'none'}  req:${p.requestedAmount}  ${p.durationDays}d  floor:${p.yieldFloor}`);
          }
        }
        if (asLender.length) {
          player.emit('message', 'Your packages (lender):');
          for (const p of asLender) {
            player.emit('message', `  ${p.id}  "${p.name}"  claimant:${p.claimantId}  status:${p.status}  floor:${p.yieldFloor}`);
          }
        }
        break;
      }

      case 'status': {
        const packageId = parts[1];
        if (!packageId) return player.emit('message', 'Usage: collateral status <packageId>');

        const pkg = store.getPackage(packageId);
        if (!pkg) return player.emit('message', `Package ${packageId} not found.`);

        const STATUS_LABEL = { O: 'open offer', F: 'funded', D: 'defaulted', C: 'closed' };
        player.emit('message', [
          `Package:       ${pkg.id}  "${pkg.name}"`,
          `Claimant:      ${pkg.claimantId}`,
          `Status:        ${STATUS_LABEL[pkg.status] || pkg.status}`,
          `Lender:        ${pkg.lenderId || '—'}`,
          `Attached:      ${pkg.attachedRoomIds.join(', ') || 'none'}`,
          `Requesting:    ${pkg.requestedAmount}`,
          `Duration:      ${pkg.durationDays} days`,
          `Yield floor:   ${pkg.yieldFloor}/day`,
        ].join('\n'));
        break;
      }

      case 'pledge': {
        const [, packageId, amount, durationDays, yieldFloor] = parts;
        if (!packageId || !amount || !durationDays || !yieldFloor) {
          return player.emit('message', 'Usage: collateral pledge <packageId> <amount> <durationDays> <yieldFloor>');
        }
        const pkg = store.getPackage(packageId);
        if (!pkg) return player.emit('message', `Package ${packageId} not found.`);
        if (pkg.claimantId !== player.id) return player.emit('message', 'That is not your package.');
        if (pkg.status !== 'O') return player.emit('message', 'Package is already pledged or closed.');
        if (!pkg.attachedRoomIds.length) return player.emit('message', 'Attach at least one room before pledging.');

        const updated = {
          ...pkg,
          requestedAmount: parseInt(amount, 10),
          durationDays:    parseInt(durationDays, 10),
          yieldFloor:      parseInt(yieldFloor, 10),
        };
        store.deletePackage(packageId);
        store.listPackage(updated);
        player.emit('message', `Package ${packageId} posted. Requesting: ${updated.requestedAmount}  Duration: ${updated.durationDays}d  Floor: ${updated.yieldFloor}/day`);
        break;
      }

      case 'cancel': {
        const packageId = parts[1];
        if (!packageId) return player.emit('message', 'Usage: collateral cancel <packageId>');

        const pkg = store.getPackage(packageId);
        if (!pkg) return player.emit('message', `Package ${packageId} not found.`);
        if (pkg.claimantId !== player.id) return player.emit('message', 'That is not your package.');
        if (pkg.status !== 'O') return player.emit('message', 'Can only cancel open (unfunded) packages.');

        store.deletePackage(packageId);
        player.emit('message', `Package ${packageId} cancelled and removed.`);
        break;
      }

      case 'offers': {
        const open = store.getOpenPackages();
        if (!open.length) return player.emit('message', 'No open collateral offers right now.');
        player.emit('message', 'Open collateral offers:');
        for (const p of open) {
          player.emit('message', `  ${p.id}  "${p.name}"  claimant:${p.claimantId}  req:${p.requestedAmount}  ${p.durationDays}d  floor:${p.yieldFloor}/day  rooms:${p.attachedRoomIds.length}`);
        }
        break;
      }

      case 'accept': {
        const packageId = parts[1];
        if (!packageId) return player.emit('message', 'Usage: collateral accept <packageId>');

        const pkg = store.getPackage(packageId);
        if (!pkg) return player.emit('message', `Package ${packageId} not found.`);
        if (pkg.status !== 'O') return player.emit('message', 'This package is no longer open.');
        if (pkg.claimantId === player.id) return player.emit('message', 'You cannot fund your own package.');

        store.fundPackage(packageId, player.id).then((funded) => {
          player.emit('message', `You have funded package ${funded.id} "${funded.name}". Yield will route to you for ${funded.durationDays} days.`);
        }).catch((err) => {
          player.emit('message', `Could not fund package: ${err.message}`);
        });
        break;
      }

      default:
        player.emit('message', USAGE);
    }
  },
};