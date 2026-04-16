'use strict';

const { Broadcast, ItemType } = require('ranvier');
const ArgParser = require('../../lib/lib/ArgParser');
const ItemUtil = require('../../lib/lib/ItemUtil');
const { emit } = require('../events');
const {
  hasNoArgs,
  hasRoom,
  hasInventorySpace,
  isContainer,
  isContainerClosed,
  isPickupAllowed,
} = require('../logic');

module.exports = {
  usage: 'get <item> [container]',
  aliases: ['take', 'pick', 'loot'],
  command: state => (args, player, arg0) => {
    if (hasNoArgs(state, player, { args })) {
      return Broadcast.sayAt(player, 'Get what?');
    }

    if (!hasRoom(state, player)) {
      return Broadcast.sayAt(player, 'You are floating in the nether, there is nothing to get.');
    }

    if (!hasInventorySpace(state, player)) {
      return Broadcast.sayAt(player, "You can't hold any more items.");
    }

    if (arg0 === 'loot') {
      args = ('all ' + args).trim();
    }

    let parts = args.split(' ').filter(arg => !arg.match(/from/));

    if (parts.length > 1 && parts[0] === 'up') {
      parts = parts.slice(1);
    }

    let source = null, search = null, container = null;
    if (parts.length === 1) {
      search = parts[0];
      source = player.room.items;
    } else {
      container = ArgParser.parseDot(parts[1], [...player.room.items].reverse());
      if (!container) {
        return Broadcast.sayAt(player, "You don't see anything like that here.");
      }

      if (!isContainer(state, player, { item: container })) {
        return Broadcast.sayAt(player, `${ItemUtil.display(container)} isn't a container.`);
      }

      if (isContainerClosed(state, player, { container })) {
        return Broadcast.sayAt(player, `${ItemUtil.display(container)} is closed.`);
      }

      search = parts[0];
      source = container.inventory;
    }

    if (search === 'all') {
      if (!source || ![...source].length) {
        return Broadcast.sayAt(player, "There isn't anything to take.");
      }

      for (let item of source) {
        if (Array.isArray(item)) {
          item = item[1];
        }

        if (!hasInventorySpace(state, player)) {
          return Broadcast.sayAt(player, "You can't carry any more.");
        }

        pickup(item, container, player);
      }

      return;
    }

    const item = source === player.room.items
      ? state.getTarget(player.room, search, ['item'])
      : ArgParser.parseDot(search, source);

    if (!item) {
      return Broadcast.sayAt(player, "You don't see anything like that here.");
    }

    pickup(item, container, player);
  }
};

function pickup(item, container, player) {
  if (!isPickupAllowed(null, null, { item })) {
    return Broadcast.sayAt(player, `${ItemUtil.display(item)} can't be picked up.`);
  }

  if (container) {
    container.removeItem(item);
  } else {
    player.room.removeItem(item);
  }
  player.addItem(item);

  Broadcast.sayAt(player, `<green>You receive loot: </green>${ItemUtil.display(item)}<green>.</green>`);

  emit.getOnItem(item, player);
  emit.get(player, item);
}
