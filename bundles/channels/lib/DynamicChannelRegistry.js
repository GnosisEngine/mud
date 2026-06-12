// bundles/channels/lib/DynamicChannelRegistry.js
'use strict';

/**
 * @typedef {object} DynamicChannelEntry
 * @property {string} password
 * @property {string} owner
 * @property {Set<string>} members
 */

class DynamicChannelRegistry {
  constructor() {
    /** @type {Map<string, DynamicChannelEntry>} */
    this.channels = new Map();
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
   * @returns {DynamicChannelEntry}
   */
  create(name, password, ownerName) {
    const entry = {
      password,
      owner: ownerName,
      members: new Set([ownerName]),
    };
    this.channels.set(name, entry);
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
    return entry.members.delete(playerName);
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
   * @returns {Array<[string, DynamicChannelEntry]>}
   */
  list() {
    return [...this.channels.entries()];
  }
}

module.exports = DynamicChannelRegistry;
