// bundles/channels/lib/buildDynamicChannel.js
'use strict';

/** @typedef {import('./DynamicChannelRegistry')} DynamicChannelRegistry */
/** @typedef {import('./messageStore')} MessageStore */

const { Broadcast } = require('ranvier');
const { Channel } = require('ranvier').Channel;
const canSpeak = require('../../moderation/lib/canSpeak');
const DynamicChannelAudience = require('./DynamicChannelAudience');

class BlockedByChannelRestriction extends Error {}

/**
 * @param {DynamicChannelRegistry} registry
 * @param {string} name
 * @param {string} ownerName
 * @param {MessageStore} [messageStore] Required if the channel may be persistent;
 *   omit only in contexts (e.g. unit tests) that never mark a channel persistent.
 * @returns {Channel}
 */
function buildDynamicChannel(registry, name, ownerName, messageStore) {
  return new Channel({
    name,
    description: `Private channel created by ${ownerName}. Join with 'channel join ${name} <password>'.`,
    color: ['magenta'],
    audience: new DynamicChannelAudience(registry, name),
    formatter: {
      sender(sender, target, message, colorify) {
        const { blocked, effect } = canSpeak(sender, name);
        if (blocked) {
          Broadcast.sayAt(sender, effect?.config.blockedMessage);
          throw new BlockedByChannelRestriction();
        }

        if (!registry.isMember(name, sender.name)) {
          Broadcast.sayAt(sender, `You haven't joined '${name}'. Use 'channel join ${name} <password>'.`);
          throw new BlockedByChannelRestriction();
        }

        if (messageStore && registry.isPersistent(name)) {
          messageStore.append(name, sender.name, message);
        }

        return colorify(`📡 [${name}] You: ${message}`);
      },
      target(sender, target, message, colorify) {
        return colorify(`📡 [${name}] ${sender.name}: ${message}`);
      },
    },
  });
}

module.exports = { buildDynamicChannel, BlockedByChannelRestriction };
