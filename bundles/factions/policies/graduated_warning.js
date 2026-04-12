// bundles/factions/policies/graduated_warning.js
'use strict';

module.exports = function graduatedWarning(ctx) {
  const { affinity, trust } = ctx.profile.brackets;

  if (affinity === 'enemy') {
    return { action: 'attack', message: 'They move to stop you by force.' };
  }

  if (trust === 'deceiver' || trust === 'suspicious') {
    return { action: 'warn', message: 'A guard steps forward, hand on weapon. "You are not welcome here."' };
  }

  if (affinity === 'hostile') {
    return { action: 'warn', message: '"Move along. This does not concern you."' };
  }

  return { action: 'warn', message: 'Someone watches you carefully but says nothing yet.' };
};
