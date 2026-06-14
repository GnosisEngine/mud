// bundles/time/lib/time-store.js
'use strict';

const JsonStore = require('../../storage/lib/JsonStore');

/** @type {JsonStore<{tick: number}>|null} */
let _store = null;

/**
 * @param {string} filePath Absolute path to the tick JSON file.
 *   Provided by the time bundle's startup listener via state.Storage.
 */
function configure(filePath) {
  _store = new JsonStore(filePath, { tick: 0 });
}

function load() {
  if (!_store) return 0;
  const parsed = _store.load();
  if (parsed && typeof parsed.tick === 'number' && Number.isFinite(parsed.tick) && parsed.tick >= 0) {
    return parsed.tick;
  }
  return 0;
}

/**
 * @param {number} tick
 */
function save(tick) {
  if (_store) _store.save({ tick });
}

module.exports = { configure, load, save };
