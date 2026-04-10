// bundles/websocket-networking/lib/EventRelay.js
'use strict';

/**
 * Builds a map of player-events listeners that forward event payloads
 * to the websocket client via socket.command('sendData', ...).
 *
 * Only events matching ALL of these criteria are included:
 *   - relay: true      — explicitly opted in to WS forwarding
 *   - emitter: 'player' — fired on a player object; `this` in the listener
 *                         is the player, so this.socket is available
 *
 * Events with emitter: 'ranvier' (engine-controlled) or other emitter types
 * are skipped — they either have no payload object contract, or their WS
 * handling needs custom serialization that belongs in explicit handlers.
 *
 * @param {Array<object>} schemas  Array of SCHEMA objects from bundle events.js files
 * @returns {Record<string, Function>} Listener map — spread into player-events listeners
 */
function build(schemas) {
  const listeners = {};

  for (const schema of schemas) {
    for (const [eventName, descriptor] of Object.entries(schema)) {
      if (!descriptor.relay || descriptor.emitter !== 'player') continue;

      listeners[eventName] = () => function(payload) {
        this.socket.command('sendData', eventName, payload);
      };
    }
  }

  return listeners;
}

module.exports = { build };
