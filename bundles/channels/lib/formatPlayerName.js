// bundles/channels/lib/formatPlayerName.js
'use strict';

/**
 * Bold + colorize a player name for display, e.g. in 'channel recap' output.
 *
 * @param {string} name
 * @returns {string}
 */
function formatPlayerName(name) {
  return `<bold><cyan>${name}</cyan></bold>`;
}

module.exports = formatPlayerName;
