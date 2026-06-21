// bundles/channels/lib/DynamicChannelRegistry.js
'use strict';

const channelStore = require('./channelStore');

/**
 * @typedef {object} DynamicChannelEntry
 * @property {string} password
 * @property {string} owner
 * @property {Set<string>} members
 * @property {boolean} persistent
 */

/**
 * @typedef {import('./channelStore').PersistedChannel} PersistedChannel
 */

class DynamicChannelRegistry {
  constructor() {
    /** @type {Map<string, DynamicChannelEntry>} */
    this.channels = new Map();
  }

  /**
   * Repopulate the registry from previously persisted entries. Does not
   * itself trigger a save. Used at startup before any channels are rebuilt.
   *
   * @param {PersistedChannel[]} entries
   */
  restore(entries) {
    for (const { name, password, owner, members, persistent } of entries) {
      this.channels.set(name, {
        password,
        owner,
        members: new Set(members),
        persistent: !!persistent,
      });
    }
  }

  /**
   * Write the current registry state to disk.
   */
  persist() {
    channelStore.save(this.list());
  }

  /**
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.channels.has(name);
  }

  /**
   * @param {string} name
   * @returns {DynamicChannelEntry|undefined}
   */
  get(name) {
    return this.channels.get(name);
  }

  /**
   * @param {string} name
   * @param {string} password
   * @param {string} ownerName
   * @param {boolean} [persistent]
   * @returns {DynamicChannelEntry}
   */
  create(name, password, ownerName, persistent = false) {
    const entry = {
      password,
      owner: ownerName,
      members: new Set([ownerName]),
      persistent: !!persistent,
    };
    this.channels.set(name, entry);
    this.persist();
    return entry;
  }

  /**
   * @param {string} name
   * @param {string} password
   * @param {string} playerName
   * @returns {'OK'|'NOT_FOUND'|'BAD_PASSWORD'}
   */
  join(name, password, playerName) {
    const entry = this.channels.get(name);
    if (!entry) {
      return 'NOT_FOUND';
    }
    if (entry.password !== password) {
      return 'BAD_PASSWORD';
    }
    entry.members.add(playerName);
    this.persist();
    return 'OK';
  }

  /**
   * Add a member directly, bypassing the password check. Used by admins to
   * invite a player into a channel.
   *
   * @param {string} name
   * @param {string} playerName
   * @returns {boolean}
   */
  invite(name, playerName) {
    const entry = this.channels.get(name);
    if (!entry) {
      return false;
    }
    entry.members.add(playerName);
    this.persist();
    return true;
  }

  /**
   * @param {string} name
   * @param {string} playerName
   * @returns {boolean}
   */
  leave(name, playerName) {
    const entry = this.channels.get(name);
    if (!entry) {
      return false;
    }
    const removed = entry.members.delete(playerName);
    if (removed) {
      this.persist();
    }
    return removed;
  }

  /**
   * @param {string} name
   * @param {string} playerName
   * @returns {boolean}
   */
  isMember(name, playerName) {
    const entry = this.channels.get(name);
    return !!(entry && entry.members.has(playerName));
  }

  /**
   * @param {string} name
   * @returns {boolean}
   */
  isPersistent(name) {
    const entry = this.channels.get(name);
    return !!(entry && entry.persistent);
  }

  /**
   * @returns {Array<[string, DynamicChannelEntry]>}
   */
  list() {
    return [...this.channels.entries()];
  }
}

module.exports = DynamicChannelRegistry;
