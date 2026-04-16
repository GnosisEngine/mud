'use strict';

const { Broadcast: B } = require('ranvier');
const ArgParser = require('../../lib/lib/ArgParser');
const dot = ArgParser.parseDot;
const ItemUtil = require('../../lib/lib/ItemUtil');
const { emit } = require('../events');
const { isContainer, isContainerClosed } = require('../logic');

module.exports = {
  usage: 'put <item> <container>',
  command: state => (args, player) => {
    args = args.trim();

    if (!args) {
      return B.sayAt(player, 'Put what where?');
    }

    const parts = args.split(' ').filter(arg => !arg.match(/in/) && !arg.match(/into/));

    if (parts.length === 1) {
      return B.sayAt(player, 'Where do you want to put it?');
    }

    const item = dot(parts[0], player.inventory);
    const toContainer = state.getTarget(player, parts[1], ['item'])
      ?? dot(parts[1], player.inventory)
      ?? dot(parts[1], player.equipment);

    if (!item) {
      return B.sayAt(player, "You don't have that item.");
    }

    if (!toContainer) {
      return B.sayAt(player, "You don't see anything like that here.");
    }

    if (!isContainer(state, player, { item: toContainer })) {
      return B.sayAt(player, `${ItemUtil.display(toContainer)} isn't a container.`);
    }

    if (toContainer.isInventoryFull()) {
      return B.sayAt(player, `${ItemUtil.display(toContainer)} can't hold any more.`);
    }

    if (isContainerClosed(state, player, { container: toContainer })) {
      return B.sayAt(player, `${ItemUtil.display(toContainer)} is closed.`);
    }

    player.removeItem(item);
    toContainer.addItem(item);

    B.sayAt(player, `<green>You put </green>${ItemUtil.display(item)}<green> into </green>${ItemUtil.display(toContainer)}<green>.</green>`);

    emit.putOnItem(item, player, toContainer);
    emit.put(player, item, toContainer);
  }
};
