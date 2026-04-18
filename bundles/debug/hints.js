'use strict';
const { ContextService, check } = require('../world/lib/ContextService');

ContextService.register(({ input }) => {
  const performableActions = [];
  const trimmed = input.trim().toLowerCase();

  check('hotfix', trimmed)
    && performableActions.push('hotfix');

  check('setadmin', trimmed)
    && performableActions.push('setadmin');

  check('shutdown', trimmed)
    && performableActions.push('shutdown');

  check('teleport', trimmed)
    && performableActions.push('teleport');

  return performableActions;
});
