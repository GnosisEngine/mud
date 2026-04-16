'use strict';
const { ContextService, check } = require('../world/lib/ContextService');
const {
  isInCombat,
  hasExits,
  hasTargetsNear
} = require('./logic');

ContextService.register(({ state, player, input }) => {
  const performableActions = ['pvp'];
  const trimmed = input.trim().toLowerCase();
  const targetsNear = hasTargetsNear(state, player);

  check('flee', trimmed) && isInCombat(state, player) && hasExits(state, player)
    && performableActions.push('flee');

  check('consider', trimmed) && targetsNear
    && performableActions.push('consider');

  check('kill', trimmed) && targetsNear
    && performableActions.push('kill');

  return performableActions;
});
