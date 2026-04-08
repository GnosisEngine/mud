// bundles/communication/effects/muted.js
'use strict';

const { Broadcast } = require('ranvier');

module.exports = {
  config: {
    name: 'Muted',
    type: 'muted',
    description: 'You cannot speak publicly.',
    blockedChannels: ['say', 'yell', 'chat', 'gtell', 'emote'],
    blockedMessage: 'You open your mouth but no sound escapes your lips.',
  },
  listeners: {
    effectActivated: function () {
      Broadcast.sayAt(this.target, '<red>You have been muted by an administrator. You may still send private tells.</red>');
    },
    effectRemoved: function () {
      Broadcast.sayAt(this.target, '<green>You have been unmuted.</green>');
    },
  },
};