// bundles/storage/lib/SqlStore.js
'use strict';

/** @typedef {import('./SqlMigrator').SqlMigration} SqlMigration */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { applyMigrations } = require('./SqlMigrator');

let _SQL = null;

async function _getSQL() {
  if (!_SQL) {
    _SQL = await initSqlJs();
  }
  return _SQL;
}

/**
 * A namespaced sql.js database. Loads its file from disk if present,
 * applies the given migrations, and can export itself back to disk.
 *
 * This class is intentionally thin — it knows how to load, migrate, save,
 * and close a database, but nothing about the tables/queries a particular
 * store needs. Bundles wrap the `db` handle with their own prepared
 * statements and domain methods.
 */
class SqlStore {
  /**
   * Private — use SqlStore.create(dbPath, migrations).
   *
   * @param {string} dbPath
   * @param {import('sql.js')} sqlInstance
   * @param {import('sql.js').Database} db
   */
  constructor(dbPath, sqlInstance, db) {
    this._dbPath = dbPath;
    this._SQL = sqlInstance;
    this.db = db;
  }

  /**
   * @param {string} dbPath Absolute path to the .db file
   * @param {SqlMigration[]} [migrations]
   * @returns {Promise<SqlStore>}
   */
  static async create(dbPath, migrations = []) {
    const SQL = await _getSQL();
    const buf = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
    const db = buf ? new SQL.Database(buf) : new SQL.Database();

    applyMigrations(db, migrations);

    return new SqlStore(dbPath, SQL, db);
  }

  /**
   * Export the database and write it to disk. sql.js's export() finalizes
   * and reopens the underlying connection, invalidating any prepared
   * statements — callers that hold prepared statements must recreate them
   * after calling save().
   */
  save() {
    const data = this.db.export();
    fs.mkdirSync(path.dirname(this._dbPath), { recursive: true });
    fs.writeFileSync(this._dbPath, Buffer.from(data));
  }

  close() {
    this.db.close();
  }
}

module.exports = SqlStore;
