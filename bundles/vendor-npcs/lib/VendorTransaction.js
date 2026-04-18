// bundles/vendor-npcs/lib/VendorTransaction.js
'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierItem} RanvierItem */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */
/** @typedef {import('../../../types/ranvier').RanvierNpc} RanvierNpc */

const { Broadcast: B } = require('ranvier');
const ArgParser = require('../../lib/lib/ArgParser');
const ItemUtil = require('../../lib/lib/ItemUtil');
const VendorCatalog = require('./VendorCatalog');
const VendorFormat = require('./VendorFormat');
const {
  canAfford,
  hasInventorySpace,
  isSellable,
  requiresSellConfirm,
  hasSellConfirm,
} = require('../logic');

const CONFIRM_WORD = 'sure';
const NO_CONFIRM_QUALITIES = new Set(['poor', 'common']);

/**
 * @param {GameState} state
 * @param {RanvierNpc} vendor
 * @param {RanvierPlayer} player
 * @param {string} args
 */
function buy(state, vendor, player, args) {
  const vendorConfig = vendor.getMeta('vendor');
  const tell = VendorFormat.makeTell(state, vendor, player);

  if (!!args === false) {
    return tell('Well, what do you want to buy?');
  }

  const items = VendorCatalog.getItems(state, vendorConfig.items);
  const item = VendorCatalog.findItem(items, args);

  if (!item) {
    return tell("I don't carry that item and no, I won't check in back.");
  }

  const entry = vendorConfig.items[item.entityReference];
  const currencyKey = 'currencies.' + entry.currency;

  if (!canAfford(state, player, { cost: entry.cost, currencyKey })) {
    return tell(`You can't afford that, it costs ${entry.cost} ${VendorFormat.friendlyCurrencyName(entry.currency)}.`);
  }

  if (!hasInventorySpace(state, player)) {
    return tell("I don't think you can carry any more.");
  }

  player.setMeta(currencyKey, (player.getMeta(currencyKey) || 0) - entry.cost);
  item.hydrate(state);
  state.ItemManager.add(item);
  player.addItem(item);

  B.sayAt(player, `<green>You spend <b><white>${entry.cost} ${VendorFormat.friendlyCurrencyName(entry.currency)}</white></b> to purchase ${ItemUtil.display(item)}.</green>`);
  player.save();
}

/**
 * @param {GameState} state
 * @param {RanvierNpc} vendor
 * @param {RanvierPlayer} player
 * @param {string} args
 */
function sell(state, vendor, player, args) {
  const tell = VendorFormat.makeTell(state, vendor, player);

  if (!!args === false) {
    return tell('What did you want to sell?');
  }

  const [itemArg, confirm] = args.split(' ');
  const item = ArgParser.parseDot(itemArg, player.inventory);

  if (!item) {
    return B.sayAt(player, "You don't have that.");
  }

  if (!isSellable(state, player, { item })) {
    return B.sayAt(player, "You can't sell that item.");
  }

  if (requiresSellConfirm(state, player, { item, noConfirmQualities: NO_CONFIRM_QUALITIES })
    && !hasSellConfirm(state, player, { confirm, confirmWord: CONFIRM_WORD })) {
    return B.sayAt(player, "To sell higher quality items use '<b>sell <item> sure</b>'.");
  }

  const sellable = item.getMeta('sellable');
  const currencyKey = 'currencies.' + sellable.currency;
  if (!player.getMeta('currencies')) {
    player.setMeta('currencies', {});
  }
  player.setMeta(currencyKey, (player.getMeta(currencyKey) || 0) + sellable.value);

  B.sayAt(player, `<green>You sell ${ItemUtil.display(item)} for <b><white>${sellable.value} ${VendorFormat.friendlyCurrencyName(sellable.currency)}</white></b>.</green>`);
  player.removeItem(item);
  state.ItemManager.remove(item);
}

/**
 * @param {GameState} state
 * @param {RanvierNpc} vendor
 * @param {RanvierPlayer} player
 * @param {string} args
 */
function appraise(state, vendor, player, args) {
  const tell = VendorFormat.makeTell(state, vendor, player);

  if (!!args === false) {
    return tell('What did you want me to appraise?');
  }

  const [itemArg] = args.split(' ');
  const item = ArgParser.parseDot(itemArg, player.inventory);

  if (!item) {
    return B.sayAt(player, "You don't have that.");
  }

  if (!isSellable(state, player, { item })) {
    return B.sayAt(player, "You can't sell that item.");
  }

  const sellable = item.getMeta('sellable');
  tell(`I could give you <b><white>${sellable.value} ${VendorFormat.friendlyCurrencyName(sellable.currency)}</white></b> for ${ItemUtil.display(item)}.`);
}

module.exports = { buy, sell, appraise };
