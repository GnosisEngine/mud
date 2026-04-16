'use strict';
const { ContextService, check } = require('../world/lib/ContextService');
const {
  canDoThing,
} = require('./logic');

ContextService.register(({ state, player, input }) => {
  const performableActions = [];
  const trimmed = input.trim().toLowerCase();

  check('', trimmed) && canDoThing(state, player)
    && performableActions.push('');


  return performableActions;
});
