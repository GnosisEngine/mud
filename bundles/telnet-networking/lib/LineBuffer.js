// bundles/telnet-networking/lib/LineBuffer.js
'use strict';

const DEFAULT_MAX_LENGTH = 512;

/**
 * Manages the in-progress line being assembled from raw keystrokes.
 *
 * Invariants:
 *   - _chars never exceeds the configured max length
 *   - backspace() on an empty buffer is a no-op
 *   - get() always returns a string (never null or undefined)
 */
class LineBuffer {
  /**
   * @param {number} [maxLength]  Maximum characters the line may hold.
   */
  constructor(maxLength = DEFAULT_MAX_LENGTH) {
    this._chars = [];
    this._maxLength = maxLength;
  }

  /**
   * Appends a single character to the buffer.
   * Silently drops the character if the max length is already reached.
   *
   * @param {string} char  — single character
   * @returns {boolean} true if the character was added, false if dropped (full)
   */
  append(char) {
    if (this._chars.length >= this._maxLength) return false;
    this._chars.push(char);
    return true;
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
   * Truncates to the max length if the string is longer.
   *
   * @param {string} str
   */
  set(str) {
    this._chars = str.slice(0, this._maxLength).split('');
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