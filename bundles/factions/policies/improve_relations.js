// bundles/factions/policies/improve_relations.js
'use strict';

module.exports = function improveRelations(ctx) {
  const { affinity, trust, debt } = ctx.profile.brackets;

  if (debt === 'patron') {
    return {
      action: 'reward',
      message: 'They receive your contribution warmly. You are well regarded here.',
    };
  }

  if (trust === 'confidant' || trust === 'trusted') {
    return {
      action: 'reward',
      message: 'A nod of acknowledgement. Your reliability does not go unnoticed.',
    };
  }

  if (affinity === 'enemy' || affinity === 'hostile') {
    return {
      action: 'acknowledge',
      message: 'They accept what you offer without warmth. The transaction is complete.',
    };
  }

  return {
    action: 'reward',
    message: 'The exchange goes smoothly. You leave on better terms than you arrived.',
  };
};
