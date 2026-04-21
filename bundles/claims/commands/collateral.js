'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */

const { Broadcast } = require('ranvier');
const say = Broadcast.sayAt;

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

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (args, player) => {
    const parts = (args || '').trim().split(/\s+/);
    const sub   = parts[0];
    const { store } = state.StorageManager;

    switch (sub) {

      case 'create': {
        const name = parts.slice(1).join(' ');
        if (!name) return say(player,  'Usage: collateral create <name>');
        try {
          const pkg = store.listPackage({
            claimantId:      player.name,
            name,
            attachedRoomIds: [],
            requestedAmount: 0,
            durationDays:    0,
            yieldFloor:      0,
          });
          say(player,  `Package created. ID: ${pkg.id}  Name: "${pkg.name}"`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          say(player, `Could not create package: ${msg}`);
        }
        break;
      }

      case 'attach': {
        const [, packageId, roomId] = parts;
        if (!packageId || !roomId) return say(player,  'Usage: collateral attach <packageId> <roomId>');

        const pkg = store.getPackage(packageId);
        if (!pkg) return say(player,  `Package ${packageId} not found.`);
        if (pkg.claimantId !== player.name) return say(player,  'That is not your package.');
        if (pkg.status !== 'O') return say(player,  'Can only attach rooms to open (unfunded) packages.');

        const claim = store.getClaimByRoom(roomId);
        if (!claim) return say(player,  `Room ${roomId} is not claimed.`);
        if (claim.ownerId !== player.name) return say(player,  'You do not own the claim on that room.');
        if (claim.taxRateLocked) return say(player,  'That room is already attached to a funded package.');

        const alreadyAttached = store.getPackagesByClaimant(player.name).some(
          p => p.id !== packageId && p.attachedRoomIds.includes(roomId)
        );
        if (alreadyAttached) return say(player,  'That room is already in another package. No rehypothecation.');

        const updated = { ...pkg, attachedRoomIds: [...pkg.attachedRoomIds, roomId] };
        store.deletePackage(packageId);
        store.listPackage(updated);
        say(player,  `Room ${roomId} attached to package ${packageId}.`);
        break;
      }

      case 'detach': {
        const [, packageId, roomId] = parts;
        if (!packageId || !roomId) return say(player,  'Usage: collateral detach <packageId> <roomId>');

        const pkg = store.getPackage(packageId);
        if (!pkg) return say(player,  `Package ${packageId} not found.`);
        if (pkg.claimantId !== player.name) return say(player,  'That is not your package.');
        if (pkg.status !== 'O') return say(player,  'Cannot detach rooms from a funded or closed package.');
        if (!pkg.attachedRoomIds.includes(roomId)) return say(player,  `Room ${roomId} is not attached to this package.`);

        const updated = { ...pkg, attachedRoomIds: pkg.attachedRoomIds.filter(r => r !== roomId) };
        store.deletePackage(packageId);
        store.listPackage(updated);
        say(player,  `Room ${roomId} detached from package ${packageId}.`);
        break;
      }

      case 'list': {
        const asClaimant = store.getPackagesByClaimant(player.name);
        const asLender   = store.getPackagesByLender(player.name);

        if (!asClaimant.length && !asLender.length) {
          return say(player,  'You have no collateral packages.');
        }
        if (asClaimant.length) {
          say(player,  'Your packages (claimant):');
          for (const p of asClaimant) {
            say(player,  `  ${p.id}  "${p.name}"  status:${p.status}  rooms:${p.attachedRoomIds.join(',') || 'none'}  req:${p.requestedAmount}  ${p.durationDays}d  floor:${p.yieldFloor}`);
          }
        }
        if (asLender.length) {
          say(player,  'Your packages (lender):');
          for (const p of asLender) {
            say(player,  `  ${p.id}  "${p.name}"  claimant:${p.claimantId}  status:${p.status}  floor:${p.yieldFloor}`);
          }
        }
        break;
      }

      case 'status': {
        const packageId = parts[1];
        if (!packageId) return say(player,  'Usage: collateral status <packageId>');

        const pkg = store.getPackage(packageId);
        if (!pkg) return say(player,  `Package ${packageId} not found.`);

        const STATUS_LABEL = { O: 'open offer', F: 'funded', D: 'defaulted', C: 'closed' };
        say(player,  [
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
          return say(player,  'Usage: collateral pledge <packageId> <amount> <durationDays> <yieldFloor>');
        }
        const pkg = store.getPackage(packageId);
        if (!pkg) return say(player,  `Package ${packageId} not found.`);
        if (pkg.claimantId !== player.name) return say(player,  'That is not your package.');
        if (pkg.status !== 'O') return say(player,  'Package is already pledged or closed.');
        if (!pkg.attachedRoomIds.length) return say(player,  'Attach at least one room before pledging.');

        const updated = {
          ...pkg,
          requestedAmount: parseInt(amount, 10),
          durationDays:    parseInt(durationDays, 10),
          yieldFloor:      parseInt(yieldFloor, 10),
        };
        store.deletePackage(packageId);
        store.listPackage(updated);
        say(player,  `Package ${packageId} posted. Requesting: ${updated.requestedAmount}  Duration: ${updated.durationDays}d  Floor: ${updated.yieldFloor}/day`);
        break;
      }

      case 'cancel': {
        const packageId = parts[1];
        if (!packageId) return say(player,  'Usage: collateral cancel <packageId>');

        const pkg = store.getPackage(packageId);
        if (!pkg) return say(player,  `Package ${packageId} not found.`);
        if (pkg.claimantId !== player.name) return say(player,  'That is not your package.');
        if (pkg.status !== 'O') return say(player,  'Can only cancel open (unfunded) packages.');

        store.deletePackage(packageId);
        say(player,  `Package ${packageId} cancelled and removed.`);
        break;
      }

      case 'offers': {
        const open = store.getOpenPackages();
        if (!open.length) return say(player,  'No open collateral offers right now.');
        say(player,  'Open collateral offers:');
        for (const p of open) {
          say(player,  `  ${p.id}  "${p.name}"  claimant:${p.claimantId}  req:${p.requestedAmount}  ${p.durationDays}d  floor:${p.yieldFloor}/day  rooms:${p.attachedRoomIds.length}`);
        }
        break;
      }

      case 'accept': {
        const packageId = parts[1];
        if (!packageId) return say(player,  'Usage: collateral accept <packageId>');

        const pkg = store.getPackage(packageId);
        if (!pkg) return say(player,  `Package ${packageId} not found.`);
        if (pkg.status !== 'O') return say(player,  'This package is no longer open.');
        if (pkg.claimantId === player.name) return say(player,  'You cannot fund your own package.');

        store.fundPackage(packageId, player.name).then((funded) => {
          say(player,  `You have funded package ${funded.id} "${funded.name}". Yield will route to you for ${funded.durationDays} days.`);
        }).catch((err) => {
          say(player,  `Could not fund package: ${err.message}`);
        });
        break;
      }

      default:
        say(player,  USAGE);
    }
  },
};
