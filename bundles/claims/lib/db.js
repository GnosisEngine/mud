// bundles/claims/lib/db.js
'use strict';

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

// Module-level sql.js instance — initialised once per process.
let _SQL = null;

async function _getSQL() {
  if (!_SQL) _SQL = await initSqlJs();
  return _SQL;
}

class Db {
  /**
   * Private — use Db.create(dataDir).
   */
  constructor(dbPath, sqlInstance, buf) {
    this._dbPath = dbPath;
    this._SQL = sqlInstance;
    this.db = buf ? new sqlInstance.Database(buf) : new sqlInstance.Database();
    this._migrate();
    this._prepare();
  }

  /**
   * Async factory — replaces `new Db(dataDir)`.
   * @param {string} dataDir
   * @returns {Promise<Db>}
   */
  static async create(dataDir) {
    const SQL = await _getSQL();
    const dbPath = process.env.NODE_ENV === 'test'
      ? path.join(dataDir, 'claims-test.db')
      : path.join(dataDir, 'claims.db');
    const buf = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
    return new Db(dbPath, SQL, buf);
  }

  _migrate() {
    this.db.run(`
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
    const data = this.db.export();
    fs.writeFileSync(this._dbPath, Buffer.from(data));
    // sql.js export() closes and reopens the underlying SQLite connection to
    // produce a consistent snapshot. All prepared statements are finalised as
    // a side-effect, so we must recreate them immediately after every export.
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
    this.db.close();
  }
}

module.exports = { Db };
