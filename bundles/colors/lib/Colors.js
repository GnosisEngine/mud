'use strict';

/**
 * Colors.js — Ranvier MUD Color Utility
 *
 * Supports 256-color and 24-bit (truecolor) ANSI terminal codes.
 * Intended to be shared across all bundles via a relative require:
 *
 *   const Colors = require('../../bundle-lib/lib/Colors');
 *
 * Quick Reference
 *
 *  Raw codes:
 *    Colors.rgb(r, g, b)          → 24-bit fg escape (0–255 each)
 *    Colors.bgRgb(r, g, b)        → 24-bit bg escape
 *    Colors.hex('#FF8800')        → hex fg escape
 *    Colors.bgHex('#FF8800')      → hex bg escape
 *    Colors.c256(n)               → 256-color fg (0–255)
 *    Colors.bgC256(n)             → 256-color bg
 *    Colors.RESET / BOLD / DIM …  → raw style codes
 *
 *  Markup parser (returns ANSI-coded string):
 *    Colors.parse('<b>bold</b> <rgb 255,100,0>warm</rgb>')
 *    Colors.parse('<#FF0066>hot pink</# >')
 *    Colors.parse('<bg:#222222>dark bg</bg:#>')
 *    Colors.parse('<256:196>red</256>')
 *
 *    Supported tags:
 *      <b>/<i>/<u>/<s>/<dim>/<blink>/<rev>   (style)
 *      <reset>                                (hard reset, self-closing OK)
 *      <rgb R,G,B>…</rgb>                     (24-bit fg; values 0–255)
 *      <bg:rgb R,G,B>…</bg:rgb>              (24-bit bg)
 *      <#RRGGBB>…</#>                         (hex fg)
 *      <bg:#RRGGBB>…</bg:#>                   (hex bg)
 *      <256:N>…</256>                         (256-color fg)
 *      <bg:256:N>…</bg:256>                   (256-color bg)
 *      <red>…</red>                           (named color fg — any key from Colors.named)
 *      <bg:red>…</bg:red>                     (named color bg)
 *
 *  Bars:
 *    Colors.bar(current, max, width, opts)
 *    Colors.solidBar(width, [r,g,b])
 *    Colors.gradientBar(width, [r,g,b], [r,g,b])
 *
 *  Text gradients:
 *    Colors.gradientText('Hello', [255,0,0], [0,0,255])
 *
 *  Utilities:
 *    Colors.strip(text)              → remove all ANSI codes
 *    Colors.visibleLength(text)      → length without ANSI codes
 *    Colors.center(text, width)
 *    Colors.padLeft(text, width)
 *    Colors.padRight(text, width)
 *    Colors.rule(width, char, rgb)   → horizontal divider line
 *    Colors.hslToRgb(h, s, l)        → [r, g, b]  (h: 0–360, s/l: 0–1)
 *
 *  Named color arrays (pass to rgb/bgRgb/gradientBar etc.):
 *    Colors.named.red  →  [200, 0, 0]
 *    Colors.named.gold →  [255, 215, 0]   …etc.
 */

// Internal Helpers

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const n = parseInt(hex, 16);
  return [(n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF];
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

const ESC = '\x1b[';

// Raw Style Codes

const Codes = {
  RESET:         `${ESC}0m`,
  BOLD:          `${ESC}1m`,
  DIM:           `${ESC}2m`,
  ITALIC:        `${ESC}3m`,
  UNDERLINE:     `${ESC}4m`,
  BLINK:         `${ESC}5m`,
  BLINK_FAST:    `${ESC}6m`,
  REVERSE:       `${ESC}7m`,
  HIDDEN:        `${ESC}8m`,
  STRIKE:        `${ESC}9m`,
  BOLD_OFF:      `${ESC}22m`,
  ITALIC_OFF:    `${ESC}23m`,
  UNDERLINE_OFF: `${ESC}24m`,
  BLINK_OFF:     `${ESC}25m`,
  REVERSE_OFF:   `${ESC}27m`,
  STRIKE_OFF:    `${ESC}29m`,
  FG_DEFAULT:    `${ESC}39m`,
  BG_DEFAULT:    `${ESC}49m`,
};

// Main Export

const Colors = {

  //  Spread raw codes so Colors.RESET, Colors.BOLD etc. work directly

  ...Codes,

  // Color Escape Generators

  /**
   * 24-bit RGB foreground. Values 0–255.
   * @param {number} r @param {number} g @param {number} b
   * @returns {string}
   */
  rgb(r, g, b) {
    return `${ESC}38;2;${r | 0};${g | 0};${b | 0}m`;
  },

  /** 24-bit RGB background. */
  bgRgb(r, g, b) {
    return `${ESC}48;2;${r | 0};${g | 0};${b | 0}m`;
  },

  /**
   * Hex string → 24-bit foreground. Accepts '#RRGGBB', '#RGB', 'RRGGBB'.
   * @param {string} hexStr
   */
  hex(hexStr) {
    return this.rgb(...hexToRgb(hexStr));
  },

  /** Hex string → 24-bit background. */
  bgHex(hexStr) {
    return this.bgRgb(...hexToRgb(hexStr));
  },

  /**
   * 256-color foreground (0–255).
   * @param {number} n
   */
  c256(n) {
    return `${ESC}38;5;${clamp(n | 0, 0, 255)}m`;
  },

  /** 256-color background (0–255). */
  bgC256(n) {
    return `${ESC}48;5;${clamp(n | 0, 0, 255)}m`;
  },

  // Convenience Wrappers

  /**
   * Wrap text in a 24-bit color + reset.
   * @param {string}  text
   * @param {number}  r @param {number} g @param {number} b
   */
  colorize(text, r, g, b) {
    return `${this.rgb(r, g, b)}${text}${Codes.RESET}`;
  },

  /** Wrap text in a hex color + reset. */
  colorizeHex(text, hexStr) {
    return `${this.hex(hexStr)}${text}${Codes.RESET}`;
  },

  // Markup Parser

  /**
   * Parse color/style markup in a string and replace with ANSI escape codes.
   * Opening tags push onto a stack; closing tags pop and replay the stack so
   * nested colors restore correctly.
   *
   * @param {string} text
   * @returns {string} ANSI-coded string
   *
   * @example
   *   Colors.parse('<b><rgb 255,80,0>FIRE!</rgb></b> normal')
   *   Colors.parse('HP: <#00FF88>full</#>')
   */
  parse(text) {
    const self = this;

    // Stack entries: { key: string, code: string }
    // 'key' matches the closing tag name (e.g. 'rgb', 'b', '#', 'bg:#')
    const stack = [];

    function replayStack() {
      if (stack.length === 0) return Codes.RESET;
      return Codes.RESET + stack.map(e => e.code).join('');
    }

    return text.replace(/<([^>]+)>/g, (match, raw) => {
      const tag = raw.trim();

      //  Closing tag
      if (tag.startsWith('/')) {
        const closeKey = tag.slice(1).toLowerCase().trim();

        // Find and remove the most recent matching entry
        let foundIdx = -1;
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].key === closeKey) { foundIdx = i; break; }
        }
        if (foundIdx !== -1) stack.splice(foundIdx, 1);

        return replayStack();
      }

      const lower = tag.toLowerCase();

      //  Hard reset
      if (lower === 'reset') {
        stack.length = 0;
        return Codes.RESET;
      }

      //  Simple style tags
      const styleMap = {
        'b': Codes.BOLD,    'bold': Codes.BOLD,
        'i': Codes.ITALIC,  'italic': Codes.ITALIC,
        'u': Codes.UNDERLINE, 'underline': Codes.UNDERLINE,
        's': Codes.STRIKE,  'strike': Codes.STRIKE,
        'dim': Codes.DIM,
        'blink': Codes.BLINK,
        'rev': Codes.REVERSE, 'reverse': Codes.REVERSE,
      };
      if (styleMap[lower]) {
        stack.push({ key: lower, code: styleMap[lower] });
        return styleMap[lower];
      }

      //  <rgb R,G,B>
      const rgbM = lower.match(/^rgb\s+([\d\s,]+)$/);
      if (rgbM) {
        const parts = rgbM[1].split(',').map(n => clamp(parseInt(n.trim(), 10), 0, 255));
        if (parts.length === 3 && parts.every(n => !isNaN(n))) {
          const code = self.rgb(...parts);
          stack.push({ key: 'rgb', code });
          return code;
        }
      }

      //  <bg:rgb R,G,B>
      const bgRgbM = lower.match(/^bg:rgb\s+([\d\s,]+)$/);
      if (bgRgbM) {
        const parts = bgRgbM[1].split(',').map(n => clamp(parseInt(n.trim(), 10), 0, 255));
        if (parts.length === 3 && parts.every(n => !isNaN(n))) {
          const code = self.bgRgb(...parts);
          stack.push({ key: 'bg:rgb', code });
          return code;
        }
      }

      //  <#RRGGBB>
      const hexM = tag.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
      if (hexM) {
        const code = self.hex(hexM[1]);
        stack.push({ key: '#', code });
        return code;
      }

      //  <bg:#RRGGBB>
      const bgHexM = tag.match(/^bg:#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/i);
      if (bgHexM) {
        const code = self.bgHex(bgHexM[1]);
        stack.push({ key: 'bg:#', code });
        return code;
      }

      //  <256:N>
      const c256M = lower.match(/^256:(\d+)$/);
      if (c256M) {
        const code = self.c256(parseInt(c256M[1], 10));
        stack.push({ key: '256', code });
        return code;
      }

      //  <bg:256:N>
      const bgC256M = lower.match(/^bg:256:(\d+)$/);
      if (bgC256M) {
        const code = self.bgC256(parseInt(bgC256M[1], 10));
        stack.push({ key: 'bg:256', code });
        return code;
      }

      //  <red>, <gold>, <manaBlue> … named fg colors
      // Matches any camelCase or lowercase key found in Colors.named.
      // The tag must match exactly (case-insensitive against the key lowercased).
      const namedKey = Object.keys(self.named).find(k => k.toLowerCase() === lower);
      if (namedKey) {
        const code = self.rgb(...self.named[namedKey]);
        stack.push({ key: lower, code });
        return code;
      }

      //  <bg:red>, <bg:gold> … named bg colors
      if (lower.startsWith('bg:')) {
        const bgNameKey = lower.slice(3);
        const namedBgKey = Object.keys(self.named).find(k => k.toLowerCase() === bgNameKey);
        if (namedBgKey) {
          const code = self.bgRgb(...self.named[namedBgKey]);
          stack.push({ key: lower, code });
          return code;
        }
      }

      // Unknown tag — leave as-is so HTML-like content isn't mangled
      return match;
    });
  },

  // Gradient Text

  /**
   * Apply a color gradient to each character of a string.
   * @param {string}   text
   * @param {number[]} fromRgb  - [r, g, b]
   * @param {number[]} toRgb    - [r, g, b]
   * @returns {string}
   *
   * @example
   *   Colors.gradientText('Rainbow!', [255,0,0], [0,0,255])
   */
  gradientText(text, fromRgb, toRgb) {
    if (!text.length) return '';
    if (text.length === 1) return `${this.rgb(...fromRgb)}${text}${Codes.RESET}`;
    return text.split('').map((char, i) => {
      const t = i / (text.length - 1);
      return `${this.rgb(...lerpColor(fromRgb, toRgb, t))}${char}`;
    }).join('') + Codes.RESET;
  },

  // Bars

  /**
   * Render a solid-color horizontal bar using block characters.
   * @param {number}   width
   * @param {number[]} rgb      - [r, g, b]
   * @param {string}   [char]   - default '█'
   * @returns {string}
   */
  solidBar(width, rgb, char = '█') {
    if (width <= 0) return '';
    return `${this.rgb(...rgb)}${char.repeat(width)}${Codes.RESET}`;
  },

  /**
   * Render a gradient horizontal bar.
   * @param {number}   width
   * @param {number[]} fromRgb
   * @param {number[]} toRgb
   * @param {string}   [char]   - default '█'
   * @returns {string}
   */
  gradientBar(width, fromRgb, toRgb, char = '█') {
    if (width <= 0) return '';
    if (width === 1) return this.solidBar(1, fromRgb, char);
    return Array.from({ length: width }, (_, i) => {
      const t = i / (width - 1);
      return `${this.rgb(...lerpColor(fromRgb, toRgb, t))}${char}`;
    }).join('') + Codes.RESET;
  },

  /**
   * Render a progress/health bar with a filled portion and an empty portion.
   *
   * @param {number} current   - Current value
   * @param {number} max       - Maximum value
   * @param {number} width     - Total character width of the bar
   * @param {object} [opts]
   *
   * @param {number[]} [opts.fillColor]    - Filled fg color.    Default: green
   * @param {number[]} [opts.fillColor2]   - If set, gradient from fillColor → fillColor2
   * @param {number[]} [opts.emptyColor]   - Empty fg color.     Default: dark red
   * @param {string}   [opts.fillChar]     - Fill character.     Default: '█'
   * @param {string}   [opts.emptyChar]    - Empty character.    Default: '░'
   *
   * @param {Array}    [opts.thresholds]   - Color shift at value thresholds.
   *                                         Array of [fraction, [r,g,b]] pairs, evaluated
   *                                         descending. First match at or below current pct wins.
   *                                         e.g. [[0.5, [255,165,0]], [0.25, [255,0,0]]]
   *
   * @param {boolean}  [opts.showText]     - Overlay "current/max" centered in the bar.
   *                                         Uses background color of the bar cell.
   * @param {number[]} [opts.textColor]    - Text color for overlay. Default: white
   *
   * @returns {string}
   *
   * @example
   *   // Simple green/red health bar
   *   Colors.bar(player.health, player.maxHealth, 20)
   *
   *   // With threshold color shifts and text overlay
   *   Colors.bar(hp, maxHp, 20, {
   *     thresholds: [[0.5, [255,165,0]], [0.25, [255,0,0]]],
   *     showText: true,
   *   })
   *
   *   // Gradient fill (full blue → cyan)
   *   Colors.bar(mp, maxMp, 20, {
   *     fillColor:  [30, 80, 255],
   *     fillColor2: [0, 220, 255],
   *   })
   */
  bar(current, max, width, opts = {}) {
    const pct = clamp(max > 0 ? current / max : 0, 0, 1);
    const filledWidth = Math.round(pct * width);
    const emptyWidth  = width - filledWidth;

    // Determine fill color, applying threshold overrides
    let fillColor = opts.fillColor || [0, 200, 60];
    if (opts.thresholds) {
      const sorted = [...opts.thresholds].sort((a, b) => b[0] - a[0]);
      for (const [threshold, color] of sorted) {
        if (pct <= threshold) { fillColor = color; break; }
      }
    }

    const fillColor2  = opts.fillColor2 || null;
    const emptyColor  = opts.emptyColor || [80, 20, 20];
    const fillChar    = opts.fillChar   || '█';
    const emptyChar   = opts.emptyChar  || '░';

    if (!opts.showText) {
      // Simple render: two solid/gradient chunks
      let filled = '';
      if (filledWidth > 0) {
        filled = fillColor2
          ? this.gradientBar(filledWidth, fillColor, fillColor2, fillChar)
          : this.solidBar(filledWidth, fillColor, fillChar);
      }
      const empty = emptyWidth > 0 ? this.solidBar(emptyWidth, emptyColor, emptyChar) : '';
      return filled + empty;
    }

    // Text overlay: render char-by-char, placing label centered in the bar
    const label      = `${current}/${max}`;
    const labelStart = Math.floor((width - label.length) / 2);
    const textColor  = opts.textColor || [255, 255, 255];

    let result = '';
    for (let i = 0; i < width; i++) {
      const isFilled  = i < filledWidth;
      const barColor  = isFilled ? fillColor : emptyColor;
      const barChar   = isFilled ? fillChar  : emptyChar;

      // Gradient fill color at this position
      let cellFillColor = barColor;
      if (isFilled && fillColor2 && filledWidth > 1) {
        const t = i / (filledWidth - 1);
        cellFillColor = lerpColor(fillColor, fillColor2, t);
      }

      const inLabel = label.length <= width &&
                      i >= labelStart &&
                      i < labelStart + label.length;

      if (inLabel) {
        const ch = label[i - labelStart];
        // White label character over bar's background color
        result += `${this.bgRgb(...cellFillColor)}${this.rgb(...textColor)}${ch}`;
      } else {
        result += `${this.rgb(...cellFillColor)}${barChar}`;
      }
    }
    return result + Codes.RESET;
  },

  // Utilities

  /**
   * Strip all ANSI escape codes from a string.
   * Useful for measuring visible length, logging, or sending to non-color clients.
   * @param {string} text
   * @returns {string}
   */
  strip(text) {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  },

  /**
   * Visible character length of a string (excludes ANSI codes).
   * @param {string} text
   * @returns {number}
   */
  visibleLength(text) {
    return this.strip(text).length;
  },

  /**
   * Center text within a fixed width, optionally with a colored pad character.
   * @param {string}   text
   * @param {number}   width
   * @param {string}   [padChar=' ']
   * @param {number[]} [padColor]    - [r, g, b] for the padding. null = no color
   * @returns {string}
   */
  center(text, width, padChar = ' ', padColor = null) {
    const visible  = this.visibleLength(text);
    const total    = Math.max(0, width - visible);
    const left     = Math.floor(total / 2);
    const right    = total - left;
    const makePad  = (n) => {
      if (!n) return '';
      const s = padChar.repeat(n);
      return padColor ? `${this.rgb(...padColor)}${s}${Codes.RESET}` : s;
    };
    return makePad(left) + text + makePad(right);
  },

  /**
   * Left-pad text (pad on the left) to a given visible width.
   * @param {string} text  @param {number} width  @param {string} [padChar=' ']
   */
  padLeft(text, width, padChar = ' ') {
    const n = Math.max(0, width - this.visibleLength(text));
    return padChar.repeat(n) + text;
  },

  /**
   * Right-pad text to a given visible width.
   */
  padRight(text, width, padChar = ' ') {
    const n = Math.max(0, width - this.visibleLength(text));
    return text + padChar.repeat(n);
  },

  /**
   * Render a horizontal rule line.
   * @param {number}   width
   * @param {string}   [char='─']    - Box-drawing char, '─', '═', '~', '-', etc.
   * @param {number[]} [rgb]         - Color, or null for no color
   * @returns {string}
   *
   * @example
   *   Colors.rule(60, '═', Colors.named.gold)
   *   Colors.rule(60, '─', [100, 100, 100])
   */
  rule(width, char = '─', rgb = null) {
    const line = char.repeat(width);
    return rgb ? `${this.rgb(...rgb)}${line}${Codes.RESET}` : line;
  },

  /**
   * Convert HSL to RGB. Useful for hue-cycling effects.
   * @param {number} h  - Hue, 0–360
   * @param {number} s  - Saturation, 0–1
   * @param {number} l  - Lightness, 0–1
   * @returns {number[]} [r, g, b] each 0–255
   *
   * @example
   *   // Cycle through hues
   *   for (let h = 0; h < 360; h += 10) {
   *     process.stdout.write(Colors.rgb(...Colors.hslToRgb(h, 1, 0.5)) + '█');
   *   }
   */
  hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const c  = (1 - Math.abs(2 * l - 1)) * s;
    const x  = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m  = l - c / 2;
    let r = 0, g = 0, b = 0;
    if      (h < 60)  { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else              { r = c; g = 0; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  },

  /**
   * Rainbow gradient bar — cycles full hue spectrum across the width.
   * @param {number} width
   * @param {string} [char='█']
   * @param {number} [saturation=1]
   * @param {number} [lightness=0.5]
   */
  rainbowBar(width, char = '█', saturation = 1, lightness = 0.5) {
    if (width <= 0) return '';
    return Array.from({ length: width }, (_, i) => {
      const hue = (i / width) * 360;
      return `${this.rgb(...this.hslToRgb(hue, saturation, lightness))}${char}`;
    }).join('') + Codes.RESET;
  },

  // Named Colors

  /**
   * Preset [r, g, b] arrays for common colors.
   * Pass these directly to rgb(), bgRgb(), gradientBar(), bar(), etc.
   *
   * @example
   *   Colors.rgb(...Colors.named.gold)
   *   Colors.gradientBar(20, Colors.named.red, Colors.named.orange)
   */
  named: {
    // Neutrals
    black:        [0,   0,   0],
    darkGray:     [50,  50,  50],
    gray:         [128, 128, 128],
    silver:       [192, 192, 192],
    white:        [255, 255, 255],
    // Reds
    darkRed:      [128, 0,   0],
    red:          [200, 0,   0],
    brightRed:    [255, 60,  60],
    crimson:      [220, 20,  60],
    // Oranges / Yellows
    orange:       [255, 140, 0],
    gold:         [255, 215, 0],
    yellow:       [200, 200, 0],
    brightYellow: [255, 255, 60],
    // Greens
    darkGreen:    [0,   100, 0],
    green:        [0,   200, 60],
    brightGreen:  [60,  255, 100],
    lime:         [120, 255, 0],
    // Cyans
    teal:         [0,   128, 128],
    cyan:         [0,   200, 200],
    brightCyan:   [60,  255, 255],
    // Blues
    navy:         [0,   0,   128],
    blue:         [30,  100, 220],
    brightBlue:   [80,  150, 255],
    sky:          [100, 180, 255],
    // Purples / Pinks
    purple:       [128, 0,   128],
    violet:       [148, 0,   211],
    magenta:      [180, 0,   180],
    pink:         [255, 100, 180],
    hotPink:      [255, 20,  147],
    // MUD staples
    bloodRed:     [180, 0,   0],
    manaBlue:     [30,  80,  255],
    staminaGreen: [0,   180, 80],
    xpPurple:     [160, 0,   255],
  },

};

module.exports = Colors;
