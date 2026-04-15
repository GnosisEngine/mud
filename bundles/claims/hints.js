'use strict';
const { ContextService, check } = require('../world/lib/ContextService');
const {
  canClaimRoom,
  hasEnforcablesNear,
  isThreatened,
  hasNoClaims
} = require('./logic');

ContextService.register(({ state, player, input }) => {
  const performableActions = [];
  const trimmed = input.trim().toLowerCase();

  check('claim', trimmed) && canClaimRoom(state, player)
    && performableActions.push('claim');

  check('claims', trimmed) && hasNoClaims(state, player) === false
    && performableActions.push('claims');

  check('enforce', trimmed) && hasEnforcablesNear(state, player)
    && performableActions.push('enforcce');

  check('submit', trimmed) && isThreatened(state, player)
    && performableActions.push('submit');

  // @TODO deal with this later
  // check('collateral', trimmed)
  //  && result.push('collateral');

  return performableActions;
});
