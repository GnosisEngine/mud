'use strict';
const { ContextService, check } = require('../world/lib/ContextService');

ContextService.register(({ input }) => {
  const performableActions = [];
  const trimmed = input.trim().toLowerCase();

  check('effects', trimmed)
    && performableActions.push('effects');


  return performableActions;
});
