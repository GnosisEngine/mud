'use strict';

require('../hints');
const humanize = (sec) => { return require('humanize-duration')(sec, { round: true }); };
const { EffectFlag } = require('ranvier');
const { Broadcast: B } = require('ranvier');
const {
  hasNoVisibleEffects,
  isStackable,
  isPermanent,
} = require('../logic');

module.exports = {
  aliases: ['affects'],
  command: (state) => (args, player) => {
    B.sayAt(player, 'Current Effects:');

    if (hasNoVisibleEffects(state, player)) {
      return B.sayAt(player, '  None.');
    }

    const visibleEffects = player.effects.entries().filter(e => !e.config.hidden);

    for (const effect of visibleEffects) {
      let color = 'white';

      if (effect.flags.includes(EffectFlag.BUFF)) color = 'green';
      if (effect.flags.includes(EffectFlag.DEBUFF)) color = 'red';

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
