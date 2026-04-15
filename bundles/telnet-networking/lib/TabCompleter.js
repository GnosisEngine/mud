// bundles/telnet-networking/lib/TabCompleter.js
'use strict';

const { SUBCOMMANDS } = require('./SubcommandRegistry');

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

/**
 * Resolves a typed command word to a Command object, trying exact match
 * first then prefix match. Returns null if nothing resolves.
 *
 * @param {object} state
 * @param {string} cmdInput  — already lowercased
 * @returns {object|null}
 */
function _resolveCommand(state, cmdInput) {
  const exact = state.CommandManager.get(cmdInput);
  if (exact) return exact;

  const found = state.CommandManager.find(cmdInput, /* returnAlias */ true);
  return found ? found.command : null;
}

/**
 * Collects subcommand names for a resolved command that start with partial.
 * Looks up subcommands via SubcommandRegistry using the command's canonical
 * name — Ranvier's Command class does not preserve arbitrary extra properties
 * from module exports, so the registry is the authoritative data source.
 *
 * @param {object} state
 * @param {string} cmdInput  — already lowercased
 * @param {string} partial   — already lowercased; empty string matches all
 * @returns {string[]}       — sorted
 */
function _completeSubcommand(state, cmdInput, partial) {
  const command = _resolveCommand(state, cmdInput);
  if (!command) return [];

  const subcommands = SUBCOMMANDS.get(command.name);
  if (!subcommands || subcommands.length === 0) return [];

  return subcommands
    .filter(sub => sub.startsWith(partial))
    .sort();
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
  if (!input) return [];

  const spaceCount = (input.match(/ /g) || []).length;

  if (spaceCount === 0) {
    if (!input.trim()) return [];
    return _completeFirstWord(state, player, input.toLowerCase());
  }

  if (spaceCount === 1) {
    const spaceIdx = input.indexOf(' ');
    const cmdPart  = input.slice(0, spaceIdx).toLowerCase();
    const subPart  = input.slice(spaceIdx + 1).toLowerCase();
    return _completeSubcommand(state, cmdPart, subPart);
  }

  // Two or more spaces — argument territory
  return [];
}

module.exports = { complete };
