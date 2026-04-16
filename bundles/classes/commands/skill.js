'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

const { Broadcast: B } = require('ranvier');
const {
  isPassiveSkill,
  hasResourceCost,
  hasCooldown,
} = require('../logic');

module.exports = {
  aliases: ['spell'],

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (args, player) => {
    const say = (message, wrapWidth) => B.sayAt(player, message, wrapWidth);

    if (!args) {
      return say("What skill or spell do you want to look up? Use 'skills' to view all skills/spells.");
    }

    let skill = state.SkillManager.find(args, true);
    if (!skill) {
      skill = state.SpellManager.find(args, true);
    }

    if (!skill) {
      return say('No such skill.');
    }

    say('<b>' + B.center(80, skill.name, 'white', '-') + '</b>');

    if (isPassiveSkill(state, player, { skill })) {
      say('<b>Passive</b>');
    } else {
      say(`<b>Usage</b>: ${skill.id}`);
    }

    if (hasResourceCost(state, player, { skill })) {
      say(`<b>Cost</b>: <b>${skill.resource.cost}</b> ${skill.resource.attribute}`);
    }

    if (hasCooldown(state, player, { skill })) {
      say(`<b>Cooldown</b>: <b>${skill.cooldownLength}</b> seconds`);
    }

    say(skill.info(player), 80);
    say('<b>' + B.line(80) + '</b>');
  }
};
