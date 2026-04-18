'use strict';
const { ContextService, check } = require('../world/lib/ContextService');

ContextService.register(({ input }) => {
  const performableActions = [];
  const trimmed = input.trim().toLowerCase();

  check('craft', trimmed)
    && performableActions.push('craft');

  check('gather', trimmed)
    && performableActions.push('gather');

  check('resources', trimmed)
    && performableActions.push('resources');

  check('trade', trimmed)
    && performableActions.push('trade');
  return performableActions;
});
