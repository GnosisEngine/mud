// bundles/channels/commands/channel.js
'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */

const { Broadcast } = require('ranvier');
const Parser = require('../../lib/lib/ArgParser');
const { isAdmin } = require('../../lib/logic');
const { buildDynamicChannel } = require('../lib/buildDynamicChannel');
const formatPlayerName = require('../lib/formatPlayerName');
const {
  isValidChannelName,
  isChannelNameAvailable,
  isDynamicChannel,
  isChannelMember,
  isChannelPersistent,
} = require('../logic');

module.exports = {
  usage: 'channel create|join|invite|leave|list|recap [name|player] [password|name] [persistent]',

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (args, player) => {
    const parts = args.trim().split(/\s+/);
    const sub = parts[0];

    switch (sub) {
      case 'create': {
        if (!isAdmin(state, player)) {
          return Broadcast.sayAt(player, 'You do not have permission to use this command.');
        }

        const [, rawName, password, persistentFlag] = parts;
        const name = rawName ? rawName.toLowerCase() : '';
        const persistent = (persistentFlag || '').toLowerCase() === 'persistent';

        if (!name || !password) {
          return Broadcast.sayAt(player, 'Usage: channel create <name> <password> [persistent]');
        }

        if (!isValidChannelName(state, player, { name })) {
          return Broadcast.sayAt(player, 'Channel names must be 2-16 lowercase letters, numbers, hyphens, or underscores, starting with a letter.');
        }

        if (!isChannelNameAvailable(state, player, { name })) {
          return Broadcast.sayAt(player, `'${name}' is already in use.`);
        }

        state.DynamicChannelRegistry.create(name, password, player.name, persistent);
        state.ChannelManager.add(buildDynamicChannel(state.DynamicChannelRegistry, name, player.name, state.ChannelMessageStore));

        const persistedNote = persistent ? ` Messages are saved for a week — catch up with 'channel recap ${name}'.` : '';
        return Broadcast.sayAt(player, `Channel '${name}' created. Invite players with 'channel invite <player> ${name}' or have them join with 'channel join ${name} <password>'.${persistedNote}`);
      }

      case 'join': {
        if (!isAdmin(state, player)) {
          return Broadcast.sayAt(player, 'You do not have permission to use this command.');
        }

        const [, rawName, password] = parts;
        const name = rawName ? rawName.toLowerCase() : '';

        if (!name || !password) {
          return Broadcast.sayAt(player, 'Usage: channel join <name> <password>');
        }

        if (!isDynamicChannel(state, player, { name })) {
          return Broadcast.sayAt(player, `No such channel '${name}'.`);
        }

        if (isChannelMember(state, player, { name })) {
          return Broadcast.sayAt(player, `You're already a member of '${name}'.`);
        }

        const result = state.DynamicChannelRegistry.join(name, password, player.name);

        if (result === 'BAD_PASSWORD') {
          return Broadcast.sayAt(player, 'Incorrect password.');
        }

        return Broadcast.sayAt(player, `You join '${name}'.`);
      }

      case 'invite': {
        if (!isAdmin(state, player)) {
          return Broadcast.sayAt(player, 'You do not have permission to use this command.');
        }

        const [, targetName, rawName] = parts;
        const name = rawName ? rawName.toLowerCase() : '';

        if (!targetName || !name) {
          return Broadcast.sayAt(player, 'Usage: channel invite <player> <name>');
        }

        if (!isDynamicChannel(state, player, { name })) {
          return Broadcast.sayAt(player, `No such channel '${name}'.`);
        }

        if (!player.room) {
          throw new RangeError('Player not in room!');
        }

        const target = Parser.parseDot(targetName, player.room.players);

        if (!target) {
          return Broadcast.sayAt(player, 'They are not here.');
        }

        if (isChannelMember(state, target, { name })) {
          return Broadcast.sayAt(player, `${target.name} is already a member of '${name}'.`);
        }

        state.DynamicChannelRegistry.invite(name, target.name);

        Broadcast.sayAt(player, `${target.name} has been added to '${name}'.`);
        return Broadcast.sayAt(target, `${player.name} adds you to '${name}'.`);
      }

      case 'leave': {
        const [, rawName] = parts;
        const name = rawName ? rawName.toLowerCase() : '';

        if (!name) {
          return Broadcast.sayAt(player, 'Usage: channel leave <name>');
        }

        if (!isChannelMember(state, player, { name })) {
          return Broadcast.sayAt(player, `You're not a member of '${name}'.`);
        }

        state.DynamicChannelRegistry.leave(name, player.name);

        return Broadcast.sayAt(player, `You leave '${name}'.`);
      }

      case 'list': {
        const channels = state.DynamicChannelRegistry.list();

        if (!channels.length) {
          return Broadcast.sayAt(player, 'There are no dynamic channels yet.');
        }

        Broadcast.sayAt(player, 'Dynamic channels:');
        for (const [channelName, entry] of channels) {
          const joined = entry.members.has(player.name) ? ' (joined)' : '';
          const memberCount = entry.members.size;
          Broadcast.sayAt(player, `  ${channelName} - ${memberCount} member${memberCount === 1 ? '' : 's'}${joined}`);
        }

        return;
      }

      case 'recap': {
        const [, rawName] = parts;
        const name = rawName ? rawName.toLowerCase() : '';

        if (!name) {
          return Broadcast.sayAt(player, 'Usage: channel recap <name>');
        }

        if (!isDynamicChannel(state, player, { name })) {
          return Broadcast.sayAt(player, `No such channel '${name}'.`);
        }

        if (!isChannelMember(state, player, { name })) {
          return Broadcast.sayAt(player, `You're not a member of '${name}'.`);
        }

        if (!isChannelPersistent(state, player, { name })) {
          return Broadcast.sayAt(player, `'${name}' doesn't save message history.`);
        }

        const store = state.ChannelMessageStore;
        const cursor = store.getCursor(name, player.name);
        const messages = store.getSince(name, cursor);

        if (!messages.length) {
          return Broadcast.sayAt(player, `No new messages in '${name}'.`);
        }

        Broadcast.sayAt(player, `📡 Recap of '${name}':`);
        for (const msg of messages) {
          Broadcast.sayAt(player, `  [${name}] ${formatPlayerName(msg.sender)}: ${msg.body}`);
        }

        store.setCursor(name, player.name, messages[messages.length - 1].id);

        return;
      }

      default:
        return Broadcast.sayAt(player, `Usage: ${module.exports.usage}`);
    }
  }
};
