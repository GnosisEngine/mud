// resources/commands/trade.js
'use strict';

const { Broadcast: B } = require('ranvier');
const TradeLogic = require('../lib/TradeLogic');
const ResourceDefinitions = require('../lib/ResourceDefinitions');

function _parseOffer(offerStr) {
  const resourceMap = {};
  const parts = offerStr.trim().split(/\s*,\s*/);
  for (const part of parts) {
    const tokens = part.trim().split(/\s+/);
    if (tokens.length < 2) return null;
    const amount = parseInt(tokens[0], 10);
    const key = tokens[1];
    if (isNaN(amount) || amount <= 0) return null;
    if (!ResourceDefinitions.isValidKey(key)) return null;
    resourceMap[key] = (resourceMap[key] || 0) + amount;
  }
  return Object.keys(resourceMap).length ? resourceMap : null;
}

function _formatOffer(resourceMap) {
  return Object.entries(resourceMap)
    .map(([key, amount]) => {
      const def = ResourceDefinitions.getDefinition(key);
      return `${amount}x ${def ? def.title : key}`;
    })
    .join(', ');
}

module.exports = {
  usage: 'trade <player> <amount> <resource> [, <amount> <resource> ...] | trade accept | trade reject',
  command: state => (args, player) => {
    if (!args || !args.trim().length) {
      return B.sayAt(player, 'Usage: trade <player> <offer> or trade accept/reject');
    }

    const [subcommand, ...rest] = args.trim().split(/\s+/);

    if (subcommand === 'accept' || subcommand === 'reject') {
      const found = _findPendingForTarget(player, state);
      if (!found) {
        return B.sayAt(player, 'You have no pending trade to respond to.');
      }
      const { initiator } = found;

      if (subcommand === 'reject') {
        TradeLogic.reject(initiator, player);
        B.sayAt(player, 'You decline the trade.');
        B.sayAt(initiator, `${player.name} declined your trade offer.`);
        return;
      }

      const result = TradeLogic.accept(initiator, player);
      if (!result.ok) {
        B.sayAt(player, 'The trade could not be completed.');
        B.sayAt(initiator, 'Your trade offer could not be completed.');
        return;
      }

      const summary = _formatOffer(result.resourceMap);
      B.sayAt(player, `<green>Trade complete. You received: ${summary}.</green>`);
      B.sayAt(initiator, `<green>Trade complete. ${player.name} accepted your offer of ${summary}.</green>`);
      return;
    }

    const targetName = subcommand;
    const offerStr = rest.join(' ');

    const target = state.PlayerManager.getPlayer(targetName);
    if (!target) {
      return B.sayAt(player, `No player named "${targetName}" is online.`);
    }

    if (target === player) {
      return B.sayAt(player, "You can't trade with yourself.");
    }

    const resourceMap = _parseOffer(offerStr);
    if (!resourceMap) {
      return B.sayAt(player, 'Invalid offer. Example: trade Bob 5 gold_coin, 3 plant_material');
    }

    const result = TradeLogic.initiate(player, target, resourceMap, {
      onTimeout: () => {
        B.sayAt(player, 'Your trade offer to ${target.name} has expired.');
        B.sayAt(target, `The trade offer from ${player.name} has expired.`);
      },
    });

    if (!result.ok) {
      switch (result.reason) {
        case 'insufficient':
          return B.sayAt(player, `You don't have enough ${result.key} to offer.`);
        case 'trade_already_pending':
          return B.sayAt(player, 'A trade between you and that player is already pending.');
        case 'empty_offer':
          return B.sayAt(player, 'You must offer at least one resource.');
      }
      return;
    }

    const summary = _formatOffer(resourceMap);
    B.sayAt(player, `Trade offer sent to ${target.name}: ${summary}. Waiting for response...`);
    B.sayAt(target, `${player.name} offers you: ${summary}. Type 'trade accept' or 'trade reject'.`);
  },
};

function _findPendingForTarget(target, state) {
  for (const player of state.PlayerManager.players.values()) {
    if (player === target) continue;
    if (TradeLogic.hasPending(player, target)) {
      return { initiator: player };
    }
  }
  return null;
}
