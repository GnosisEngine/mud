'use strict';
const { ContextService, check } = require('../world/lib/ContextService');

ContextService.register(({ input }) => {
  const performableActions = [];
  const trimmed = input.trim().toLowerCase();

  check('commands', trimmed)
    && performableActions.push('commands');

  check('config', trimmed)
    && performableActions.push('config');

  check('drop', trimmed)
    && performableActions.push('drop');

  check('emote', trimmed)
    && performableActions.push('emote');

  check('equipment', trimmed)
    && performableActions.push('equipment');

  check('flush', trimmed)
    && performableActions.push('flush');

  check('get', trimmed)
    && performableActions.push('get');

  check('give', trimmed)
    && performableActions.push('give');

  check('help', trimmed)
    && performableActions.push('help');

  check('inventory', trimmed)
    && performableActions.push('inventory');

  check('look', trimmed)
    && performableActions.push('look');

  check('open', trimmed)
    && performableActions.push('open');

  check('put', trimmed)
    && performableActions.push('put');

  check('queue', trimmed)
    && performableActions.push('queue');

  check('quit', trimmed)
    && performableActions.push('quit');

  check('remove', trimmed)
    && performableActions.push('remove');

  check('save', trimmed)
    && performableActions.push('save');

  check('scan', trimmed)
    && performableActions.push('scan');

  check('score', trimmed)
    && performableActions.push('score');

  check('tnl', trimmed)
    && performableActions.push('tnl');

  check('use', trimmed)
    && performableActions.push('use');

  check('wear', trimmed)
    && performableActions.push('wear');

  check('who', trimmed)
    && performableActions.push('who');

  return performableActions;
});
