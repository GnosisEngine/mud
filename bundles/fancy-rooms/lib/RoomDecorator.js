'use strict'

// bundles/fancy-rooms/lib/RoomDecorator.js

const Colors = require('../../colors/lib/Colors')

const DEFAULT_WIDTH = 72

// Colors.visibleLength strips ANSI and returns the JS UTF-16 code-unit count.
// Supplementary-plane emoji (U+1F000+) are surrogate pairs so .length === 2,
// which already equals their 2-cell terminal width — no correction needed.
// Some BMP characters are also 2 cells wide but have .length === 1; those need
// an explicit +1 each. The set below covers the ranges we actually use plus the
// most common wide-symbol blocks so future additions don't silently break layout.
function bmpWideBonus(str) {
  const plain = str.replace(/\x1b\[[0-9;]*m/g, '')
  let bonus = 0
  for (const ch of plain) {
    const cp = ch.codePointAt(0)
    if (cp > 0xFFFF) continue // surrogate pair — already correct
    if (
      (cp >= 0x1100 && cp <= 0x115F) || // Hangul Jamo
      (cp >= 0x2E80 && cp <= 0x303E) || // CJK Radicals / Kangxi / punctuation
      (cp >= 0x3040 && cp <= 0x33FF) || // Hiragana … CJK Compatibility
      (cp >= 0x3400 && cp <= 0x4DBF) || // CJK Unified Ext-A
      (cp >= 0x4E00 && cp <= 0x9FFF) || // CJK Unified
      (cp >= 0xAC00 && cp <= 0xD7AF) || // Hangul Syllables
      (cp >= 0xF900 && cp <= 0xFAFF) || // CJK Compatibility Ideographs
      (cp >= 0xFE10 && cp <= 0xFE19) || // Vertical forms
      (cp >= 0xFE30 && cp <= 0xFE6F) || // CJK Compatibility Forms
      (cp >= 0xFF01 && cp <= 0xFF60) || // Fullwidth Latin / punctuation
      (cp >= 0xFFE0 && cp <= 0xFFE6) || // Fullwidth signs
      cp === 0x2B1B || cp === 0x2B1C    // ⬛ ⬜  (Misc Symbols & Arrows)
    ) bonus++
  }
  return bonus
}

function pad(str, width) {
  const len = Colors.visibleLength(str) + bmpWideBonus(str)
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
  const parts = text.split(/(\x1b\[[0-9;]*m)/)
  let inMarkupColor = false
  return parts.map(part => {
    if (part.startsWith('\x1b')) {
      const code = part.slice(2, -1)
      if (code === '0' || code === '39') {
        inMarkupColor = false
      } else if (/^(3[0-7]|9[0-7]|38)/.test(code)) {
        inMarkupColor = true
      }
      return part
    }
    if (inMarkupColor) return part
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

// Returns the time bar string from TimeService, or null if unavailable/suppressed.
// getTimePosition() is expected to return a pre-formatted string like "[ ☀️ • • 🌖 ]".
// Emoji widths work out correctly via Colors.visibleLength because moon emojis are
// surrogate pairs (JS .length === 2, terminal width === 2) and ☀️ is two code units.
function resolveTimeBar(state, room) {
  if (!state || !state.TimeService) return null

  const keywords = Array.isArray(room.keywords) ? room.keywords : []
  const suppressed = keywords.some(k => /^no.?time$/i.test(k.trim()))
  if (suppressed) return null

  const pos = state.TimeService.getTimePosition()
  return typeof pos === 'string' ? pos : null
}

// waypointLabel: string if this room is a saved waypoint, null otherwise
// state: Ranvier state object (optional) — used for door emoji resolution and time display
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

  const exits = (typeof room.getExits === 'function'
    ? room.getExits()
    : Array.isArray(room.exits)
      ? room.exits
      : []).sort()

  const totalRows = 4 + descLines.length + (exits.length ? 2 : 0)
  const W = width

  const g  = (char, col, row) => gc(char, col, row, W, totalRows)
  const hr = (char, c1, c2, row) => hrun(char, c1, c2, row, W, totalRows)

  const timeBar    = resolveTimeBar(state, room)
  const tbw        = timeBar ? Colors.visibleLength(timeBar) : 0
  // time bar is inset 3 dashes from the corner: ╔═══[ ... ]═══...═╗
  // bar occupies columns TB_INDENT+1 through TB_INDENT+tbw, so first free col is TB_INDENT+1+tbw
  const TB_INDENT  = 3
  const tbEnd      = TB_INDENT + 1 + tbw

  const out = []
  let row = 0

  // top border
  if (areaName) {
    const tagVisualLen = areaName.length + 4
    const MIN_RIGHT    = 5
    // left dashes = TB_INDENT (before bar) + bar + gap dashes up to tag
    // total left budget consumed by bar region: TB_INDENT + tbw
    const leftDashes   = Math.max(1, W - 2 - (timeBar ? tbEnd : 0) - tagVisualLen - MIN_RIGHT)
    const midStart     = timeBar ? tbEnd : 1
    const midEnd       = midStart + leftDashes - 1
    const tagStart     = midEnd + 1
    const rightStart   = tagStart + tagVisualLen
    const rightEnd     = W - 2
    out.push(
      g('╔', 0, row) +
      (timeBar ? hr('═', 1, TB_INDENT, row) + timeBar : '') +
      hr('═', midStart, midEnd, row) +
      areaTag(areaName) +
      hr('═', rightStart, rightEnd, row) +
      g('╗', W-1, row)
    )
  } else if (timeBar) {
    out.push(
      g('╔', 0, row) +
      hr('═', 1, TB_INDENT, row) +
      timeBar +
      hr('═', tbEnd, W-2, row) +
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