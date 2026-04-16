// bundles/telnet-networking/lib/TabCompleter.js
'use strict';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Collects all command/channel/direction names that start with prefix.
 *
 * @param {object} state
 * @param {object} player
 * @param {string} prefix  — already lowercased
 * @returns {string[]}     — sorted, deduplicated
 */
function _completeFirstWord(state, player, prefix) {
  const matches = new Set();

  // Commands — the Map contains both canonical names and aliases as keys
  for (const name of state.CommandManager.commands.keys()) {
    if (name.startsWith(prefix)) matches.add(name);
  }

  // Channels
  for (const name of state.ChannelManager.channels.keys()) {
    if (name.startsWith(prefix)) matches.add(name);
  }

  // Available exits — only suggest directions the player can actually go
  if (player.room) {
    for (const exit of player.room.getExits()) {
      if (exit.direction.startsWith(prefix)) matches.add(exit.direction);
    }
  }

  return [...matches].sort();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns completion candidates for the current buffer contents.
 *
 * Rules:
 *   - Empty or whitespace-only buffer → []
 *   - No space in buffer → first-word completion (commands, channels, exits)
 *   - Exactly one space → subcommand completion for the word before the space
 *   - Two or more spaces → [] (argument territory, not handled here)
 *
 * @param {object} state   — Ranvier GameState
 * @param {object} player  — Player instance
 * @param {string} input   — current buffer contents (not trimmed)
 * @returns {string[]}     — sorted completion candidates
 */
function complete(state, player, input) {
  const hints = state.ContextService.run({ state, player, input });

  if (hints.length > 0) {
    return hints;
  }

  if (!input) return [];

  // @TODO probably have to get rid of all of this
  const spaceCount = (input.match(/ /g) || []).length;

  if (spaceCount === 0) {
    if (!input.trim()) return [];
    return _completeFirstWord(state, player, input.toLowerCase());
  }

  // Two or more spaces — argument territory
  return [];
}

module.exports = { complete };
