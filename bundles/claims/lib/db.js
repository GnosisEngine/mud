// bundles/claims/lib/db.js
'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('../../storage/lib/SqlStore')} SqlStore */

const { CLAIMS_DB_MIGRATIONS } = require('./migrations');

class Db {
  /**
   * Private — use Db.create(state).
   *
   * @param {SqlStore} sqlStore
   */
  constructor(sqlStore) {
    this._sqlStore = sqlStore;
    this.db = sqlStore.db;
    this._prepare();
  }

  /**
   * @param {GameState} state
   * @returns {Promise<Db>}
   */
  static async create(state) {
    const sqlStore = await state.Storage.getDatabase('claims', CLAIMS_DB_MIGRATIONS);
    return new Db(sqlStore);
  }

  _prepare() {
    this._stmts = {
      insert: this.db.prepare(`
        INSERT INTO packages (id, name, claimantId, attachedRoomIds, requestedAmount,
                              durationDays, yieldFloor, status, lenderId)
        VALUES (@id, @name, @claimantId, @attachedRoomIds, @requestedAmount,
                @durationDays, @yieldFloor, @status, @lenderId)
      `),
      updateStatus: this.db.prepare('UPDATE packages SET status = @status WHERE id = @id'),
      fund: this.db.prepare('UPDATE packages SET status = \'F\', lenderId = @lenderId WHERE id = @id'),
      getById: this.db.prepare('SELECT * FROM packages WHERE id = @id'),
      getByStatus: this.db.prepare('SELECT * FROM packages WHERE status = @status'),
      getByClaimant: this.db.prepare('SELECT * FROM packages WHERE claimantId = @claimantId'),
      getByLender: this.db.prepare('SELECT * FROM packages WHERE lenderId = @lenderId'),
      getOpen: this.db.prepare('SELECT * FROM packages WHERE status = \'O\' ORDER BY requestedAmount ASC'),
      getOpenAboveFloor: this.db.prepare('SELECT * FROM packages WHERE status = \'O\' AND yieldFloor >= @yieldFloor ORDER BY yieldFloor DESC'),
      delete: this.db.prepare('DELETE FROM packages WHERE id = @id'),
    };
  }

  _run(stmt, params) {
    stmt.run(params);
    this._persist();
  }

  _get(stmt, params) {
    const row = stmt.getAsObject(params);
    // sql.js returns {} for no rows in some versions, and an object with all
    // columns set to undefined/null in others. Treat both as "not found".
    if (!row || Object.keys(row).length === 0 || row.id === undefined || row.id === null) {
      return null;
    }
    return row;
  }

  _all(stmt, params) {
    if (params) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.reset();
    return rows;
  }

  _persist() {
    this._sqlStore.save();
    // sql.js export() (inside save()) closes and reopens the underlying
    // SQLite connection to produce a consistent snapshot. All prepared
    // statements are finalised as a side-effect, so we must recreate them
    // immediately after every export.
    this._prepare();
  }

  _serialize(pkg) {
    return {
      '@id':              pkg.id,
      '@name':            pkg.name,
      '@claimantId':      pkg.claimantId,
      '@attachedRoomIds': pkg.attachedRoomIds.join(','),
      '@requestedAmount': pkg.requestedAmount,
      '@durationDays':    pkg.durationDays,
      '@yieldFloor':      pkg.yieldFloor,
      '@status':          pkg.status,
      '@lenderId':        pkg.lenderId ?? null,
    };
  }

  _deserialize(row) {
    if (!row) return null;
    const ids = row.attachedRoomIds;
    return {
      ...row,
      attachedRoomIds: ids ? ids.split(',').filter(Boolean) : [],
    };
  }

  listPackage(pkg) {
    this._run(this._stmts.insert, this._serialize({
      ...pkg,
      status: pkg.status ?? 'O',
      lenderId: pkg.lenderId ?? null,
    }));
  }

  fundPackage(id, lenderId) {
    this._run(this._stmts.fund, { '@id': id, '@lenderId': lenderId });
  }

  defaultPackage(id) {
    this._run(this._stmts.updateStatus, { '@id': id, '@status': 'D' });
  }

  closePackage(id) {
    this._run(this._stmts.updateStatus, { '@id': id, '@status': 'C' });
  }

  deletePackage(id) {
    this._run(this._stmts.delete, { '@id': id });
  }

  getPackage(id) {
    return this._deserialize(this._get(this._stmts.getById, { '@id': id }));
  }

  getPackagesByStatus(status) {
    return this._all(this._stmts.getByStatus, { '@status': status })
      .map(r => this._deserialize(r));
  }

  getPackagesByClaimant(claimantId) {
    return this._all(this._stmts.getByClaimant, { '@claimantId': claimantId })
      .map(r => this._deserialize(r));
  }

  getPackagesByLender(lenderId) {
    return this._all(this._stmts.getByLender, { '@lenderId': lenderId })
      .map(r => this._deserialize(r));
  }

  getOpenPackages() {
    return this._all(this._stmts.getOpen, null).map(r => this._deserialize(r));
  }

  getOpenPackagesAboveFloor(yieldFloor) {
    return this._all(this._stmts.getOpenAboveFloor, { '@yieldFloor': yieldFloor })
      .map(r => this._deserialize(r));
  }

  close() {
    for (const stmt of Object.values(this._stmts)) stmt.free();
    this._sqlStore.close();
  }
}

module.exports = { Db };
