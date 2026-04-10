'use strict';

const EventRelay = require('./lib/EventRelay');
const { SCHEMA: PlayerEventsSchema } = require('../player-events/events');
const { SCHEMA: CombatSchema }       = require('../combat/events');
const { SCHEMA: CraftingSchema }     = require('../crafting/events');
const { SCHEMA: ClaimsSchema }       = require('../claims/events');
const { SCHEMA: QuestsSchema, EVENTS: QuestEvents } = require('../quests/events');

const relayListeners = EventRelay.build([
  PlayerEventsSchema,
  CombatSchema,
  CraftingSchema,
  ClaimsSchema,
  QuestsSchema,
]);

module.exports = {
  listeners: {
    ...relayListeners,

    attributeUpdate: () => function() {
      updateAttributes.call(this);
    },

    login: () => function() {
      this.socket.command('sendData', 'quests', this.questTracker.serialize().active);

      const effects = this.effects.entries().filter(effect => !effect.config.hidden).map(effect => effect.serialize());
      this.socket.command('sendData', 'effects', effects);

      updateAttributes.call(this);
    },

    combatantAdded: () => function() {
      updateTargets.call(this);
    },

    combatantRemoved: () => function() {
      updateTargets.call(this);
    },

    updateTick: () => function() {
      const effects = this.effects.entries().filter(effect => !effect.config.hidden).map(effect => ({
        name: effect.name,
        elapsed: effect.elapsed,
        remaining: effect.remaining,
        config: {
          duration: effect.config.duration
        }
      }));

      if (effects.length) {
        this.socket.command('sendData', 'effects', effects);
      }

      if (!this.isInCombat()) {
        return;
      }

      updateTargets.call(this);
    },

    effectRemoved: () => function() {
      if (!this.effects.size) {
        this.socket.command('sendData', 'effects', []);
      }
    },

    // questProgress has custom serialization — reads from questTracker rather
    // than forwarding the raw event payload, so it stays as an explicit handler.
    [QuestEvents.QUEST_PROGRESS]: () => function() {
      this.socket.command('sendData', 'quests', this.questTracker.serialize().active);
    },
  }
};

function updateAttributes() {
  // example of sending player data to a websocket client. This data is not sent to the default telnet socket
  const attributes = {};
  for (const [name] of this.attributes) {
    attributes[name] = {
      current: this.getAttribute(name),
      max: this.getMaxAttribute(name),
    };
  }

  this.socket.command('sendData', 'attributes', attributes);
}

function updateTargets() {
  this.socket.command('sendData', 'targets', [...this.combatants].map(target => ({
    name: target.name,
    health: {
      current: target.getAttribute('health'),
      max: target.getMaxAttribute('health'),
    },
  })));
}
