'use strict';

const { Broadcast } = require('ranvier');
const { isSpellKnown } = require('../logic');

module.exports = {
  command: state => (args, player) => {
    const match = args.match(/^(['"])([^\1]+)+\1(?:$|\s+(.+)$)/);
    if (!match) {
      return Broadcast.sayAt(player, "Casting spells must be surrounded in quotes e.g., cast 'fireball' target");
    }

    const [, , spellName, targetArgs] = match;

    if (!isSpellKnown(state, player, { spellName })) {
      return Broadcast.sayAt(player, 'No such spell.');
    }

    const spell = state.SpellManager.find(spellName);
    player.queueCommand({
      execute: _ => {
        player.emit('useAbility', spell, targetArgs);
      },
      label: `cast ${args}`,
    }, spell.lag || state.Config.get('skillLag') || 1000);
  }
};
