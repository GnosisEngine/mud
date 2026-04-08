// bundles/communication/effects/censored.js
'use strict';

const { Broadcast } = require('ranvier');

module.exports = {
  config: {
    name: 'Censored',
    type: 'censored',
    description: 'You have been silenced by an administrator.',
    blockedChannels: ['say', 'yell', 'tell', 'chat', 'gtell', 'emote'],
    blockedMessage: 'You have been censored and cannot communicate.',
  },
  listeners: {
    effectActivated: function () {
      Broadcast.sayAt(this.target, '<red>You have been censored by an administrator. All communication is blocked.</red>');
    },
    effectRemoved: function () {
      Broadcast.sayAt(this.target, '<green>Your censorship has been lifted.</green>');
    },
  },
};