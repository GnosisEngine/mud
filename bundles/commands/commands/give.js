'use strict';

const { Broadcast: B } = require('ranvier');
const ArgParser = require('../../lib/lib/ArgParser');
const dot = ArgParser.parseDot;
const ItemUtil = require('../../lib/lib/ItemUtil');
const { hasNoArgs, isSelf, hasInventorySpace } = require('../logic');

module.exports = {
  usage: 'give <item> <target>',
  command: state => (args, player) => {
    if (hasNoArgs(state, player, { args })) {
      return B.sayAt(player, 'Give what to whom?');
    }

    let [targetItem, to, targetRecip] = args.split(' ');
    if (to !== 'to' || !targetRecip) {
      targetRecip = to;
    }

    if (!targetRecip) {
      return B.sayAt(player, 'Who do you want to give it to?');
    }

    targetItem = dot(targetItem, player.inventory);
    if (!targetItem) {
      return B.sayAt(player, "You don't have that.");
    }

    const target = state.getTarget(player.room, targetRecip, ['player', 'npc']);

    if (target?.isNpc) {
      const accepts = target.getBehavior('accepts');
      if (!accepts || !accepts.includes(targetItem.entityReference)) {
        return B.sayAt(player, "They don't want that.");
      }
    }

    if (!target) {
      return B.sayAt(player, "They aren't here.");
    }

    if (isSelf(state, player, { target })) {
      return B.sayAt(player, `<green>You move ${ItemUtil.display(targetItem)} from one hand to the other. That was productive.</green>`);
    }

    if (!hasInventorySpace(state, target)) {
      return B.sayAt(player, "They can't carry any more.");
    }

    player.removeItem(targetItem);
    target.addItem(targetItem);

    B.sayAt(player, `<green>You give <white>${target.name}</white>: ${ItemUtil.display(targetItem)}.</green>`);
    if (!target.isNpc) {
      B.sayAt(target, `<green>${player.name} gives you: ${ItemUtil.display(targetItem)}.</green>`);
    }
  }
};
