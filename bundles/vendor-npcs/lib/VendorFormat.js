// bundles/vendor-npcs/lib/VendorFormat.js
'use strict';

const sprintf = require('sprintf-js').sprintf;
const { Broadcast: B, ItemType } = require('ranvier');
const ItemUtil = require('../../lib/lib/ItemUtil');

/**
 * Convert a snake_case currency key to a Title Case display name.
 * e.g. 'gold_coin' → 'Gold Coin', 'gold' → 'Gold'
 *
 * @param {string} currency
 * @returns {string}
 */
function friendlyCurrencyName(currency) {
  return currency
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Build a tell helper that routes vendor speech to a player.
 *
 * @param {object} state
 * @param {Npc}    vendor
 * @param {Player} player
 * @returns {(message: string) => void}
 */
function makeTell(state, vendor, player) {
  return message => {
    state.ChannelManager.get('tell').send(state, vendor, player.name + ' ' + message);
  };
}

/**
 * Render the full vendor inventory table, grouped by category.
 * Iterates categories in stable ItemType declaration order.
 *
 * @param {Player}  player
 * @param {object}  groups      — output of VendorCatalog.groupByCategory()
 * @param {object}  vendorConfig — the full vendor metadata block (vendorConfig.items used for pricing)
 */
function renderItemList(player, groups, vendorConfig) {
  for (const [, type] of Object.entries(ItemType)) {
    const group = groups[type];
    if (!group || !group.items.length) continue;

    B.sayAt(player, '.' + B.center(78, group.title, 'yellow', '-') + '.');

    for (const item of group.items) {
      const entry = vendorConfig.items[item.entityReference];
      const costLabel = friendlyCurrencyName(entry.currency) + ' x ' + entry.cost;

      B.sayAt(player,
        '<yellow>|</yellow> ' +
        ItemUtil.qualityColorize(item, sprintf('%-48s', `[${item.name}]`)) +
        sprintf(' <yellow>|</yellow> <b>%-26s</b>', B.center(26, costLabel)) +
        '<yellow>|</yellow> '
      );
    }

    B.sayAt(player, "'" + B.line(78, '-', 'yellow') + "'");
    B.sayAt(player);
  }
}

/**
 * Render full detail for a single vendor item (used by 'shop list <item>').
 *
 * @param {object} state
 * @param {Player} player
 * @param {Item}   item
 * @param {object} vendorConfig — the full vendor metadata block
 */
function renderItemDetail(state, player, item, vendorConfig) {
  const entry = vendorConfig.items[item.entityReference];
  item.hydrate(state);
  B.sayAt(player, ItemUtil.renderItem(state, item, player));
  B.sayAt(player, `Cost: <b><white>[${friendlyCurrencyName(entry.currency)}]</white></b> x ${entry.cost}`);
}

module.exports = { friendlyCurrencyName, makeTell, renderItemList, renderItemDetail };
