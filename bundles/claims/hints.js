'use strict';
const { ContextService } = require('../world/lib/ContextService');

ContextService.register(({ /*state, player,*/ input }) => {
  const result = [];
  const trimmed = input.trim().toLowerCase();

  const canClaim = 'claim'.startsWith(trimmed) || trimmed === '';
  canClaim && result.push('claim');

  const canClaims = 'claims'.startsWith(trimmed) || trimmed === '';
  canClaims && result.push('claims');

  const canCollateral = 'collateral'.startsWith(trimmed) || trimmed === '';
  canCollateral && result.push('collateral');

  const canEnforce = 'enforce'.startsWith(trimmed) || trimmed === '';
  canEnforce && result.push('enforcce');

  const canSubmit = 'submit'.startsWith(trimmed) || trimmed === '';
  canSubmit && result.push('submit');

  return result;
});
