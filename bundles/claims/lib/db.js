// bundles/ranvier-storage/lib/db.js
'use strict';

const path    = require('path');
const Database = require('better-sqlite3');

/**
 * SQLite package store. Packages (collateral) live entirely here.
 * Claims have no representation in this file.
 *
 * All writes are synchronous — better-sqlite3 blocks the event loop,
 * and Node.js is single-threaded, so concurrent write collisions are
 * physically impossible.
 *
 * WAL mode is enabled so reads never block on writes.
 *
 * Package shape:
 *   id                       nanoid l_ prefix
 *   name                     display name chosen by claimant
 *   claimantId               player who listed the package
 *   attachedRoomIds          comma-separated claim IDs (stored), array (exposed)
 *   requestedAmount          integer — currency amount sought
 *   durationDays             integer — fixed at listing time
 *   yieldFloor               integer — minimum yield the claimant guarantees
 *   status                   O open | F funded | D defaulted | C closed
 *   lenderId                 null until funded
 *
 * status enum:
 *   O  open       — listed, awaiting a lender
 *   F  funded     — lender committed, yield flowing
 *   D  defaulted  — yield could not cover extension, town takes rooms
 *   C  closed     — repaid cleanly, all parties settled
 */

class Db {
  /**
   * @param {string} dataDir — absolute path to the bundle's data directory
   */
  constructor(dataDir) {
    const dbPath = path.join(dataDir, 'packages.db');
    this.db = new Database(dbPath);

    // WAL mode — reads and writes proceed concurrently
    this.db.pragma('journal_mode = WAL');

    // Enforce foreign key constraints
    this.db.pragma('foreign_keys = ON');

    this._migrate();
    this._prepare();
  }

  // ---------------------------------------------------------------------------
  // Schema
  // ---------------------------------------------------------------------------

  _migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS packages (
        id                TEXT PRIMARY KEY,
        name              TEXT NOT NULL,
        claimantId        TEXT NOT NULL,
        attachedRoomIds   TEXT NOT NULL,
        requestedAmount   INTEGER NOT NULL,
        durationDays      INTEGER NOT NULL,
        yieldFloor        INTEGER NOT NULL,
        status            TEXT NOT NULL DEFAULT 'O',
        lenderId          TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_packages_claimantId ON packages (claimantId);
      CREATE INDEX IF NOT EXISTS idx_packages_lenderId   ON packages (lenderId);
      CREATE INDEX IF NOT EXISTS idx_packages_status     ON packages (status);
    `);
  }

  // ---------------------------------------------------------------------------
  // Prepared statements — compiled once, reused on every call
  // ---------------------------------------------------------------------------

  _prepare() {
    this._stmts = {
      insert: this.db.prepare(`
        INSERT INTO packages (id, name, claimantId, attachedRoomIds, requestedAmount,
                              durationDays, yieldFloor, status, lenderId)
        VALUES (@id, @name, @claimantId, @attachedRoomIds, @requestedAmount,
                @durationDays, @yieldFloor, @status, @lenderId)
      `),

      updateStatus: this.db.prepare(`
        UPDATE packages SET status = @status WHERE id = @id
      `),

      fund: this.db.prepare(`
        UPDATE packages SET status = 'F', lenderId = @lenderId WHERE id = @id
      `),

      getById: this.db.prepare(`
        SELECT * FROM packages WHERE id = ?
      `),

      getByStatus: this.db.prepare(`
        SELECT * FROM packages WHERE status = ?
      `),

      getByClaimant: this.db.prepare(`
        SELECT * FROM packages WHERE claimantId = ?
      `),

      getByLender: this.db.prepare(`
        SELECT * FROM packages WHERE lenderId = ?
      `),

      getOpen: this.db.prepare(`
        SELECT * FROM packages
        WHERE status = 'O'
        ORDER BY requestedAmount ASC
      `),

      getOpenAboveFloor: this.db.prepare(`
        SELECT * FROM packages
        WHERE status = 'O' AND yieldFloor >= @yieldFloor
        ORDER BY yieldFloor DESC
      `),

      delete: this.db.prepare(`
        DELETE FROM packages WHERE id = ?
      `),
    };
  }

  // ---------------------------------------------------------------------------
  // Serialize / deserialize attachedRoomIds
  // ---------------------------------------------------------------------------

  _serialize(pkg) {
    return {
      ...pkg,
      attachedRoomIds: pkg.attachedRoomIds.join(','),
      lenderId: pkg.lenderId ?? null,
    };
  }

  _deserialize(row) {
    if (!row) return null;
    return {
      ...row,
      attachedRoomIds: row.attachedRoomIds.split(','),
    };
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  /**
   * List a new package.
   * @param {object} pkg — full package object, attachedRoomIds as array
   */
  listPackage(pkg) {
    this._stmts.insert.run(this._serialize({
      ...pkg,
      status:   pkg.status   ?? 'O',
      lenderId: pkg.lenderId ?? null,
    }));
  }

  /**
   * Mark a package as funded and record the lender.
   * @param {string} id
   * @param {string} lenderId
   */
  fundPackage(id, lenderId) {
    this._stmts.fund.run({ id, lenderId });
  }

  /**
   * Transition a package to defaulted.
   * @param {string} id
   */
  defaultPackage(id) {
    this._stmts.updateStatus.run({ id, status: 'D' });
  }

  /**
   * Close a package cleanly (repaid).
   * @param {string} id
   */
  closePackage(id) {
    this._stmts.updateStatus.run({ id, status: 'C' });
  }

  /**
   * Delete a package record entirely.
   * Used when a town-purchased room clears its package history.
   * @param {string} id
   */
  deletePackage(id) {
    this._stmts.delete.run(id);
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  /**
   * @param {string} id
   * @returns {object|null}
   */
  getPackage(id) {
    return this._deserialize(this._stmts.getById.get(id));
  }

  /**
   * All packages with a given status.
   * @param {'O'|'F'|'D'|'C'} status
   * @returns {object[]}
   */
  getPackagesByStatus(status) {
    return this._stmts.getByStatus.all(status).map(r => this._deserialize(r));
  }

  /**
   * All packages listed by a claimant, any status.
   * @param {string} claimantId
   * @returns {object[]}
   */
  getPackagesByClaimant(claimantId) {
    return this._stmts.getByClaimant.all(claimantId).map(r => this._deserialize(r));
  }

  /**
   * All packages funded by a lender, any status.
   * @param {string} lenderId
   * @returns {object[]}
   */
  getPackagesByLender(lenderId) {
    return this._stmts.getByLender.all(lenderId).map(r => this._deserialize(r));
  }

  /**
   * All open packages, ordered by requestedAmount ascending.
   * Primary market browsing query.
   * @returns {object[]}
   */
  getOpenPackages() {
    return this._stmts.getOpen.all().map(r => this._deserialize(r));
  }

  /**
   * Open packages whose yieldFloor meets or exceeds a minimum.
   * Lenders filtering for yield quality.
   * @param {number} yieldFloor
   * @returns {object[]}
   */
  getOpenPackagesAboveFloor(yieldFloor) {
    return this._stmts.getOpenAboveFloor.all({ yieldFloor }).map(r => this._deserialize(r));
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Close the database connection cleanly.
   * Called by the bundle on shutdown.
   */
  close() {
    this.db.close();
  }
}

module.exports = { Db };