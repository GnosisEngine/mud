// bundles/channels/lib/channelStore.js
'use strict';

const JsonStore = require('../../storage/lib/JsonStore');

/**
 * @typedef {object} PersistedChannel
 * @property {string} name
 * @property {string} password
 * @property {string} owner
 * @property {string[]} members
 * @property {boolean} persistent
 */

/** @type {JsonStore<Record<string, {password: string, owner: string, members: string[], persistent?: boolean}>>|null} */
let _store = null;

/**
 * @param {string} filePath Absolute path to the channels JSON file.
 *   Provided by the channels bundle's startup listener via state.Storage.
 */
function configure(filePath) {
  _store = new JsonStore(filePath, {});
}

/**
 * @returns {PersistedChannel[]}
 */
function load() {
  if (!_store) return [];

  const parsed = _store.load();

  if (!parsed || typeof parsed !== 'object') {
    return [];
  }

  return Object.entries(parsed)
    .filter(([, entry]) => entry && typeof entry.password === 'string' && typeof entry.owner === 'string')
    .map(([name, entry]) => ({
      name,
      password: entry.password,
      owner: entry.owner,
      members: Array.isArray(entry.members) ? entry.members.filter(m => typeof m === 'string') : [],
      // Channels persisted before this field existed deserialize as ephemeral —
      // no behavior change for pre-existing channels.
      persistent: !!entry.persistent,
    }));
}

/**
 * @param {Array<[string, { password: string, owner: string, members: Set<string>, persistent: boolean }]>} entries
 */
function save(entries) {
  if (!_store) return;

  /** @type {Record<string, { password: string, owner: string, members: string[], persistent: boolean }>} */
  const data = {};
  for (const [name, entry] of entries) {
    data[name] = {
      password: entry.password,
      owner: entry.owner,
      members: [...entry.members],
      persistent: !!entry.persistent,
    };
  }

  _store.save(data);
}

module.exports = { configure, load, save };
