'use strict';

// bundles/time-bundle/commands/time.js
const { Broadcast: B } = require('ranvier');
const say = B.sayAt;
const { tickToComponents } = require('../lib/time-math');
const {
  hasTickArg,
  isSunUp,
  isMoonVisible,
  isHoliday,
} = require('../logic');

module.exports = {
  usage: 'time',

  command: state => (args, player) => {
    const ts = state.TimeService;
    const tick = hasTickArg(state, player, { args }) ? parseInt(args.trim(), 10) : ts.getTick();
    const { year, dayOfMonth, isHoliday: holidayFlag } = tickToComponents(tick);

    const position   = ts.getTimePosition(tick);
    const dayPhase   = ts.getDayPhase(tick);
    const moonPhase  = ts.getMoonPhase(tick);
    const moonSky    = ts.getMoonSkyPosition(tick);
    const month      = ts.getMonth(tick);
    const dayOfWeek  = ts.getDayOfWeek(tick);
    const hour       = ts.getHour(tick);

    const sunIsUp      = isSunUp(state, player, { hour });
    const moonVisible  = isMoonVisible(state, player, { tick });

    let skyLine;
    if (sunIsUp && moonVisible) {
      skyLine = `${dayPhase.emoji} ${dayPhase.name}  ${moonPhase.emoji} ${moonPhase.name}  ${moonSky.emoji} ${moonSky.name}`;
    } else if (sunIsUp) {
      skyLine = `${dayPhase.emoji} ${dayPhase.name}`;
    } else if (moonVisible) {
      skyLine = `${moonPhase.emoji} ${moonPhase.name}  ${moonSky.emoji} ${moonSky.name}`;
    } else {
      skyLine = `${dayPhase.emoji} ${dayPhase.name}`;
    }

    const dateLine = isHoliday(state, player, { isHoliday: holidayFlag })
      ? `${dayOfWeek.name}, ${month.name}, Year ${year}`
      : `${dayOfWeek.name}, the ${ordinal(dayOfMonth)} of ${month.name}, Year ${year}`;

    say(player, `${position}  ${skyLine}`);
    say(player, dateLine);
  },
};

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
