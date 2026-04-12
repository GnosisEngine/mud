// bundles/factions/policies/warn_once.js
'use strict';

module.exports = function warnOnce(ctx) {
  const { affinity, trust, honor } = ctx.profile.brackets;

  if (affinity === 'enemy' && trust === 'deceiver') {
    return { action: 'attack', message: 'They have warned you before. This time there are no words.' };
  }

  if (honor === 'honorable' || honor === 'exemplary') {
    return {
      action: 'warn',
      message: '"We have no quarrel with you. Take what you need and go in peace."',
    };
  }

  return {
    action: 'warn',
    message: '"You have been warned. Do not make us say it again."',
  };
};
