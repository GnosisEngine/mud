// bundles/telnet-networking/lib/LineBuffer.js
'use strict';

const MAX_LENGTH = 1024;

/**
 * Manages the in-progress line being assembled from raw keystrokes.
 *
 * Invariants:
 *   - _chars never exceeds MAX_LENGTH entries
 *   - backspace() on an empty buffer is a no-op
 *   - get() always returns a string (never null or undefined)
 */
class LineBuffer {
  constructor() {
    this._chars = [];
  }

  /**
   * Appends a single character to the buffer.
   * Silently drops the character if MAX_LENGTH is already reached.
   *
   * @param {string} char  — single character
   */
  append(char) {
    if (this._chars.length >= MAX_LENGTH) return;
    this._chars.push(char);
  }

  /**
   * Removes the last character from the buffer.
   * No-op if the buffer is empty.
   */
  backspace() {
    this._chars.pop();
  }

  /**
   * Replaces the entire buffer contents with the given string.
   * Truncates to MAX_LENGTH if the string is longer.
   *
   * @param {string} str
   */
  set(str) {
    this._chars = str.slice(0, MAX_LENGTH).split('');
  }

  /**
   * Clears the buffer.
   */
  clear() {
    this._chars = [];
  }

  /**
   * Returns the current buffer contents as a string.
   *
   * @returns {string}
   */
  get() {
    return this._chars.join('');
  }

  /**
   * Current number of characters in the buffer.
   *
   * @returns {number}
   */
  get length() {
    return this._chars.length;
  }
}

module.exports = LineBuffer;
