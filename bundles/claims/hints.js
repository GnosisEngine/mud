'use strict';
const { ContextService, check } = require('../world/lib/ContextService');
const {
  canClaimRoom,
  hasEnforcablesNear,
  isThreatened,
  hasNoClaims
} = require('./logic');


ContextService.register(({ state, player, input }) => {
  console.log('hello');
  const result = [];
  const trimmed = input.trim().toLowerCase();

  const canClaim = check('claim', trimmed) && canClaimRoom(state, player);
  canClaim && result.push('claim');

  const canClaims = check('claims', trimmed) && hasNoClaims(state, player) === false;
  canClaims && result.push('claims');

  // @TODO deal with this later
  // const canCollateral = check('collateral', trimmed);
  // canCollateral && result.push('collateral');

  const canEnforce = check('enforce', trimmed) && hasEnforcablesNear(state, player);
  canEnforce && result.push('enforcce');

  const canSubmit = check('submit', trimmed) && isThreatened(state, player);
  canSubmit && result.push('submit');

  return result;
});
