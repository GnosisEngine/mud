// bundles/vendor-npcs/commands/shop.js
'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */
/** @typedef {import('../../../types/ranvier').RanvierCharacter} RanvierCharacter */
/** @typedef {import('../../../types/ranvier').RanvierNpc} RanvierNpc */
/** @typedef {import('../../../types/ranvier').RanvierVendorCommand} RanvierVendorCommand */


require('../hints');
const { Broadcast: B, CommandManager } = require('ranvier');
const VendorCatalog = require('../lib/VendorCatalog');
const VendorFormat = require('../lib/VendorFormat');
const VendorTransaction = require('../lib/VendorTransaction');
const {
  hasVendorInRoom,
} = require('../logic');

/** @type {CommandManager<RanvierVendorCommand>} */
const subcommands = new CommandManager();

subcommands.add({
  name: 'list',
  /**
   * @param {GameState} state
   * @returns {function(RanvierNpc, string, RanvierPlayer): void}
   */
  command: state => (vendor, args, player) => {
    const vendorConfig = vendor.getMeta('vendor');
    const items = VendorCatalog.getItems(state, vendorConfig.items);
    const tell = VendorFormat.makeTell(state, vendor, player);

    if (!!args) {
      const item = VendorCatalog.findItem(items, args);
      if (!item) {
        return tell("I don't carry that item and no, I won't check in back.");
      }
      return VendorFormat.renderItemDetail(state, player, item, vendorConfig);
    }

    const groups = VendorCatalog.groupByCategory(items);
    VendorFormat.renderItemList(player, groups, vendorConfig);
  },
});

subcommands.add({
  name: 'buy',
  command: state => (vendor, args, player) => {
    VendorTransaction.buy(state, vendor, player, args);
  },
});

subcommands.add({
  name: 'sell',
  command: state => (vendor, args, player) => {
    VendorTransaction.sell(state, vendor, player, args);
  },
});

subcommands.add({
  name: 'value',
  aliases: ['appraise', 'offer'],
  command: state => (vendor, args, player) => {
    VendorTransaction.appraise(state, vendor, player, args);
  },
});

module.exports = {
  aliases: ['vendor', 'list', 'buy', 'sell', 'value', 'appraise', 'offer'],
  usage: 'shop list [item], shop buy <item>, shop sell <item>, shop appraise <item>',
  subcommands: ['buy', 'list', 'sell', 'value'],

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer, string): void}
   */
  command: state => (args, player, arg0) => {
    args = (!['vendor', 'shop'].includes(arg0) ? arg0 + ' ' : '') + (args || '');

    if (!hasVendorInRoom(state, player)) {
      return B.sayAt(player, "You aren't in a shop.");
    }

    const vendor = Array.from(player.room?.npcs ?? []).find(npc => npc.getMeta('vendor'));

    if (!vendor) {
      return B.sayAt(player, "You aren't near a vendor.");
    }

    const [subName, ...rest] = args.trim().split(' ');
    const sub = subcommands.find(subName);

    if (!sub) {
      return B.sayAt(player, "Not a valid shop command. See '<b>help shops</b>'");
    }

    sub.command(state)(vendor, rest.join(' '), player);
  },
};
