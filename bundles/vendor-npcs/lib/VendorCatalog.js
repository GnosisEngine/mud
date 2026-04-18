// bundles/vendor-npcs/lib/VendorCatalog.js
'use strict';

/** @typedef {import('../../../types/ranvier').RanvierItem} RanvierItem */

const { ItemType } = require('ranvier');
const ArgParser = require('../../lib/lib/ArgParser');

// Display titles for each supported ItemType. RESOURCE is intentionally absent —
// resource nodes are never sold through a vendor.
const CATEGORY_TITLES = Object.freeze({
  [ItemType.POTION]: 'Potions',
  [ItemType.ARMOR]: 'Armor',
  [ItemType.WEAPON]: 'Weapons',
  [ItemType.CONTAINER]: 'Containers',
  [ItemType.OBJECT]: 'Miscellaneous',
});

/**
 * Resolve a vendor's item config into an array of Item instances.
 * Items are not hydrated here — callers hydrate only when needed.
 *
 * @param {object} state        — Ranvier GameState
 * @param {object} vendorItems  — vendorConfig.items map: { [entityRef]: { cost, currency } }
 * @returns {RanvierItem[]}
 */
function getItems(state, vendorItems) {
  return Object.keys(vendorItems).map(itemRef => {
    const area = state.AreaManager.getAreaByReference(itemRef);
    return state.ItemFactory.create(area, itemRef);
  });
}

/**
 * Find a single item from a list by dot-notation query (e.g. 'sword', '2.sword').
 * Returns null when nothing matches — never returns false.
 *
 * @param {RanvierItem[]} items
 * @param {string} query
 * @returns {RanvierItem|null}
 */
function findItem(items, query) {
  const result = ArgParser.parseDot(query, items);
  return result || null;
}

/**
 * Group an item array by ItemType for display.
 * Only includes types that have at least one item in the list.
 *
 * @param {RanvierItem[]} items
 * @returns {Record<string, { title: string, items: RanvierItem[] }>}
 */
function groupByCategory(items) {
  /** @type {Record<string, { title: string, items: RanvierItem[] }>} */
  const groups = {};
  for (const item of items) {
    const title = CATEGORY_TITLES[item.type];
    if (!title) continue;
    if (!groups[item.type]) {
      groups[item.type] = { title, items: [] };
    }
    groups[item.type].items.push(item);
  }
  return groups;
}

module.exports = { getItems, findItem, groupByCategory, CATEGORY_TITLES };
