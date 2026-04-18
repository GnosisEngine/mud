'use strict';
const { ContextService, check } = require('../world/lib/ContextService');

ContextService.register(({ input }) => {
  const performableActions = [];
  const trimmed = input.trim().toLowerCase();

  check('cast', trimmed)
    && performableActions.push('cast');

  check('skill', trimmed)
    && performableActions.push('skill');

  check('skills', trimmed)
    && performableActions.push('skills');

  return performableActions;
});
