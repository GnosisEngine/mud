// bundles/storage/lib/Storage.js
'use strict';

const fs = require('fs');
const path = require('path');
const SqlStore = require('./SqlStore');
const CompactableLog = require('./CompactableLog');

/** @typedef {import('./SqlMigrator').SqlMigration} SqlMigration */
/** @typedef {import('./CompactableLog').CompactableLogOptions} CompactableLogOptions */

/**
 * Central facade for namespaced persistence. Bundles never touch fs/sql.js
 * directly — they ask Storage for a database or log scoped to their
 * namespace, and Storage owns where it lives on disk.
 *
 * Path/environment policy (prod vs test data root) is decided by the
 * storage bundle's server-events, not here — configure() just takes the
 * resolved root.
 */
class Storage {
  constructor() {
    /** @type {string|null} */
    this._dataRoot = null;
    this._isTestRoot = false;

    /** @type {Map<string, SqlStore>} */
    this._dbs = new Map();

    /** @type {Map<string, CompactableLog>} */
    this._logs = new Map();
  }

  /**
   * @param {object} opts
   * @param {string} opts.dataRoot Absolute path to the root directory all namespaces live under
   * @param {boolean} [opts.isTestRoot] If true, cleanup() will delete dataRoot entirely
   */
  configure({ dataRoot, isTestRoot = false }) {
    this._dataRoot = path.resolve(dataRoot);
    this._isTestRoot = isTestRoot;
  }

  /**
   * @returns {string}
   */
  getDataRoot() {
    if (!this._dataRoot) {
      throw new Error('Storage.configure() must be called before use');
    }
    return this._dataRoot;
  }

  /**
   * @param {string} namespace
   * @returns {string} absolute path to the namespace's directory
   */
  namespaceDir(namespace) {
    return path.join(this.getDataRoot(), namespace);
  }

  /**
   * Get (creating if necessary) the sql.js database for a namespace.
   * Subsequent calls for the same namespace return the same instance.
   *
   * @param {string} namespace
   * @param {SqlMigration[]} [migrations]
   * @returns {Promise<SqlStore>}
   */
  async getDatabase(namespace, migrations = []) {
    const existing = this._dbs.get(namespace);
    if (existing) {
      return existing;
    }

    const dbPath = path.join(this.namespaceDir(namespace), `${namespace}.db`);
    const store = await SqlStore.create(dbPath, migrations);
    this._dbs.set(namespace, store);
    return store;
  }

  /**
   * Get (creating if necessary) the compactable log for a namespace.
   * Subsequent calls for the same namespace return the same instance.
   *
   * @param {string} namespace
   * @param {CompactableLogOptions} [options]
   * @returns {CompactableLog}
   */
  getLog(namespace, options = {}) {
    const existing = this._logs.get(namespace);
    if (existing) {
      return existing;
    }

    const log = new CompactableLog(this.namespaceDir(namespace), options);
    this._logs.set(namespace, log);
    return log;
  }

  /**
   * Flush and close every open log/database. Call on shutdown.
   */
  shutdownAll() {
    for (const log of this._logs.values()) {
      log.flushBestEffort();
    }
    for (const db of this._dbs.values()) {
      db.save();
      db.close();
    }
  }

  /**
   * shutdownAll() may already have run (e.g. via the 'shutdown' server
   * event) by the time a test calls this — closing an already-closed
   * sql.js database throws, so close() is best-effort here. Saving is
   * skipped entirely since, for a test root, the directory is about to be
   * deleted anyway.
   *
   * Then — if this was a test mkdtemp root — delete the entire data root.
   * Safe to call multiple times.
   */
  cleanup() {
    for (const log of this._logs.values()) {
      log.flushBestEffort();
    }

    for (const db of this._dbs.values()) {
      try {
        db.close();
      } catch (_) {
        // already closed by shutdownAll()
      }
    }

    this._logs.clear();
    this._dbs.clear();

    if (this._isTestRoot && this._dataRoot) {
      fs.rmSync(this._dataRoot, { recursive: true, force: true });
    }

    this._dataRoot = null;
    this._isTestRoot = false;
  }
}

const storage = new Storage();
storage.Storage = Storage;

module.exports = storage;
