// bundles/telnet-networking/lib/CommandHistory.js
'use strict';

const MAX_ENTRIES = 100;

/**
 * Per-session in-memory command history with up/down navigation.
 *
 * Navigation model:
 *   - index = -1  means the user is at the live input (not browsing history)
 *   - prev() moves toward older entries (index increases)
 *   - next() moves toward newer entries (index decreases, back to -1)
 *
 * Invariants:
 *   - entries never exceeds MAX_ENTRIES; oldest entry is evicted when full
 *   - empty commands (after trimming) are not stored
 *   - consecutive duplicate commands are not stored
 *   - next() at index -1 returns null (already at live input)
 *   - prev() on empty history returns null
 *   - reset() returns index to -1 without clearing entries
 */
class CommandHistory {
  constructor() {
    this._entries = [];
    this._index = -1;
  }

  /**
   * Records a completed command.
   * Trims whitespace. Ignores empty strings and consecutive duplicates.
   * Evicts the oldest entry if capacity is reached.
   * Always resets the navigation index to -1.
   *
   * @param {string} cmd
   */
  push(cmd) {
    this._index = -1;
    const trimmed = cmd.trim();
    if (!trimmed) return;
    if (this._entries.length > 0 && this._entries[this._entries.length - 1] === trimmed) return;
    if (this._entries.length >= MAX_ENTRIES) {
      this._entries.shift();
    }
    this._entries.push(trimmed);
  }

  /**
   * Moves to the previous (older) entry.
   * Returns the entry string, or null if history is empty.
   *
   * @returns {string|null}
   */
  prev() {
    if (this._entries.length === 0) return null;
    if (this._index < this._entries.length - 1) {
      this._index += 1;
    }
    return this._entries[this._entries.length - 1 - this._index];
  }

  /**
   * Moves to the next (newer) entry.
   * Returns the entry string, or null when back at live input (index -1).
   *
   * @returns {string|null}
   */
  next() {
    if (this._index <= 0) {
      this._index = -1;
      return null;
    }
    this._index -= 1;
    return this._entries[this._entries.length - 1 - this._index];
  }

  /**
   * Resets the navigation index to -1 without clearing entries.
   * Called when the user submits a command or begins typing new input.
   */
  reset() {
    this._index = -1;
  }

  /**
   * Number of stored entries.
   *
   * @returns {number}
   */
  get size() {
    return this._entries.length;
  }
}

module.exports = CommandHistory;
