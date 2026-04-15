// bundles/telnet-networking/lib/SubcommandRegistry.js
'use strict';

// Maps canonical command names to their sorted subcommand arrays.
//
// Ranvier's Command class does not carry arbitrary extra properties from the
// module export, so subcommand lists cannot be read from the Command instance
// at runtime. This registry is the single authoritative source for tab
// completion purposes.
//
// Convention: command files also declare a `subcommands` array on their
// module.exports for in-source documentation, but only this registry is
// consulted by the completer.
//
// To register a new command's subcommands: add an entry here, keeping the
// subcommand array sorted alphabetically.

const SUBCOMMANDS = new Map([
  ['craft',  ['create', 'list']],
  ['group',  ['create', 'decline', 'disband', 'invite', 'join', 'leave', 'list']],
  ['quest',  ['complete', 'list', 'log', 'start']],
  ['shop',   ['buy', 'list', 'sell', 'value']],
]);

module.exports = { SUBCOMMANDS };
