'use strict';
const { ContextService, check } = require('../world/lib/ContextService');

ContextService.register(({ _, __, input }) => {
  const performableActions = [];
  const trimmed = input.trim().toLowerCase();

  check('gag', trimmed)
    && performableActions.push('gag');

  check('gags', trimmed)
    && performableActions.push('gags');

  check('ungag', trimmed)
    && performableActions.push('ungag');

  return performableActions;
});
