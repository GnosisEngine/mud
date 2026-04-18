'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

const { Broadcast: B } = require('ranvier');

const R = '\x1b[0m';

function rgb(r, g, b)  { return `\x1b[38;2;${r};${g};${b}m`; }
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function borderColor(col, row, totalCols, totalRows) {
  const tx = col / Math.max(1, totalCols - 1);
  const ty = (totalRows - 1 - row) / Math.max(1, totalRows - 1);
  const t  = (tx + ty) / 2;
  return rgb(lerp(80, 255, t), lerp(45, 215, t), 0);
}

function gc(char, col, row, W, H) { return `${borderColor(col, row, W, H)}${char}${R}`; }

function hrun(char, c1, c2, row, W, H) {
  let s = '';
  for (let c = c1; c <= c2; c++) s += gc(char, c, row, W, H);
  return s;
}

function gradientTitle(text) {
  return [...text].map((char, i, arr) => {
    const t = arr.length === 1 ? 1 : i / (arr.length - 1);
    return `${rgb(lerp(40, 130, t), lerp(195, 255, t), lerp(170, 220, t))}${char}`;
  }).join('') + R;
}

const T_PLAYER   = '🧍';
const T_ROOM     = '🔸';
const T_UP       = '🔼';
const T_DOWN     = '🔽';
const T_BOTH     = '↕️ ';
const T_EMPTY    = '  ';

const WP_CHARS   = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const C_WP_CHAR  = rgb(255, 230,  80);   // bright gold — waypoint char on map
const C_WP_LABEL = rgb(255, 215,   0);   // gold — waypoint label in list
const C_MUTE     = rgb(120, 120, 100);

/** @type {Array<[string, string, number]>} */
const LEGEND = [
  [T_PLAYER, 'you',      2],  // emoji = 2 cols
  [T_ROOM,   'room',     2],
  [T_UP,     'up exit',  2],
  [T_DOWN,   'dn exit',  2],
  [T_BOTH,   'up+dn',    2],
];

const LEGEND_VISUAL_WIDTH = LEGEND.reduce((acc, [, label, w], i) =>
  acc + w + label.length + (i < LEGEND.length - 1 ? 2 : 0), 0);

const AREA_PAREN = rgb( 80, 110, 220);
const AREA_NAME  = rgb(130, 165, 255);
const MIN_RIGHT  = 2;
const MIN_WIDTH  = 20;

function areaTag(name) {
  return `${AREA_PAREN}(${AREA_NAME} ${name} ${AREA_PAREN})${R}`;
}

module.exports = {
  usage: 'map [size]',

  /**
   * @param {GameState} _
   * @returns {function(string, RanvierPlayer): void}
   */
  command: (_) => (args, player) => {
    const room = player.room;
    if (!room || !room.coordinates) {
      return B.sayAt(player, `${rgb(200,80,80)}You can't see a map from here.${R}`);
    }

    let size = parseInt(args, 10);
    size = isNaN(size) ? 4 : size - (size % 2);
    if (!size || size > 14) size = 4;

    let xSize = Math.ceil(size * 2);
    xSize = Math.max(2, xSize - (xSize % 2));

    const coords    = room.coordinates;
    const areaName  = room.area ? room.area.title : null;
    const titleText = room.title || 'Unknown';

    const allWaypoints  = (player.metadata && player.metadata.waypoints) || [];
    const zoneWaypoints = allWaypoints
      .filter(w => w.areaId === room.area.name && w.coordinates.z === coords.z)
      .slice(0, WP_CHARS.length);

    // lookup: "x,y" → waypoint index (0-based into WP_CHARS)
    const wpLookup = {};
    zoneWaypoints.forEach((w, i) => {
      wpLookup[`${w.coordinates.x},${w.coordinates.y}`] = i;
    });

    // width contestants
    const W_map    = (xSize * 2 + 1) * 2 + 3;
    const W_title  = titleText.length + 4;
    const W_area   = areaName ? 1 + 1 + (areaName.length + 4) + MIN_RIGHT + 1 : 0;
    const W_legend = LEGEND_VISUAL_WIDTH + 4;
    // W_wplist: ║ + space + char + dot + space + label + space + ║ = label + 7
    const W_wplist = zoneWaypoints.length
      ? Math.max(...zoneWaypoints.map(w => w.label.length + 7))
      : 0;

    const W = Math.max(W_map, W_title, W_area, W_legend, W_wplist, MIN_WIDTH);

    const mapRows   = size * 2 + 1;
    const totalRows = mapRows + 5 + (zoneWaypoints.length ? zoneWaypoints.length + 1 : 0);

    const lines = [];
    let row = 0;

    // top border
    if (areaName) {
      const tagVisualLen = areaName.length + 4;
      const leftDashes   = Math.max(1, W - 2 - tagVisualLen - MIN_RIGHT);
      const tagStart     = leftDashes + 1;
      const rightStart   = tagStart + tagVisualLen;
      const rightEnd     = W - 2;
      lines.push(
        gc('╔', 0, row, W, totalRows) +
        hrun('═', 1, leftDashes, row, W, totalRows) +
        areaTag(areaName) +
        hrun('═', rightStart, rightEnd, row, W, totalRows) +
        gc('╗', W - 1, row, W, totalRows)
      );
    } else {
      lines.push(gc('╔', 0, row, W, totalRows) + hrun('═', 1, W - 2, row, W, totalRows) + gc('╗', W - 1, row, W, totalRows));
    }
    row++;

    // title
    const titleStyled = gradientTitle(titleText);
    const titleW      = W - 2;
    const titlePad    = Math.max(0, titleW - titleText.length);
    const padL        = Math.floor(titlePad / 2);
    const padR        = titlePad - padL;
    lines.push(gc('║', 0, row, W, totalRows) + ' '.repeat(padL) + titleStyled + ' '.repeat(padR) + gc('║', W - 1, row, W, totalRows));
    row++;

    // gem separator
    const totalDashes = W - 3;
    const gemL = Math.floor(totalDashes / 2);
    const gemR = totalDashes - gemL;
    lines.push(
      gc('╠', 0, row, W, totalRows) +
      hrun('═', 1, gemL, row, W, totalRows) +
      `${rgb(255, 210, 40)}◆${R}` +
      hrun('═', gemL + 2, gemL + 1 + gemR, row, W, totalRows) +
      gc('╣', W - 1, row, W, totalRows)
    );
    row++;

    // map rows — every tile is exactly 2 cols
    // emoji tiles: double-width glyph (no trailing space needed)
    // waypoint/empty tiles: single char + space = 2 cols
    const tileWidth = (xSize * 2 + 1) * 2;
    const innerW    = W - 2;
    const rowPad    = innerW - 1 - tileWidth;   // 1 = leading space after ║

    for (let y = coords.y + size; y >= coords.y - size; y--) {
      let line = gc('║', 0, row, W, totalRows) + ' ';
      for (let x = coords.x - xSize; x <= coords.x + xSize; x++) {
        const wpIdx = wpLookup[`${x},${y}`];
        if (x === coords.x && y === coords.y) {
          line += T_PLAYER;
        } else if (wpIdx !== undefined) {
          // char + dot = 2 cols, matching emoji tile width exactly
          line += `${C_WP_CHAR}${WP_CHARS[wpIdx]}.${R}`;
        } else if (room.area.getRoomAtCoordinates(x, y, coords.z)) {
          const hasUp   = room.area.getRoomAtCoordinates(x, y, coords.z + 1);
          const hasDown = room.area.getRoomAtCoordinates(x, y, coords.z - 1);
          if (hasUp && hasDown)  line += T_BOTH;
          else if (hasUp)        line += T_UP;
          else if (hasDown)      line += T_DOWN;
          else                   line += T_ROOM;
        } else {
          line += T_EMPTY;
        }
      }
      line += ' '.repeat(Math.max(0, rowPad)) + gc('║', W - 1, row, W, totalRows);
      lines.push(line);
      row++;
    }

    // legend divider + row
    lines.push(gc('╠', 0, row, W, totalRows) + hrun('─', 1, W - 2, row, W, totalRows) + gc('╣', W - 1, row, W, totalRows));
    row++;

    const legendStr = LEGEND.map(([sym, label, w]) =>
      w === 1
        ? `${C_WP_CHAR}${sym}${R}${C_MUTE}${label}${R}`
        : `${sym}${C_MUTE}${label}${R}`
    ).join('  ');
    const legendPad = W - 2 - LEGEND_VISUAL_WIDTH - 2;
    lines.push(
      gc('║', 0, row, W, totalRows) +
      ' ' + legendStr + ' '.repeat(Math.max(1, legendPad)) +
      gc('║', W - 1, row, W, totalRows)
    );
    row++;

    // waypoint list
    if (zoneWaypoints.length) {
      lines.push(gc('╠', 0, row, W, totalRows) + hrun('─', 1, W - 2, row, W, totalRows) + gc('╣', W - 1, row, W, totalRows));
      row++;

      for (let i = 0; i < zoneWaypoints.length; i++) {
        const wp      = zoneWaypoints[i];
        const char    = WP_CHARS[i];
        const content = `${C_WP_CHAR}${char}.${R} ${C_WP_LABEL}${wp.label}${R}`;
        const visLen  = 1 + 1 + 1 + wp.label.length;   // char + dot + space + label
        const pad     = W - 3 - visLen;                 // W - ║ - leading space - trailing ║
        lines.push(
          gc('║', 0, row, W, totalRows) +
          ' ' + content + ' '.repeat(Math.max(1, pad)) +
          gc('║', W - 1, row, W, totalRows)
        );
        row++;
      }
    }

    // bottom
    lines.push(gc('╚', 0, row, W, totalRows) + hrun('═', 1, W - 2, row, W, totalRows) + gc('╝', W - 1, row, W, totalRows));

    B.sayAt(player, lines.join('\r\n'));
  }
};
