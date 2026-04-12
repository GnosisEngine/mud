// bundles/factions/player-events.js
'use strict';

const { createHandler } = require('./lib/FactionEvents');
const { EVENTS }        = require('./events');

module.exports = {
  listeners: {

    // -----------------------------------------------------------------------
    // login — attach the factionEvent listener to this player.
    //
    // The player object is the authoritative source for playerId — injecting
    // it here means emitting bundles (resources, combat, claims, etc.) only
    // need to provide factionId and eventType in their payload.
    //
    // A named handler reference is stored on the player so reconnects can
    // remove the previous listener before attaching a new one, preventing
    // duplicate processing.
    // -----------------------------------------------------------------------
    login: state => function() {
      if (!state.FactionManager) return;

      const handler = createHandler(state.FactionManager);

      if (this._factionEventHandler) {
        this.removeListener(EVENTS.FACTION_EVENT, this._factionEventHandler);
      }

      this._factionEventHandler = async(payload) => {
        await handler({
          ...payload,
          playerId: this.name,
          player:   this,
        });
      };

      this.on(EVENTS.FACTION_EVENT, this._factionEventHandler);
    },

  },
};
