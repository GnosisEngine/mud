'use strict';
const canSpeak = require('../moderation/lib/canSpeak');
const { ContextService } = require('../world/lib/ContextService');

const CHANNELS = ['chat', 'say', 'yell', 'gtell', 'tell'];

ContextService.register(({ player, input }) => {
  const result = [];
  const trimmed = input.trim().toLowerCase();

  for (const channel of CHANNELS) {
    const { blocked } = canSpeak(player, channel);
    // @TODO show gtell only when in a party
    if ((channel.startsWith(trimmed) || trimmed === '') && !blocked) {
      result.push(channel);
    }
  }

  return result;
});
