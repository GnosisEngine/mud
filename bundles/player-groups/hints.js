'use strict';
const { ContextService, check } = require('../world/lib/ContextService');

ContextService.register(({ input }) => {
  const performableActions = [];
  const trimmed = input.trim().toLowerCase();

  check('ditch', trimmed)
    && performableActions.push('ditch');

  check('follow', trimmed)
    && performableActions.push('follow');

  check('group', trimmed)
    && performableActions.push('group');


  return performableActions;
});
