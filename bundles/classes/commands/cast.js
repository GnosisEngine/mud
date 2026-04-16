// bundles/classes/commands/cast.js

'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

const { Broadcast } = require('ranvier');
const { isSpellKnown } = require('../logic');
const SPELL_REGEX = /^(['"])(.*?)\1(?:\s+(.+))?$/;

module.exports = {
  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (args, player) => {
    const match = args.match(SPELL_REGEX);
    // const match = args.match(/^(['"])([^\1]+)+\1(?:$|\s+(.+)$)/);
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
