// bundles/storage/lib/jsonLinesCodec.js
'use strict';

/**
 * Default codec for CompactableLog: one JSON object per line, of the shape
 * { opcode, data }. Stores with their own compact binary/text formats (e.g.
 * claims' opcode codec) pass their own { encode, decode } instead.
 */
const jsonLinesCodec = {
  /**
   * @param {string} opcode
   * @param {object} data
   * @returns {string} line with trailing newline, ready to append
   */
  encode(opcode, data) {
    return JSON.stringify({ opcode, data }) + '\n';
  },

  /**
   * @param {string} line raw line, may have trailing newline
   * @returns {{ opcode: string, data: object } | null}
   */
  decode(line) {
    const trimmed = line.trim();
    if (!trimmed) {
      return null;
    }
    return JSON.parse(trimmed);
  },
};

module.exports = jsonLinesCodec;
