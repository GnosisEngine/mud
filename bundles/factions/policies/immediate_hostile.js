// bundles/factions/policies/immediate_hostile.js
'use strict';

module.exports = function immediateHostile(ctx) {
  const { affinity, honor } = ctx.profile.brackets;

  if (ctx.profile.isStranger) {
    return { action: 'attack', message: 'A guard charges without a word.' };
  }

  if (honor === 'exemplary' || honor === 'honorable') {
    return { action: 'warn', message: '"You know better than this. Leave now and we will forget it."' };
  }

  if (affinity === 'friendly' || affinity === 'devoted') {
    return { action: 'warn', message: '"Do not make me do this. Walk away."' };
  }

  return { action: 'attack', message: 'They come at you without hesitation.' };
};
