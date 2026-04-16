// resources/server-events/index.js
'use strict';

require('../hints');
const TerrainResolver = require('../lib/TerrainResolver');
const SpawnLoop = require('../lib/SpawnLoop');
//const NpcDeathHandler = require('../lib/NpcDeathHandler');
const ResourceContainer = require('../lib/ResourceContainer');
const startupPoll = require('../../lib/lib/StartupPoll');
const { SPAWN_TICK_MS, ROT_POLL_TICK_MS } = require('../constants');
const { emit: craftingEmit } = require('../events');
//const { EVENTS: CombatEvents } = require('../../combat/events');

'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

/**
 * @type {{
 *   listeners: {
 *     startup: function(GameState): function(): void
 *   }
 * }}
 */
module.exports = {
  listeners: {
    /** @param {GameState} state */
    startup: state => () => startupPoll(
      () => !!state.WorldManager,
      async() => {
        TerrainResolver.init(room => state.WorldManager.getTerrainForRoom(room));

        setInterval(() => SpawnLoop.tick(state), SPAWN_TICK_MS);

        setInterval(() => {
          if (!state.TimeService) return;
          const currentTick = state.TimeService.getTick();
          for (const [, player] of state.PlayerManager.players) {
            if (!ResourceContainer.isDirty(player)) continue;
            const { rotted } = ResourceContainer.processRot(player, currentTick);
            if (Object.keys(rotted).length) {
              craftingEmit.resourceRotted(player, rotted);
            }
          }
        }, ROT_POLL_TICK_MS);

        // @todo
        // state.MobManager.on('npcCreated', npc => {
        //   npc.on(CombatEvents.KILLED, () => NpcDeathHandler.handleKilled(npc, state));
        // });
      }
    )
  }
};
