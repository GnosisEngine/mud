// bundles/ranvier-storage/lib/store.js
'use strict';

const { now } = require('./codec');
const { generateClaimId, generateCollateralId } = require('./ids');
const { compact } = require('./compaction');
const { LOGOUT_GRACE_MS } = require('../constants');

/**
 * The public API. The only layer consumers ever touch directly.
 *
 * Owns the graph (claims) and db (packages) instances.
 * Every method that changes state:
 *   1. Appends to the log (claims) or writes to SQLite (packages)
 *   2. Updates the in-memory graph / confirmed via SQLite
 *   3. Checks compaction threshold after claim log writes
 *
 * Log append always happens before graph mutation — if the process crashes
 * between the two, replay will re-apply the event and the graph will be
 * correct on next boot.
 *
 * The store does not expose the log, graph, or db directly.
 */

class Store {
  /**
   * @param {import('./log').Log}     log
   * @param {import('./graph').Graph} graph
   * @param {import('./db').Db}       db
   */
  constructor(log, graph, db) {
    this._log = log;
    this._graph = graph;
    this._db = db;
  }

  // Internal helpers

  /**
   * Append to log, apply to graph, then check compaction threshold.
   * All claim mutations flow through here.
   * @param {string}   opcode
   * @param {object}   data
   * @param {Function} apply  — graph mutation to run after append
   */
  async _write(opcode, data, apply) {
    this._log.append(opcode, data);
    apply();

    if (this._log.needsCompaction()) {
      await compact(this._log, this._graph);
    }
  }

  // Claims — writes

  /**
   * A player stakes a claim on a room.
   * If the room already has a claim, it must be expired first.
   *
   * @param {string} ownerId
   * @param {string} roomId
   * @param {{ taxRate?: number, taxRateLocked?: boolean, autoRenewEnabled?: boolean }} [opts]
   */
  async claimRoom(ownerId, roomId, { taxRate = 0, taxRateLocked = false, autoRenewEnabled = false } = {}) {
    const existing = this._graph.getClaimByRoom(roomId);
    if (existing) {
      throw new Error(`store: room ${roomId} is already claimed by ${existing.ownerId} — expire it first`);
    }

    const id = generateClaimId();
    const claimedAt = now();
    const data = { id, roomId, ownerId, claimedAt, taxRate, taxRateLocked, autoRenewEnabled };

    await this._write('C', data, () => this._graph.applyClaim(data));

    return this._graph.getClaim(id);
  }

  /**
   * Transfer a single claim to a new owner.
   * Clean transfer — no package implications for the store layer.
   * For kill transfers where package continuity must be preserved,
   * the caller is responsible for coordinating with the package system.
   *
   * @param {string} claimId
   * @param {string} toOwnerId
   */
  async transferClaim(claimId, toOwnerId) {
    const data = { id: claimId, ownerId: toOwnerId };
    await this._write('T', data, () => this._graph.transferClaim(data));
  }

  /**
   * Transfer ALL claims from one player to another.
   * Called on player death — winner takes all.
   * Fires one T event per claim so the log is granular and replayable.
   *
   * @param {string} fromOwnerId
   * @param {string} toOwnerId
   * @returns {Promise<number>} count of claims transferred
   */
  async transferAllClaims(fromOwnerId, toOwnerId) {
    const claims = this._graph.getClaimsByOwner(fromOwnerId);

    for (const claim of claims) {
      await this.transferClaim(claim.id, toOwnerId);
    }

    return claims.length;
  }

  /**
   * Expire (delete) a claim entirely.
   *
   * @param {string} claimId
   */
  async expireClaim(claimId) {
    const data = { id: claimId };
    await this._write('X', data, () => this._graph.expireClaim(data));
  }

  /**
   * Flush all claims whose expiresAt has passed.
   * Called by the bundle's expiry timer.
   *
   * @returns {Promise<number>} count of claims expired
   */
  async flushExpiredClaims() {
    const expired = this._graph.getExpiredClaims();

    for (const claim of expired) {
      await this.expireClaim(claim.id);
    }

    return expired.length;
  }

  /**
   * Arm the logout expiry timer on all claims owned by a player.
   * Called when a player disconnects.
   *
   * @param {string} ownerId
   * @param {number} expiresAt — unix ms timestamp when claims should expire
   */
  async armExpiryForPlayer(ownerId, expiresAt = Date.now() + LOGOUT_GRACE_MS) {
    const claims = this._graph.getClaimsByOwner(ownerId);

    for (const claim of claims) {
      const data = {
        id: claim.id,
        expiresAt: expiresAt ?? claim.expiresAt
      };

      await this._write('O', data, () => this._graph.setClaimExpiry(data));
    }
  }

  /**
   * Disarm the logout expiry timer on all claims owned by a player.
   * Called when a player reconnects.
   *
   * @param {string} ownerId
   */
  async disarmExpiryForPlayer(ownerId) {
    const claims = this._graph.getClaimsByOwner(ownerId);

    for (const claim of claims) {
      const data = { id: claim.id, expiresAt: null };
      await this._write('O', data, () => this._graph.setClaimExpiry(data));
    }
  }

  /**
   * Record an extension fee payment on a claim.
   *
   * @param {string} claimId
   * @param {number} extensionExpiry — new expiry unix ms
   */
  async extendClaim(claimId, extensionExpiry) {
    const data = { id: claimId, extensionExpiry };
    await this._write('E', data, () => this._graph.extendClaim(data));
  }

  // Claims — reads

  /**
   * @param {string} claimId
   * @returns {object|null}
   */
  getClaim(claimId) {
    return this._graph.getClaim(claimId);
  }

  /**
   * @param {string} roomId
   * @returns {object|null}
   */
  getClaimByRoom(roomId) {
    return this._graph.getClaimByRoom(roomId);
  }

  /**
   * @param {string} ownerId
   * @returns {object[]}
   */
  getClaimsByOwner(ownerId) {
    return this._graph.getClaimsByOwner(ownerId);
  }

  /**
   * Derive the claim state for display or logic checks.
   * Returns 'A' (active) or 'E' (expiring).
   * For package states (P, W) query the package directly.
   *
   * @param {string} claimId
   * @returns {'A'|'E'|null} null if claim does not exist
   */
  getClaimState(claimId) {
    const claim = this._graph.getClaim(claimId);
    if (!claim) return null;
    return this._graph.claimState(claim);
  }

  // Packages — writes

  /**
   * List a new collateral package.
   *
   * @param {object} opts
   * @param {string}   opts.claimantId
   * @param {string}   opts.name
   * @param {string[]} opts.attachedRoomIds  — claim IDs included in the package
   * @param {number}   opts.requestedAmount
   * @param {number}   opts.durationDays
   * @param {number}   opts.yieldFloor
   * @returns {object} the new package
   */
  listPackage({ claimantId, name, attachedRoomIds, requestedAmount, durationDays, yieldFloor }) {
    if (!Array.isArray(attachedRoomIds) || attachedRoomIds.length !== 1) {
      throw new Error('store: a collateral package must contain exactly one room — no rehypothecation');
    }

    const id = generateCollateralId();

    this._db.listPackage({
      id,
      name,
      claimantId,
      attachedRoomIds,
      requestedAmount,
      durationDays,
      yieldFloor,
      status: 'O',
      lenderId: null,
    });

    return this._db.getPackage(id);
  }

  /**
   * A lender funds an open package.
   * Locks the tax rate on the attached claim — rate is frozen for the
   * duration of the pledge. This is the lender's protection against
   * the claimant raising rates to starve yield.
   *
   * @param {string} packageId
   * @param {string} lenderId
   * @returns {Promise<object>} updated package
   */
  async fundPackage(packageId, lenderId) {
    this._db.fundPackage(packageId, lenderId);

    // Lock tax rate on the attached claim
    const pkg = this._db.getPackage(packageId);
    const claimId = pkg.attachedRoomIds[0];
    const data = { id: claimId };
    await this._write('R', data, () => this._graph.lockClaimTaxRate(data));

    return pkg;
  }

  /**
   * A package defaults — yield cannot cover its extension.
   * Transitions package to D. The caller (game engine) is responsible
   * for handling the town-hold transition on the underlying claims.
   *
   * @param {string} packageId
   * @returns {object} updated package
   */
  defaultPackage(packageId) {
    this._db.defaultPackage(packageId);
    return this._db.getPackage(packageId);
  }

  /**
   * A package closes cleanly — repaid in full.
   * The caller is responsible for disarming any expiry timers on claims.
   *
   * @param {string} packageId
   * @returns {object} updated package
   */
  closePackage(packageId) {
    this._db.closePackage(packageId);
    return this._db.getPackage(packageId);
  }

  /**
   * Delete a package record after town sale completes.
   *
   * @param {string} packageId
   */
  deletePackage(packageId) {
    this._db.deletePackage(packageId);
  }

  // Packages — reads

  /**
   * @param {string} packageId
   * @returns {object|null}
   */
  getPackage(packageId) {
    return this._db.getPackage(packageId);
  }

  /**
   * All open packages — primary market browse.
   * @returns {object[]}
   */
  getOpenPackages() {
    return this._db.getOpenPackages();
  }

  /**
   * Open packages meeting a minimum yield floor.
   * @param {number} yieldFloor
   * @returns {object[]}
   */
  getOpenPackagesAboveFloor(yieldFloor) {
    return this._db.getOpenPackagesAboveFloor(yieldFloor);
  }

  /**
   * @param {string} claimantId
   * @returns {object[]}
   */
  getPackagesByClaimant(claimantId) {
    return this._db.getPackagesByClaimant(claimantId);
  }

  /**
   * @param {string} lenderId
   * @returns {object[]}
   */
  getPackagesByLender(lenderId) {
    return this._db.getPackagesByLender(lenderId);
  }

  /**
   * @param {'O'|'F'|'D'|'C'} status
   * @returns {object[]}
   */
  getPackagesByStatus(status) {
    return this._db.getPackagesByStatus(status);
  }
}

module.exports = { Store };
