'use strict';

const { Broadcast: B, CommandManager } = require('ranvier');
const say = B.sayAt;
const {
  isSelf,
  isInParty,
  isPartyLeader,
  isTargetInParty,
  isTargetPartyLeader,
  isInvited,
} = require('../logic');

const subcommands = new CommandManager();

subcommands.add({
  name: 'create',
  command: state => (args, player) => {
    if (isInParty(state, player)) {
      return say(player, "You're already in a group.");
    }

    state.PartyManager.create(player);
    say(player, "<b><green>You created a group, invite players with '<white>group invite <n></white>'</green></b>");
  }
});

subcommands.add({
  name: 'invite',
  command: state => (args, player) => {
    if (!isInParty(state, player)) {
      return say(player, "You don't have a group, create one with '<b>group create</b>'.");
    }

    if (!isPartyLeader(state, player)) {
      return say(player, "You aren't the leader of the group.");
    }

    if (!args) {
      return say(player, 'Invite whom?');
    }

    const target = state.getTarget(player, args, ['player']);

    if (isSelf(state, player, { target })) {
      return say(player, 'You ask yourself if you want to join your own group. You humbly accept.');
    }

    if (!target) {
      return say(player, "They aren't here.");
    }

    if (isTargetInParty(state, player, { target })) {
      return say(player, 'They are already in a group.');
    }

    say(target, `<b><green>${player.name} invited you to join their group. Join/decline with '<white>group join/decline ${player.name}</white>'</green></b>`);
    say(player, `<b><green>You invite ${target.name} to join your group.</green></b>`);
    player.party.invite(target);
    B.prompt(target);
  }
});

subcommands.add({
  name: 'disband',
  command: state => (args, player) => {
    if (!isInParty(state, player)) {
      return say(player, "You aren't in a group.");
    }

    if (!isPartyLeader(state, player)) {
      return say(player, "You aren't the leader of the group.");
    }

    if (args !== 'sure') {
      return say(player, '<b><green>You have to confirm disbanding your group with \'<white>group disband sure</white>\'</green></b>');
    }

    say(player.party, '<b><green>Your group was disbanded!</green></b>');
    state.PartyManager.disband(player.party);
  }
});

subcommands.add({
  name: 'join',
  command: state => (args, player) => {
    if (!args) {
      return say(player, 'Join whose group?');
    }

    const target = state.getTarget(player, args, ['player']);

    if (!target) {
      return say(player, "They aren't here.");
    }

    if (!isTargetPartyLeader(state, player, { target })) {
      return say(player, "They aren't leading a group.");
    }

    if (!isInvited(state, player, { target })) {
      return say(player, "They haven't invited you to join their group.");
    }

    say(player, `<b><green>You join ${target.name}'s group.</green></b>`);
    say(target.party, `<b><green>${player.name} joined the group.</green></b>`);
    target.party.add(player);
    player.follow(target);
  }
});

subcommands.add({
  name: 'decline',
  command: state => (args, player) => {
    if (!args) {
      return say(player, 'Decline whose invite?');
    }

    const target = state.getTarget(player, args, ['player']);

    if (!target) {
      return say(player, "They aren't here.");
    }

    say(player, `<b><green>You decline to join ${target.name}'s group.</green></b>`);
    say(target, `<b><green>${player.name} declined to join your group.</green></b>`);
    target.party.removeInvite(player);
  }
});

subcommands.add({
  name: 'list',
  command: () => (args, player) => {
    if (!isInParty(null, player)) {
      return say(player, "You're not in a group.");
    }

    say(player, '<b>' + B.center(80, 'Group', 'green', '-') + '</b>');
    for (const member of player.party) {
      const tag = member === player.party.leader ? '[L]' : '   ';
      say(player, `<b><green>${tag} ${member.name}</green></b>`);
    }
  }
});

subcommands.add({
  name: 'leave',
  command: () => (args, player) => {
    if (!isInParty(null, player)) {
      return say(player, "You're not in a group.");
    }

    if (isPartyLeader(null, player)) {
      return say(player, 'You have to disband if you want to leave the group.');
    }

    const party = player.party;
    player.party.delete(player);
    say(party, `<b><green>${player.name} left the group.</green></b>`);
    say(player, '<b><green>You leave the group.</green></b>');
  }
});

module.exports = {
  aliases: ['party'],
  subcommands: ['create', 'decline', 'disband', 'invite', 'join', 'leave', 'list'],
  command: state => (args, player) => {
    if (!args || !args.length) {
      args = 'list';
    }

    const [command, ...commandArgs] = args.split(' ');
    const subcommand = subcommands.find(command);

    if (!subcommand) {
      return say(player, 'Not a valid party command.');
    }

    subcommand.command(state)(commandArgs.join(' '), player);
  }
};
