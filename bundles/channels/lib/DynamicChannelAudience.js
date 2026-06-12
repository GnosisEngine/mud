// bundles/channels/lib/DynamicChannelAudience.js
'use strict';

/** @typedef {import('types').RanvierCharacter} RanvierCharacter */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */
/** @typedef {import('./DynamicChannelRegistry')} DynamicChannelRegistry */

const { ChannelAudience } = require('ranvier');

/**
 * Audience class representing the online members of a single dynamic
 * (player-created, password-protected) channel.
 *
 * @extends ChannelAudience
 */
class DynamicChannelAudience extends ChannelAudience {
  /**
   * @param {DynamicChannelRegistry} registry
   * @param {string} channelName
   */
  constructor(registry, channelName) {
    super();
    this.registry = registry;
    this.channelName = channelName;
  }

  /**
   * @returns {RanvierPlayer[]}
   */
  getBroadcastTargets() {
    const entry = this.registry.get(this.channelName);
    if (!entry) {
      return [];
    }

    return this.state.PlayerManager.getPlayersAsArray()
      .filter(player => entry.members.has(player.name));
  }
}

module.exports = DynamicChannelAudience;
