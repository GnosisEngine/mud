// bundles/factions/policies/honor_reward.js
'use strict';

module.exports = function honorReward(ctx) {
  const { honor, debt, affinity } = ctx.profile.brackets;

  if (honor === 'exemplary') {
    return {
      action: 'reward_enhanced',
      message: 'They receive your work with visible respect. "Few do this as well as you."',
    };
  }

  if (debt === 'indebted' || debt === 'owing') {
    return {
      action: 'reward',
      message: 'Payment rendered. A small portion of what you owe is forgiven.',
    };
  }

  if (affinity === 'enemy') {
    return {
      action: 'reward_minimal',
      message: 'They pay what was agreed. Nothing more is said.',
    };
  }

  return {
    action: 'reward',
    message: 'The work is done. They are satisfied.',
  };
};
