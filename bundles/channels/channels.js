// bundles/channels/channels.js
'use strict';

/** @typedef {import('types').RanvierPlayer} RanvierPlayer */
/** @typedef {import('types').RanvierEffect} RanvierEffect */

/**
 * @typedef {object} CanSpeakResult
 * @property {boolean}             blocked
 * @property {RanvierEffect|null}  effect
 */

/**
 * @callback ChannelFormatter
 * @param {RanvierPlayer}             sender
 * @param {RanvierPlayer}             target
 * @param {string}                    message
 * @param {function(string): string}  colorify
 * @returns {string}
 */

require('./hints');
const {
  Broadcast,
  PartyAudience,
  PrivateAudience,
  RoomAudience,
  WorldAudience,
} = require('ranvier');

const { Channel } = require('ranvier').Channel;
const ClusterAudience = require('./lib/ClusterAudience');
const canSpeak = require('../moderation/lib/canSpeak');

class BlockedByCommunicationEffect extends Error {}

module.exports = [
  new Channel({
    name: 'chat',
    aliases: ['.'],
    color: ['bold', 'green'],
    description: 'Chat with everyone on the game',
    audience: new WorldAudience(),
    formatter: {
      /** @type {ChannelFormatter} */
      sender(sender, target, message, colorify) {
        const /** @type {CanSpeakResult} */ { blocked, effect } = canSpeak(sender, 'chat');
        if (blocked) {
          Broadcast.sayAt(sender, effect?.config.blockedMessage);
          throw new BlockedByCommunicationEffect();
        }
        return colorify(`🌐 You chat, '${message}'`);
      },
      /** @type {ChannelFormatter} */
      target(sender, target, message, colorify) {
        return colorify(`🌐 ${sender.name} chats, '${message}'`);
      },
    },
  }),

  new Channel({
    name: 'say',
    color: ['yellow'],
    description: 'Send a message to all players in your room',
    audience: new RoomAudience(),
    formatter: {
      /** @type {ChannelFormatter} */
      sender(sender, target, message, colorify) {
        const /** @type {CanSpeakResult} */ { blocked, effect } = canSpeak(sender, 'say');
        if (blocked) {
          Broadcast.sayAt(sender, effect?.config.blockedMessage);
          throw new BlockedByCommunicationEffect();
        }
        return colorify(`💬 You say, '${message}'`);
      },
      /** @type {ChannelFormatter} */
      target(sender, target, message, colorify) {
        return colorify(`💬 ${sender.name} says, '${message}'`);
      },
    },
  }),

  new Channel({
    name: 'tell',
    color: ['bold', 'cyan'],
    description: 'Send a private message to another player',
    audience: new PrivateAudience(),
    formatter: {
      /** @type {ChannelFormatter} */
      sender(sender, target, message, colorify) {
        const /** @type {CanSpeakResult} */ { blocked, effect } = canSpeak(sender, 'tell');
        if (blocked) {
          Broadcast.sayAt(sender, effect?.config.blockedMessage);
          throw new BlockedByCommunicationEffect();
        }
        return colorify(`👂 You tell ${target.name}, '${message}'`);
      },
      /** @type {ChannelFormatter} */
      target(sender, target, message, colorify) {
        return colorify(`👂 ${sender.name} tells you, '${message}'`);
      },
    },
  }),

  new Channel({
    name: 'yell',
    color: ['bold', 'red'],
    description: 'Send a message to everyone on your road, or your area if off-road',
    audience: new ClusterAudience(),
    formatter: {
      /** @type {ChannelFormatter} */
      sender(sender, target, message, colorify) {
        const /** @type {CanSpeakResult} */ { blocked, effect } = canSpeak(sender, 'yell');
        if (blocked) {
          Broadcast.sayAt(sender, effect?.config.blockedMessage);
          throw new BlockedByCommunicationEffect();
        }
        return colorify(`🗯️  You yell, '${message}'`);
      },
      /** @type {ChannelFormatter} */
      target(sender, target, message, colorify) {
        return colorify(`🗯️  Someone yells from nearby, '${message}'`);
      },
    },
  }),

  new Channel({
    name: 'gtell',
    color: ['bold', 'green'],
    description: 'Send a message to everyone in your group, anywhere in the game',
    audience: new PartyAudience(),
    formatter: {
      /** @type {ChannelFormatter} */
      sender(sender, target, message, colorify) {
        const /** @type {CanSpeakResult} */ { blocked, effect } = canSpeak(sender, 'gtell');
        if (blocked) {
          Broadcast.sayAt(sender, effect?.config.blockedMessage);
          throw new BlockedByCommunicationEffect();
        }
        return colorify(`👥 You tell the group, '${message}'`);
      },
      /** @type {ChannelFormatter} */
      target(sender, target, message, colorify) {
        return colorify(`👥 ${sender.name} tells the group, '${message}'`);
      },
    },
  }),
];
