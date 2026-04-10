'use strict';
// bundles/time-bundle/lib/time-broadcaster.js

const timeState = require('./time-state');
const { DAY_PHASES, MOON_PHASES } = require('./time-math');
const { Broadcast: B } = require('ranvier');
const { EVENTS } = require('../events');
const say = B.sayAt;

const DAY_PHASE_TEXT = {
  'Midnight': 'The world lies still in the deep of night.',
  'Dawn': 'The first grey light creeps along the horizon.',
  'Sunrise': 'The sun crests the horizon, painting the sky.',
  'Morning': ' Morning light spreads across the land.',
  'Noon': ' The sun stands at its peak overhead.',
  'Afternoon': 'The sun begins its long slide toward evening.',
  'Sunset': 'The sky burns as the sun meets the horizon.',
  'Dusk': 'Shadows lengthen as the last light fades.',
  'Night': 'Darkness settles over the world.',
};

const MOON_PHASE_TEXT = {
  'New Moon': 'The moon is dark, invisible in the night sky.',
  'Waxing Crescent': 'A thin crescent moon hangs in the western sky.',
  'First Quarter': 'A half-moon rides high, casting long shadows.',
  'Waxing Gibbous': 'The moon swells toward fullness.',
  'Full Moon': 'The full moon blazes overhead, bright as cold fire.',
  'Waning Gibbous': 'The moon has passed its fullness and begins to thin.',
  'Last Quarter': 'A half-moon rises late, marking the turn of the month.',
  'Waning Crescent': 'A slender crescent trails the moon toward darkness.',
};

const DAY_PHASE_MESSAGES = Object.fromEntries(
  DAY_PHASES.map(p => [p.name, `${p.emoji} ${DAY_PHASE_TEXT[p.name]}`])
);

const MOON_PHASE_MESSAGES = Object.fromEntries(
  MOON_PHASES.map(p => [p.name, `${p.emoji} ${MOON_PHASE_TEXT[p.name]}`])
);

function formatDayPhase(phase) {
  return DAY_PHASE_MESSAGES[phase.name];
}

function formatMoonPhase(phase) {
  return MOON_PHASE_MESSAGES[phase.name];
}

function broadcastToAll(playerManager, message) {
  playerManager.getPlayersAsArray().forEach(player => {
    say(player, message);
  });
}

function register(playerManager) {
  timeState.on(EVENTS.DAY_PHASE_CHANGE, phase => {
    broadcastToAll(playerManager, formatDayPhase(phase));
  });

  timeState.on(EVENTS.MOON_PHASE_CHANGE, phase => {
    broadcastToAll(playerManager, formatMoonPhase(phase));
  });
}

module.exports = { register, formatDayPhase, formatMoonPhase };
