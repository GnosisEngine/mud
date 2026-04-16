'use strict';
const { ContextService, check } = require('../world/lib/ContextService');

ContextService.register(({ _, __, input }) => {
  const performableActions = [];
  const trimmed = input.trim().toLowerCase();

  check('dismiss', trimmed)
    && performableActions.push('dismiss');

  check('hire', trimmed)
    && performableActions.push('hire');

  check('mercs', trimmed)
    && performableActions.push('mercs');

  return performableActions;
});
