// bundles/time-bundle/commands/time.js
const { Broadcast: B } = require('ranvier');
const say = B.sayAt;

'use strict';

const {
  TICKS_PER_DAY,
  DAYS_PER_YEAR,
  tickToComponents,
} = require('../lib/time-math');

module.exports = {
  usage: 'time',
  command: state => (args, player) => {
    const ts  = state.TimeService;
    const tick = ts.getTick();
    const { year, dayOfMonth, isHoliday } = tickToComponents(tick);

    const position   = ts.getTimePosition();
    const dayPhase   = ts.getDayPhase();
    const moonPhase  = ts.getMoonPhase();
    const moonSky    = ts.getMoonSkyPosition();
    const month      = ts.getMonth();
    const dayOfWeek  = ts.getDayOfWeek();

    const skyLine = moonSky.name === 'Below Horizon'
      ? `${dayPhase.emoji} ${dayPhase.name}`
      : `${moonPhase.emoji} ${moonPhase.name}  ${moonSky.emoji} ${moonSky.name}`;

    const dateLine = isHoliday
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