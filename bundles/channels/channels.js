// bundles/channels/channels.js
'use strict';

require('./hints');
const {
  Broadcast,
  PartyAudience,
  PrivateAudience,
  RoomAudience,
  WorldAudience,
} = require('ranvier');

const ClusterAudience = require('./lib/ClusterAudience');

const { Channel } = require('ranvier').Channel;
const canSpeak = require('../moderation/lib/canSpeak');

class BlockedByCommunicationEffect extends Error { }

module.exports = [
  new Channel({
    name: 'chat',
    aliases: ['.'],
    color: ['bold', 'green'],
    description: 'Chat with everyone on the game',
    audience: new WorldAudience(),
    formatter: {
      sender: function(sender, target, message, colorify) {
        const { blocked, effect } = canSpeak(sender, 'chat');
        if (blocked) {
          Broadcast.sayAt(sender, effect.config.blockedMessage);
          throw new BlockedByCommunicationEffect();
        }
        return colorify(`🌐 You chat, '${message}'`);
      },

      target: function(sender, target, message, colorify) {
        return colorify(`🌐 ${sender.name} chats, '${message}'`);
      }
    }
  }),

  new Channel({
    name: 'say',
    color: ['yellow'],
    description: 'Send a message to all players in your room',
    audience: new RoomAudience(),
    formatter: {
      sender: function(sender, target, message, colorify) {
        const { blocked, effect } = canSpeak(sender, 'say');
        if (blocked) {
          Broadcast.sayAt(sender, effect.config.blockedMessage);
          throw new BlockedByCommunicationEffect();
        }
        return colorify(`💬 You say, '${message}'`);
      },

      target: function(sender, target, message, colorify) {
        return colorify(`💬 ${sender.name} says, '${message}'`);
      }
    }
  }),

  new Channel({
    name: 'tell',
    color: ['bold', 'cyan'],
    description: 'Send a private message to another player',
    audience: new PrivateAudience(),
    formatter: {
      sender: function(sender, target, message, colorify) {
        const { blocked, effect } = canSpeak(sender, 'tell');
        if (blocked) {
          Broadcast.sayAt(sender, effect.config.blockedMessage);
          throw new BlockedByCommunicationEffect();
        }
        return colorify(`👂 You tell ${target.name}, '${message}'`);
      },

      target: function(sender, target, message, colorify) {
        return colorify(`👂 ${sender.name} tells you, '${message}'`);
      }
    }
  }),

  new Channel({
    name: 'yell',
    color: ['bold', 'red'],
    description: 'Send a message to everyone on your road, or your area if off-road',
    audience: new ClusterAudience(),
    formatter: {
      sender: function(sender, target, message, colorify) {
        const { blocked, effect } = canSpeak(sender, 'yell');
        if (blocked) {
          Broadcast.sayAt(sender, effect.config.blockedMessage);
          throw new BlockedByCommunicationEffect();
        }
        return colorify(`🗯️  You yell, '${message}'`);
      },

      target: function(sender, target, message, colorify) {
        return colorify(`🗯️  Someone yells from nearby, '${message}'`);
      }
    }
  }),

  new Channel({
    name: 'gtell',
    color: ['bold', 'green'],
    description: 'Send a message to everyone in your group, anywhere in the game',
    audience: new PartyAudience(),
    formatter: {
      sender: function(sender, target, message, colorify) {
        const { blocked, effect } = canSpeak(sender, 'gtell');
        if (blocked) {
          Broadcast.sayAt(sender, effect.config.blockedMessage);
          throw new BlockedByCommunicationEffect();
        }
        return colorify(`👥 You tell the group, '${message}'`);
      },

      target: function(sender, target, message, colorify) {
        return colorify(`👥 ${sender.name} tells the group, '${message}'`);
      }
    }
  }),
];
