'use strict';

const humanize = (sec) => { return require('humanize-duration')(sec, { round: true }); };
const { Broadcast: B } = require('ranvier');
const {
  hasNoVisibleEffects,
  getVisibleEffects,
  isStackable,
  isPermanent,
  getEffectColor,
} = require('../logic');

module.exports = {
  aliases: ['affects'],
  command: (state) => (args, player) => {
    B.sayAt(player, 'Current Effects:');

    if (hasNoVisibleEffects(state, player)) {
      return B.sayAt(player, '  None.');
    }

    for (const effect of getVisibleEffects(state, player)) {
      const color = getEffectColor(state, player, { effect });

      B.at(player, `<bold><${color}>  ${effect.name}</${color}></bold>`);

      if (isStackable(state, player, { effect })) {
        B.at(player, ` (${effect.state.stacks || 1})`);
      }

      B.at(player, ':');

      if (isPermanent(state, player, { effect })) {
        B.sayAt(player, 'Permanent');
      } else {
        B.sayAt(player, ` ${humanize(effect.remaining)} remaining`);
      }

      B.sayAt(player, '\t' + effect.description);
    }
  }
};
