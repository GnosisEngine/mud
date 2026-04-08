// bundles/communication/effects/raspy.js
'use strict';

const { Broadcast } = require('ranvier');

module.exports = {
  config: {
    name: 'Raspy',
    type: 'raspy',
    description: 'Your voice cannot carry far.',
    blockedChannels: ['yell', 'chat'],
    blockedMessage: 'Your voice is too raspy to carry that far.',
  },
  listeners: {
    effectActivated: function () {
      Broadcast.sayAt(this.target, '<yellow>Your throat tightens. Your voice will not carry beyond this room.</yellow>');
    },
    effectRemoved: function () {
      Broadcast.sayAt(this.target, '<green>Your voice returns to full strength.</green>');
    },
  },
};