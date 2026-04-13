// bundles/communication/effects/outcasted.js
'use strict';

const { Broadcast } = require('ranvier');

module.exports = {
  config: {
    name: 'Outcasted',
    type: 'outcasted',
    description: 'You are cut off from your group.',
    blockedChannels: ['gtell'],
    blockedMessage: 'You are cut off from your group and cannot reach them.',
  },
  listeners: {
    effectActivated: function() {
      Broadcast.sayAt(this.target, '<red>You have been cast out. Your group can no longer hear you.</red>');
    },
    effectRemoved: function() {
      Broadcast.sayAt(this.target, '<green>You are no longer outcasted.</green>');
    },
  },
};
