'use strict'

const Colors = require('../../colors/lib/Colors')

const DEFAULT_WIDTH = 72

function pad(str, width) {
  const len = Colors.visibleLength(str)
  return str + ' '.repeat(Math.max(0, width - len))
}

function wordWrap(text, width) {
  const words = text.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (Colors.visibleLength(test) > width) {
      if (current) lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t) }

function borderColor(col, row, totalCols, totalRows) {
  const tx = col / (totalCols - 1)
  const ty = (totalRows - 1 - row) / (totalRows - 1)
  const t  = (tx + ty) / 2
  return Colors.rgb(lerp(80, 255, t), lerp(45, 215, t), 0)
}

function gc(char, col, row, W, H) {
  return `${borderColor(col, row, W, H)}${char}${Colors.RESET}`
}

function hrun(char, c1, c2, row, W, H) {
  let s = ''
  for (let c = c1; c <= c2; c++) s += gc(char, c, row, W, H)
  return s
}

function gradientTitle(text) {
  return [...text].map((char, i, arr) => {
    const t = arr.length === 1 ? 1 : i / (arr.length - 1)
    return `${Colors.rgb(lerp(40, 130, t), lerp(195, 255, t), lerp(170, 220, t))}${char}`
  }).join('') + Colors.RESET
}

function shimmerText(text) {
  // Split on ANSI escape sequences, keeping them in the array via capture group.
  // Track whether markup has set an explicit fg color — if so, let those
  // characters through unshimmered so the markup color is visible.
  const parts = text.split(/(\x1b\[[0-9;]*m)/)
  let inMarkupColor = false
  return parts.map(part => {
    if (part.startsWith('\x1b')) {
      const code = part.slice(2, -1) // strip leading \x1b[ and trailing m
      if (code === '0' || code === '39') {
        inMarkupColor = false         // reset or fg-default: resume shimmer
      } else if (/^(3[0-7]|9[0-7]|38)/.test(code)) {
        inMarkupColor = true          // any fg color set by markup: pause shimmer
      }
      return part
    }
    if (inMarkupColor) return part    // let markup color show through as-is
    return [...part].map(char => {
      if (char === ' ') return char
      const v = Math.floor(Math.random() * 56) - 28
      const r = Math.min(255, Math.max(0, 240 + v))
      const g = Math.min(255, Math.max(0, 234 + Math.floor(v * 0.9)))
      const b = Math.min(255, Math.max(0, 214 + Math.floor(v * 0.7)))
      return `${Colors.rgb(r, g, b)}${char}`
    }).join('')
  }).join('') + Colors.RESET
}

const AREA_PAREN = Colors.rgb( 80, 110, 220)
const AREA_NAME  = Colors.rgb(130, 165, 255)

function areaTag(name) {
  return `${AREA_PAREN}(${AREA_NAME} ${name} ${AREA_PAREN})${Colors.RESET}`
}

// waypointLabel: string if this room is a saved waypoint, null otherwise
// state: Ranvier state object (optional) — used for door emoji resolution
function decorate(room, width = DEFAULT_WIDTH, options = {}) {
  const { waypointLabel = null, state = null } = options

  const EL = Colors.rgb(150, 140,  80)
  const DM = Colors.rgb( 80,  30, 120)
  const DC = Colors.rgb(200, 100, 255)

  const inner  = width - 4
  const titleW = width - 2

  const titleRaw  = room.title || 'Unknown'
  const areaName  = room.area ? room.area.title : null
  const rawDesc   = (room.description || '').replace(/[\r\n]+/g, ' ').replace(/  +/g, ' ').trim()
  const descLines = wordWrap(Colors.parse(rawDesc), inner)
  // replace the old exits line near the top of decorate()
  const exits = (typeof room.getExits === 'function'
    ? room.getExits()
    : Array.isArray(room.exits)
      ? room.exits
      : []).sort()

  const totalRows = 4 + descLines.length + (exits.length ? 2 : 0)
  const W = width

  const g  = (char, col, row) => gc(char, col, row, W, totalRows)
  const hr = (char, c1, c2, row) => hrun(char, c1, c2, row, W, totalRows)

  const out = []
  let row = 0

  // top border
  if (areaName) {
    const tagVisualLen = areaName.length + 4
    const MIN_RIGHT    = 5
    const leftDashes   = Math.max(1, W - 2 - tagVisualLen - MIN_RIGHT)
    const tagStart     = leftDashes + 1
    const rightStart   = tagStart + tagVisualLen
    const rightEnd     = W - 2
    out.push(
      g('╔', 0, row) +
      hr('═', 1, leftDashes, row) +
      areaTag(areaName) +
      hr('═', rightStart, rightEnd, row) +
      g('╗', W-1, row)
    )
  } else {
    out.push(g('╔', 0, row) + hr('═', 1, W-2, row) + g('╗', W-1, row))
  }
  row++

  // title
  const titleStyled = gradientTitle(titleRaw)
  const titlePad    = Math.max(0, titleW - Colors.visibleLength(titleRaw))
  const padL        = Math.floor(titlePad / 2)
  const padR        = titlePad - padL
  out.push(g('║', 0, row) + ' '.repeat(padL) + titleStyled + ' '.repeat(padR) + g('║', W-1, row))
  row++

  // gem separator — ⭐ (2 wide) if waypoint, ◆ (1 wide) otherwise
  const gem      = waypointLabel ? '⭐' : '◆'
  const gemWidth = waypointLabel ? 2 : 1
  const gemC     = waypointLabel ? Colors.rgb(255, 230, 80) : Colors.rgb(255, 210, 40)
  const totalDashes = W - 2 - gemWidth
  const gemL     = Math.floor(totalDashes / 2)
  const gemR     = totalDashes - gemL
  out.push(
    g('╠', 0, row) +
    hr('═', 1, gemL, row) +
    `${gemC}${gem}${Colors.RESET}` +
    hr('═', gemL + 1 + gemWidth, gemL + gemWidth + gemR, row) +
    g('╣', W-1, row)
  )
  row++

  // description
  for (const line of descLines) {
    const shimmered = shimmerText(pad(line, inner))
    out.push(g('║', 0, row) + ` ${shimmered} ` + g('║', W-1, row))
    row++
  }

  // exits
  if (exits.length) {
    out.push(g('╠', 0, row) + hr('─', 1, W-2, row) + g('╣', W-1, row))
    row++

    const exitList = exits.map(exit => {
      let doorEmoji = ''
      if (state) {
        const exitRoom = state.RoomManager.getRoom(exit.roomId)
        const door     = room.getDoor(exitRoom) || (exitRoom && exitRoom.getDoor(room))
        if (door) {
          doorEmoji = door.locked ? ' 🔒' : door.closed ? ' 🚪' : ' ⬛'
        }
      }
      return `${DM}[${DC}${exit.direction}${doorEmoji}${DM}]${Colors.RESET}`
    }).join(' ')

    const exitLabel = `${EL}Exits:${Colors.RESET} ${exitList}`
    out.push(g('║', 0, row) + ` ${pad(exitLabel, inner)} ` + g('║', W-1, row))
    row++
  }

  out.push(g('╚', 0, row) + hr('═', 1, W-2, row) + g('╝', W-1, row))

  return out.join('\r\n')
}

module.exports = { decorate, wordWrap, visualLength: Colors.visibleLength, DEFAULT_WIDTH }