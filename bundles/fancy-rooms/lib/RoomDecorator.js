'use strict'

const DEFAULT_WIDTH = 72

function visualLength(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length
}

function pad(str, width) {
  const len = visualLength(str)
  return str + ' '.repeat(Math.max(0, width - len))
}

function wordWrap(text, width) {
  const words = text.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (visualLength(test) > width) {
      if (current) lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t)
}

function rgb(r, g, b) {
  return `\x1b[38;2;${r};${g};${b}m`
}

function borderColor(col, row, totalCols, totalRows) {
  const tx = col / (totalCols - 1)
  const ty = (totalRows - 1 - row) / (totalRows - 1)
  const t  = (tx + ty) / 2
  return rgb(lerp(80, 255, t), lerp(45, 215, t), 0)
}

function gc(char, col, row, W, H) {
  return `${borderColor(col, row, W, H)}${char}\x1b[0m`
}

function hrun(char, c1, c2, row, W, H) {
  let s = ''
  for (let c = c1; c <= c2; c++) s += gc(char, c, row, W, H)
  return s
}

// seafoam/mint gradient — triadic complement to gold border + periwinkle area name
function gradientTitle(text) {
  return [...text].map((char, i, arr) => {
    const t = arr.length === 1 ? 1 : i / (arr.length - 1)
    const r = lerp(40,  130, t)
    const g = lerp(195, 255, t)
    const b = lerp(170, 220, t)
    return `${rgb(r, g, b)}${char}`
  }).join('') + '\x1b[0m'
}

function shimmerText(text) {
  return [...text].map(char => {
    if (char === ' ') return char
    const v = Math.floor(Math.random() * 56) - 28
    const r = Math.min(255, Math.max(0, 240 + v))
    const g = Math.min(255, Math.max(0, 234 + Math.floor(v * 0.9)))
    const b = Math.min(255, Math.max(0, 214 + Math.floor(v * 0.7)))
    return `${rgb(r, g, b)}${char}`
  }).join('') + '\x1b[0m'
}

const AREA_PAREN = rgb(80,  110, 220)
const AREA_NAME  = rgb(130, 165, 255)

function areaTag(name) {
  return `${AREA_PAREN}(${AREA_NAME} ${name} ${AREA_PAREN})\x1b[0m`
}

function decorate(room, width = DEFAULT_WIDTH) {
  const R  = '\x1b[0m'
  const EL = '\x1b[38;2;150;140;80m'
  const DM = '\x1b[38;2;160;40;70m'    // deep rose — brackets
  const DC = '\x1b[38;2;255;100;130m'  // bright coral rose — exit names

  const inner  = width - 4
  const titleW = width - 2

  const titleRaw  = room.title || 'Unknown'
  const areaName  = room.area ? room.area.title : null
  const descLines = wordWrap(room.description || '', inner)
  const exits = Array.isArray(room.exits) ? room.exits.map(e => e.direction).sort() : []

  const totalRows = 4 + descLines.length + (exits.length ? 2 : 0)
  const W = width

  const g  = (char, col, row) => gc(char, col, row, W, totalRows)
  const hr = (char, c1, c2, row) => hrun(char, c1, c2, row, W, totalRows)

  const out = []
  let row = 0

  // top border
  if (areaName) {
    const tagVisualLen = areaName.length + 4   // ( + space + name + space + )
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
  const titlePad    = Math.max(0, titleW - visualLength(titleRaw))
  const padL        = Math.floor(titlePad / 2)
  const padR        = titlePad - padL
  out.push(g('║', 0, row) + ' '.repeat(padL) + titleStyled + ' '.repeat(padR) + g('║', W-1, row))
  row++

  // gem separator
  const totalDashes = W - 3
  const gemL        = Math.floor(totalDashes / 2)
  const gemR        = totalDashes - gemL
  const gemC        = rgb(255, 210, 40)
  out.push(
    g('╠', 0, row) +
    hr('═', 1, gemL, row) +
    `${gemC}◆${R}` +
    hr('═', gemL + 2, gemL + 1 + gemR, row) +
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
    const exitList  = exits.map(e => `${DM}[${DC}${e}${DM}]${R}`).join(' ')
    const exitLabel = `${EL}Exits:${R} ${exitList}`
    out.push(g('║', 0, row) + ` ${pad(exitLabel, inner)} ` + g('║', W-1, row))
    row++
  }

  // bottom border
  out.push(g('╚', 0, row) + hr('═', 1, W-2, row) + g('╝', W-1, row))

  return out.join('\r\n')
}

module.exports = { decorate, wordWrap, visualLength, DEFAULT_WIDTH }