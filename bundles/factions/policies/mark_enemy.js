// bundles/factions/policies/mark_enemy.js
'use strict';

module.exports = function markEnemy(ctx) {
  const { affinity, honor, debt } = ctx.profile.brackets;

  if (affinity === 'devoted' || affinity === 'friendly') {
    if (debt === 'patron' || debt === 'creditor') {
      return {
        action: 'mark_hostile',
        message: 'Word spreads quickly. Those who once welcomed you now turn their backs.',
      };
    }
    return {
      action: 'mark_hostile',
      message: 'The goodwill you earned is spent. They will not forget this.',
    };
  }

  if (honor === 'honorable' || honor === 'exemplary') {
    return {
      action: 'mark_hostile',
      message: 'You fought in the open. They will come for you, but with some measure of respect.',
    };
  }

  return {
    action: 'mark_hostile',
    message: 'You have made an enemy today.',
  };
};
