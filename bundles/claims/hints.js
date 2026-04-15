'use strict';
const { ContextService, check } = require('../world/lib/ContextService');
const {
  canClaimRoom,
} = require('./logic');

console.log('claims logic');
ContextService.register(({ state, player, input }) => {
  console.log('hello');
  const result = [];
  const trimmed = input.trim().toLowerCase();

  const canClaim = check('claim', trimmed) && canClaimRoom(state, player);
  canClaim && result.push('claim');

  const canClaims = check('claims', trimmed);
  canClaims && result.push('claims');

  const canCollateral = check('collateral', trimmed);
  canCollateral && result.push('collateral');

  const canEnforce = check('enforce', trimmed);
  canEnforce && result.push('enforcce');

  const canSubmit = check('submit', trimmed);
  canSubmit && result.push('submit');

  return result;
});
