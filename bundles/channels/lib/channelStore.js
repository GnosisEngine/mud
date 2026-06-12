// bundles/channels/lib/channelStore.js
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * @typedef {object} PersistedChannel
 * @property {string} name
 * @property {string} password
 * @property {string} owner
 * @property {string[]} members
 */

const DEFAULT_PATH = path.join(
  __dirname, '..', 'data',
  process.env.NODE_ENV === 'test' ? 'dynamic-channels-test.json' : 'dynamic-channels.json'
);

let savePath = DEFAULT_PATH;

/**
 * @param {string} filePath
 */
function configure(filePath) {
  savePath = filePath;
}

/**
 * @returns {PersistedChannel[]}
 */
function load() {
  try {
    const raw = fs.readFileSync(savePath, 'utf8');
    const parsed = JSON.parse(raw);

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
      }));
  } catch (_) {
    return [];
  }
}

/**
 * @param {Array<[string, { password: string, owner: string, members: Set<string> }]>} entries
 */
function save(entries) {
  const dir = path.dirname(savePath);
  fs.mkdirSync(dir, { recursive: true });

  /** @type {Record<string, { password: string, owner: string, members: string[] }>} */
  const data = {};
  for (const [name, entry] of entries) {
    data[name] = {
      password: entry.password,
      owner: entry.owner,
      members: [...entry.members],
    };
  }

  fs.writeFileSync(savePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { configure, load, save };
