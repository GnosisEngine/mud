'use strict'

const Colors = require('../../colors/lib/Colors')

// Icons for known action/resource stats
const STAT_ICONS = {
  mana:      '✨',
  mp:        '✨',
  energy:    '✨',
  stamina:   '🟢',
  focus:     '🔵',
  rage:      '🔴',
  ki:        '🔶',
  chi:       '🔶',
  soul:      '💜',
  faith:     '🤍',
  favor:     '🤍',
  corruption:'🖤',
  charge:    '🔋',
}

const DEFAULT_STAT_ICON = '🔷'

// Per-stat color palette: [brightRgb, darkRgb]
const STAT_COLORS = {
  mana:       [[80,  120, 255], [15,  25,  60]],
  mp:         [[80,  120, 255], [15,  25,  60]],
  energy:     [[255, 230, 60],  [60,  55,  10]],
  stamina:    [[60,  220, 100], [10,  50,  20]],
  focus:      [[60,  180, 255], [10,  40,  70]],
  rage:       [[255, 60,  60],  [70,  10,  10]],
  ki:         [[255, 160, 40],  [70,  40,  10]],
  chi:        [[255, 160, 40],  [70,  40,  10]],
  soul:       [[200, 80,  255], [50,  10,  80]],
  faith:      [[230, 230, 255], [50,  50,  70]],
  corruption: [[180, 0,   255], [30,  0,   50]],
  charge:     [[80,  255, 220], [10,  60,  50]],
}

const DEFAULT_STAT_COLORS = [[80, 200, 255], [15, 45, 65]]

const HEALTH_BRIGHT = [255, 60,  80]
const HEALTH_DARK   = [60,  10,  20]

const DOTS     = 4
const DOT_CHAR = '•'

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
  const hp    = player.getAttribute('health')
  const maxHp = player.getMaxAttribute('health')
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0

  const statKey  = actionName.toLowerCase()
  const sp       = player.getAttribute(actionName)
  const maxSp    = player.getMaxAttribute(actionName)
  const spPct    = maxSp > 0 ? Math.max(0, Math.min(1, sp / maxSp)) : 0

  const statIcon   = STAT_ICONS[statKey]   || DEFAULT_STAT_ICON
  const statColors = STAT_COLORS[statKey]  || DEFAULT_STAT_COLORS
  const [sBright, sDark] = statColors

  const hpDots = makeDots(hpPct, HEALTH_BRIGHT, HEALTH_DARK)
  const spDots = makeDots(spPct, sBright, sDark)

  const bracket = Colors.rgb(120, 120, 120)
  const divider = Colors.rgb(80, 80, 80)
  const R       = Colors.RESET

  return (
    `${bracket}[${R} ` +
    `💗 ${hpDots}` +
    ` ${divider}|${R} ` +
    `${statIcon} ${spDots}` +
    ` ${bracket}]${R}`
  )
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
  const filledDots = pct * DOTS
  const parts = []

  for (let i = 0; i < DOTS; i++) {
    const dotFill = Math.max(0, Math.min(1, filledDots - i))
    // Interpolate between dark and bright based on how filled this dot is
    const color = lerpColor(darkRgb, brightRgb, dotFill)
    parts.push(`${Colors.rgb(...color)}${DOT_CHAR}`)
  }

  return parts.join(' ') + Colors.RESET
}

function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

module.exports = { renderStatusBar }