// bundles/factions/policies/honor_check.js
'use strict';

module.exports = function honorCheck(ctx) {
  const { honor, trust } = ctx.profile.brackets;

  if (trust === 'deceiver') {
    return { action: 'reject', message: '"Your word means nothing here."' };
  }

  if (honor === 'exemplary' || honor === 'honorable') {
    return { action: 'accept', message: 'They lower their weapons. "We accept your surrender."' };
  }

  if (honor === 'contemptible' || honor === 'dishonorable') {
    return { action: 'reject', message: '"Mercy is wasted on your kind."' };
  }

  if (trust === 'trusted' || trust === 'confidant') {
    return { action: 'accept', message: '"Stand down. We will honor this."' };
  }

  return { action: 'reject', message: '"You have not earned this consideration."' };
};
