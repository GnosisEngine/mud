'use strict';

const Colors = require('../../colors/lib/Colors');

// Icons for known action/resource stats
const STAT_ICONS = {
  mana:      '✨',
  mp:        '✨',
  energy:    '⚡',
  stamina:   '🟢',
  focus:     '🔵',
  rage:      '🔴',
  ki:        '🔶',
  chi:       '🔶',
  soul:      '💜',
  faith:     '🤍',
  corruption:'🖤',
  charge:    '🔋',
};

const DEFAULT_STAT_ICON = '🔷';

// Per-stat color palette: [brightRgb, darkRgb]
const STAT_COLORS = {
  mana:       [[80,  120, 255], [3,  4,  12]],
  mp:         [[80,  120, 255], [3,  4,  12]],
  energy:     [[255, 230, 60],  [10, 9,  2]],
  stamina:    [[60,  220, 100], [2,  8,  3]],
  focus:      [[60,  180, 255], [2,  6,  12]],
  rage:       [[255, 60,  60],  [12, 2,  2]],
  ki:         [[255, 160, 40],  [12, 6,  2]],
  chi:        [[255, 160, 40],  [12, 6,  2]],
  soul:       [[200, 80,  255], [8,  2,  14]],
  faith:      [[230, 230, 255], [8,  8,  12]],
  corruption: [[180, 0,   255], [5,  0,  8]],
  charge:     [[80,  255, 220], [2,  10, 8]],
};

const DEFAULT_STAT_COLORS = [[80, 200, 255], [3, 7, 10]];

const HEALTH_BRIGHT = [255, 60,  80];
const HEALTH_DARK   = [10,  2,   3];

const DOTS       = 4;
const FILL_CHAR  = '●';
const EMPTY_CHAR = '○';
const EMPTY_COLOR = [45, 45, 45];

/**
 * Render a small inline HUD bar like:
 *   [ 💗 • • • • | ✨ • • • • ]
 *
 * Each dot represents a quartile of the stat.
 * Bright = filled, dark = empty.
 *
 * @param {object} state      - Ranvier GameState
 * @param {object} player     - Ranvier PlayerCharacter
 * @param {string} actionName - The resource/stat to show alongside health
 *                              (e.g. 'mana', 'stamina', 'energy')
 * @returns {string} ANSI-colored status string
 */
function renderStatusBar(state, player, actionName) {
  const hp    = player.getAttribute('health');
  const maxHp = player.getMaxAttribute('health');
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;

  const statKey  = actionName.toLowerCase();
  const sp       = player.getAttribute(actionName);
  const maxSp    = player.getMaxAttribute(actionName);
  const spPct    = maxSp > 0 ? Math.max(0, Math.min(1, sp / maxSp)) : 0;

  const statIcon   = STAT_ICONS[statKey]   || DEFAULT_STAT_ICON;
  const statColors = STAT_COLORS[statKey]  || DEFAULT_STAT_COLORS;
  const [sBright, sDark] = statColors;

  const hpDots = makeDots(hpPct, HEALTH_BRIGHT, HEALTH_DARK);
  const spDots = makeDots(spPct, sBright, sDark);

  const bracket = Colors.rgb(120, 120, 120);
  const divider = Colors.rgb(80, 80, 80);
  const R       = Colors.RESET;

  return (
    `${bracket}[${R} ` +
    `💗 ${hpDots}` +
    ` ${divider}|${R} ` +
    `${statIcon} ${spDots}` +
    ` ${bracket}]${R}`
  );
}

/**
 * Build the dot string for a single stat.
 * Each dot is individually colored: bright if its quartile is filled,
 * dark otherwise. The threshold dot (the one at the boundary) is blended.
 *
 * @param {number}   pct        - 0.0 to 1.0
 * @param {number[]} brightRgb
 * @param {number[]} darkRgb
 * @returns {string}
 */
function makeDots(pct, brightRgb, darkRgb) {
  // filledDots is a float, e.g. 2.5 at 62.5% with 4 dots
  const filledDots = pct * DOTS;
  const parts = [];

  for (let i = 0; i < DOTS; i++) {
    const dotFill = Math.max(0, Math.min(1, filledDots - i));
    if (dotFill === 0) {
      // Completely empty quintile — hollow char in dim grey
      parts.push(`${Colors.rgb(...EMPTY_COLOR)}${EMPTY_CHAR}`);
    } else {
      // Partially or fully filled — filled char, color lerped bright→dark
      const color = lerpColor(darkRgb, brightRgb, dotFill);
      parts.push(`${Colors.rgb(...color)}${FILL_CHAR}`);
    }
  }

  return parts.join(' ') + Colors.RESET;
}

function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

module.exports = { renderStatusBar };
