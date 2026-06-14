// bundles/storage/lib/StorageDataSource.js
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * A Ranvier DataSource that reads/writes one-JSON-file-per-entity records
 * from the centralised storage data root, matching how JsonDirectoryDataSource
 * works but rooted at `data/` (or FIEF_TEST_DATA_DIR in tests) rather than
 * the repo root.
 *
 * Register in ranvier.json:
 *
 *   "dataSources": {
 *     "Storage": {
 *       "require": "./bundles/storage/lib/StorageDataSource"
 *     }
 *   },
 *   "entityLoaders": {
 *     "accounts": { "source": "Storage", "config": { "path": "accounts" } },
 *     "players":  { "source": "Storage", "config": { "path": "players"  } }
 *   }
 *
 * The DataSource is instantiated by DataSourceRegistry before any bundle
 * startup listener fires, so it cannot receive state.Storage. Instead it
 * resolves the data root from the same env var that the storage bundle's
 * server-events uses, falling back to <repoRoot>/data in production.
 */
class StorageDataSource {
  /**
   * @param {object} _config sourceConfig from ranvier.json dataSources entry (unused)
   * @param {string} rootPath Absolute path to the repo root, supplied by DataSourceRegistry
   */
  constructor(_config = {}, rootPath) {
    this._repoRoot = rootPath;
  }

  /**
   * Resolve the absolute path to the namespace directory for this entity type.
   * config.path is the namespace name: 'accounts' or 'players'.
   *
   * @param {{ path: string }} config
   * @returns {string}
   */
  _resolveDir(config) {
    const dataRoot = process.env.FIEF_TEST_DATA_DIR
      || path.join(this._repoRoot, 'data');

    return path.join(dataRoot, config.path);
  }

  /**
   * @param {{ path: string }} config
   * @returns {Promise<boolean>}
   */
  hasData(config = {}) {
    return Promise.resolve(fs.existsSync(this._resolveDir(config)));
  }

  /**
   * Fetch all entities in the namespace. Returns a map of id → data.
   *
   * @param {{ path: string }} config
   * @returns {Promise<Record<string, object>>}
   */
  fetchAll(config = {}) {
    const dir = this._resolveDir(config);

    return new Promise((resolve, reject) => {
      fs.readdir(dir, async(err, files) => {
        if (err) {
          return reject(err);
        }

        const data = {};
        for (const file of files) {
          if (path.extname(file) !== '.json') continue;
          const id = path.basename(file, '.json');
          try {
            data[id] = await this.fetch(config, id);
          } catch (fetchErr) {
            return reject(fetchErr);
          }
        }

        resolve(data);
      });
    });
  }

  /**
   * Fetch a single entity by id.
   *
   * @param {{ path: string }} config
   * @param {string} id
   * @returns {Promise<object>}
   */
  fetch(config = {}, id) {
    const filePath = path.join(this._resolveDir(config), `${id}.json`);

    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, raw) => {
        if (err) {
          return reject(new ReferenceError(`[StorageDataSource] Record [${id}] not found in ${config.path}`));
        }

        try {
          resolve(JSON.parse(raw));
        } catch (parseErr) {
          reject(new Error(`[StorageDataSource] Failed to parse ${filePath}: ${parseErr.message}`));
        }
      });
    });
  }

  /**
   * Write a single entity by id, creating the directory if needed.
   *
   * @param {{ path: string }} config
   * @param {string} id
   * @param {object} data
   * @returns {Promise<void>}
   */
  update(config = {}, id, data) {
    const dir = this._resolveDir(config);
    const filePath = path.join(dir, `${id}.json`);
    const tmp = `${filePath}.tmp`;

    return new Promise((resolve, reject) => {
      fs.mkdir(dir, { recursive: true }, mkdirErr => {
        if (mkdirErr) return reject(mkdirErr);

        const serialized = JSON.stringify(data, null, 2);

        fs.writeFile(tmp, serialized, 'utf8', writeErr => {
          if (writeErr) return reject(writeErr);

          fs.rename(tmp, filePath, renameErr => {
            if (renameErr) return reject(renameErr);
            resolve();
          });
        });
      });
    });
  }
}

module.exports = StorageDataSource;
