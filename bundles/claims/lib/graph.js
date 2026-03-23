// bundles/ranvier-storage/lib/graph.js
'use strict';

/**
 * The in-memory claims graph. Pure state — no I/O, no encoding, no logging.
 * Every mutation method corresponds directly to an opcode from the codec.
 *
 * Shape:
 *   graph.claims  { [claimId]: { id, roomId, ownerId, claimedAt,
 *                                taxRate, taxRateLocked, autoRenewEnabled,
 *                                extensionExpiry, expiresAt } }
 *
 * claimState is DERIVED — never stored, always computed:
 *   expiresAt !== null  →  'E' (expiring)
 *   expiresAt === null  →  'A' (active)
 *
 * Package concerns (pledged, town-held, defaulted) are SQLite's domain.
 * This graph has no knowledge of packages.
 */

class Graph {
  constructor() {
    // Object.create(null) — no prototype chain, safe for arbitrary ID keys
    this.claims = Object.create(null);
  }

  // ---------------------------------------------------------------------------
  // Mutations — one method per opcode
  // ---------------------------------------------------------------------------

  /**
   * C — create a new claim.
   * @param {object} data
   */
  applyClaim({ id, roomId, ownerId, claimedAt, taxRate, taxRateLocked, autoRenewEnabled }) {
    this.claims[id] = {
      id,
      roomId,
      ownerId,
      claimedAt,
      taxRate,
      taxRateLocked,
      autoRenewEnabled,
      extensionExpiry: null,
      expiresAt:       null,
    };
  }

  /**
   * T — transfer a single claim to a new owner.
   * @param {object} data
   */
  transferClaim({ id, ownerId }) {
    const claim = this.claims[id];
    if (claim) claim.ownerId = ownerId;
  }

  /**
   * X — remove a claim entirely.
   * @param {object} data
   */
  expireClaim({ id }) {
    delete this.claims[id];
  }

  /**
   * O — arm or disarm the logout expiry timer on a claim.
   * expiresAt === null disarms (claimState → A).
   * expiresAt set     arms   (claimState → E).
   * @param {object} data
   */
  setClaimExpiry({ id, expiresAt }) {
    const claim = this.claims[id];
    if (claim) claim.expiresAt = expiresAt;
  }

  /**
   * E — record a paid extension, updating the extensionExpiry window.
   * @param {object} data
   */
  extendClaim({ id, extensionExpiry }) {
    const claim = this.claims[id];
    if (claim) claim.extensionExpiry = extensionExpiry;
  }

  /**
   * R — lock the tax rate on a claim when a package is funded.
   * Once locked the rate cannot change for the duration of the pledge.
   * @param {object} data
   */
  lockClaimTaxRate({ id }) {
    const claim = this.claims[id];
    if (claim) claim.taxRateLocked = true;
  }

  /**
   * S — upsert a full claim snapshot during replay.
   * Structurally identical to applyClaim but carries all nullable fields.
   * @param {object} data
   */
  applySnapshot({ id, roomId, ownerId, claimedAt, taxRate, taxRateLocked,
                  autoRenewEnabled, extensionExpiry, expiresAt }) {
    this.claims[id] = {
      id,
      roomId,
      ownerId,
      claimedAt,
      taxRate,
      taxRateLocked,
      autoRenewEnabled,
      extensionExpiry,
      expiresAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  /**
   * Derive claimState from stored fields.
   * Package states (P, W) are not represented here — query SQLite for those.
   * @param {object} claim
   * @returns {'A'|'E'}
   */
  claimState(claim) {
    return claim.expiresAt !== null ? 'E' : 'A';
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /**
   * All claims owned by a player.
   * @param {string} ownerId
   * @returns {object[]}
   */
  getClaimsByOwner(ownerId) {
    return Object.values(this.claims).filter(c => c.ownerId === ownerId);
  }

  /**
   * The claim on a specific room, if any.
   * @param {string} roomId
   * @returns {object|null}
   */
  getClaimByRoom(roomId) {
    return Object.values(this.claims).find(c => c.roomId === roomId) ?? null;
  }

  /**
   * Claim by ID.
   * @param {string} id
   * @returns {object|null}
   */
  getClaim(id) {
    return this.claims[id] ?? null;
  }

  /**
   * All claims whose expiresAt has passed.
   * Called by the store on a periodic timer to flush timed-out claims.
   * @returns {object[]}
   */
  getExpiredClaims() {
    const now = Date.now();
    return Object.values(this.claims).filter(c => c.expiresAt !== null && c.expiresAt <= now);
  }

  /**
   * All live claims — full collection snapshot used by compaction.
   * @returns {object[]}
   */
  getAllClaims() {
    return Object.values(this.claims);
  }
}

module.exports = { Graph };