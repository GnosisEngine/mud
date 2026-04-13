'use strict';

// bundles/time-bundle/commands/time.js
const { Broadcast: B } = require('ranvier');
const say = B.sayAt;

// bundles/time-bundle/commands/time.js

'use strict';

const {
  tickToComponents,
  isMoonObservable,
} = require('../lib/time-math');

module.exports = {
  usage: 'time',

  command: state => (args, player) => {
    const ts = state.TimeService;
    // @TODO remove this args usage later
    const tick = (args && args.trim() !== '') ? parseInt(args.trim(), 10) : ts.getTick();
    const { year, dayOfMonth, isHoliday } = tickToComponents(tick);

    const position = ts.getTimePosition(tick);
    const dayPhase = ts.getDayPhase(tick);
    const moonPhase = ts.getMoonPhase(tick);
    const moonSky = ts.getMoonSkyPosition(tick);
    const month = ts.getMonth(tick);
    const dayOfWeek = ts.getDayOfWeek(tick);
    const hour = ts.getHour(tick);

    const sunIsUp = hour >= 6 && hour < 21;
    const moonVisible = isMoonObservable(tick);

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
