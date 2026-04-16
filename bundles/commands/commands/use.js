'use strict';

const humanize = (sec) => { return require('humanize-duration')(sec, { round: true }); };
const { Broadcast, Logger, SkillErrors } = require('ranvier');
const ArgParser = require('../../lib/lib/ArgParser');
const ItemUtil = require('../../lib/lib/ItemUtil');
const { isUsable, isDepletedCharges } = require('../logic');

module.exports = {
  aliases: ['quaff', 'recite'],
  command: state => (args, player) => {
    const say = message => Broadcast.sayAt(player, message);

    if (!args) {
      return say('Use what?');
    }

    const item = ArgParser.parseDot(args, player.inventory);
    if (!item) {
      return say("You don't have anything like that.");
    }

    if (!isUsable(state, player, { item })) {
      return say("You can't use that.");
    }

    const usable = item.getBehavior('usable');

    if (isDepletedCharges(state, player, { usable })) {
      return say(`You've used up all the magic in ${ItemUtil.display(item)}.`);
    }

    if (usable.spell) {
      const useSpell = state.SpellManager.get(usable.spell);
      if (!useSpell) {
        Logger.error(`Item: ${item.entityReference} has invalid usable configuration.`);
        return say("You can't use that.");
      }

      useSpell.options = usable.options;
      if (usable.cooldown) {
        useSpell.cooldownLength = usable.cooldown;
      }

      try {
        useSpell.execute(null, player);
      } catch (e) {
        if (e instanceof SkillErrors.CooldownError) {
          return say(`${useSpell.name} is on cooldown. ${humanize(e.effect.remaining)} remaining.`);
        }
        if (e instanceof SkillErrors.PassiveError) {
          return say('That skill is passive.');
        }
        if (e instanceof SkillErrors.NotEnoughResourcesError) {
          return say('You do not have enough resources.');
        }
        Logger.error(e.message);
        Broadcast.sayAt(this, 'Huh?');
      }
    }

    if (usable.effect) {
      const effectConfig = Object.assign({ name: item.name }, usable.config || {});
      const effectState = usable.state || {};
      const useEffect = state.EffectFactory.create(usable.effect, effectConfig, effectState);
      if (!useEffect) {
        Logger.error(`Item: ${item.entityReference} has invalid usable configuration.`);
        return say("You can't use that.");
      }
      if (!player.addEffect(useEffect)) {
        return say('Nothing happens.');
      }
    }

    if (!('charges' in usable)) {
      return;
    }

    usable.charges--;

    if (usable.destroyOnDepleted && usable.charges <= 0) {
      say(`You used up all the magic in ${ItemUtil.display(item)} and it disappears in a puff of smoke.`);
      state.ItemManager.remove(item);
    }
  }
};
