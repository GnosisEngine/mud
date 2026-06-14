// bundles/storage/lib/JsonStore.js
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * A simple namespaced JSON key-value store backed by a single file.
 *
 * Used for small, fully-replaced documents that don't benefit from a log or
 * a relational database — e.g. a single tick counter, a channel registry.
 *
 * The file is written atomically (write to a temp file, then rename) so a
 * crash mid-write cannot corrupt the previous save.
 *
 * @template T
 */
class JsonStore {
  /**
   * @param {string} filePath Absolute path to the JSON file
   * @param {T} [defaultValue] Returned by load() if the file is absent or corrupt
   */
  constructor(filePath, defaultValue = /** @type {T} */ (null)) {
    this._filePath = filePath;
    this._default = defaultValue;
  }

  /**
   * @returns {T}
   */
  load() {
    try {
      const raw = fs.readFileSync(this._filePath, 'utf8');
      return JSON.parse(raw);
    } catch (_) {
      return this._default;
    }
  }

  /**
   * Write atomically: temp file → rename.
   * @param {T} data
   */
  save(data) {
    const dir = path.dirname(this._filePath);
    fs.mkdirSync(dir, { recursive: true });

    const tmp = `${this._filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, this._filePath);
  }
}

module.exports = JsonStore;
