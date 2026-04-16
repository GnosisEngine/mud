'use strict';
const { ContextService, check } = require('../world/lib/ContextService');

ContextService.register(({ _, __, input }) => {
  const performableActions = [];
  const trimmed = input.trim().toLowerCase();

  check('shop', trimmed)
    && performableActions.push('shop');


  return performableActions;
});
