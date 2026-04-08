// bundles/communication/effects/dull.js
'use strict';

const { Broadcast } = require('ranvier');

module.exports = {
  config: {
    name: 'Dull',
    type: 'dull',
    description: 'Your mind is too clouded to reach others directly.',
    blockedChannels: ['tell'],
    blockedMessage: 'Your mind is too clouded to reach them.',
  },
  listeners: {
    effectActivated: function () {
      Broadcast.sayAt(this.target, '<yellow>A fog settles over your mind. You can no longer send private tells.</yellow>');
    },
    effectRemoved: function () {
      Broadcast.sayAt(this.target, '<green>The fog lifts. Your mind is clear once more.</green>');
    },
  },
};