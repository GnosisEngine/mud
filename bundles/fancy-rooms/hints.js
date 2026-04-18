'use strict';
const { ContextService, check } = require('../world/lib/ContextService');

ContextService.register(({ input }) => {
  const performableActions = [];
  const trimmed = input.trim().toLowerCase();

  check('look', trimmed)
    && performableActions.push('look');

  check('map', trimmed)
    && performableActions.push('map');

  check('waypoint', trimmed)
    && performableActions.push('waypoint');


  return performableActions;
});
