// resources/commands/craft.js
'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */
/** @typedef {import('types').RanvierItem} RanvierItem */
/** @typedef {import('types').RanvierCraftCommand} RanvierCraftCommand */
/** @typedef {import('types').CommandManager<import('types').RanvierCraftCommand>} RanvierCraftCommandManager */

/**
 * @typedef {{ type: number, title: string, items: RanvierItem[] }} ItemCategory
 */

const { Broadcast: B, CommandManager, ItemType } = require('ranvier');
const ResourceContainer = require('../lib/ResourceContainer');
const ResourceDefinitions = require('../lib/ResourceDefinitions');
const {
  isValidCategory,
  isValidRecipeEntry,
  hasSufficientResource,
  hasInventorySpace,
} = require('../logic');

const say = B.sayAt;

/** @type {RanvierCraftCommandManager} */
const subcommands = new CommandManager();

/**
 * @param {GameState} state
 */
function getCraftingCategories(state) {
  /** @type {ItemCategory[]} */
  const categories = [
    { type: ItemType.POTION, title: 'Potion', items: [] },
    { type: ItemType.WEAPON, title: 'Weapon', items: [] },
    { type: ItemType.ARMOR,  title: 'Armor',  items: [] },
  ];

  const recipes = require('../data/recipes.json');

  for (const recipe of recipes) {
    const area = state.AreaManager.getAreaByReference(recipe.item);

    if (!area) {
      throw new RangeError(`Item ${recipe.item} does not have an area reference`);
    }

    const recipeItem = state.ItemFactory.create(
      area,
      recipe.item
    );
    const catIndex = categories.findIndex(c => c.type === recipeItem.type);

    if (catIndex === -1) continue;

    recipeItem.hydrate(state);
    categories[catIndex].items.push({ item: recipeItem.type, recipe: recipe.recipe, itemRef: recipe.item });
  }

  return categories;
}

subcommands.add({
  name: 'list',

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (args, player) => {
    const categories = getCraftingCategories(state);

    if (!args) {
      say(player, '<b>Crafting Categories</b>');
      say(player, B.line(40));
      categories.forEach((cat, i) => say(player, `${i + 1}) ${cat.title}`));
      return;
    }

    const [catArg, itemArg] = args.split(' ');
    const catIndex = parseInt(catArg, 10) - 1;
    const category = categories[catIndex];
    if (!isValidCategory(state, player, { category })) return say(player, 'Invalid category.');

    if (!itemArg) {
      say(player, `<b>${category.title}</b>`);
      say(player, B.line(40));
      if (!category.items.length) return say(player, B.center(40, 'No recipes.'));
      category.items.forEach((entry, i) => say(player, `${i + 1}) ${entry.item.name}`));
      return;
    }

    const itemIndex = parseInt(itemArg, 10) - 1;
    const entry = category.items[itemIndex];
    if (!isValidRecipeEntry(state, player, { entry })) return say(player, 'Invalid item.');

    say(player, `${entry.item.name}`);
    say(player, '<b>Recipe:</b>');
    for (const [key, amount] of Object.entries(entry.recipe)) {
      const def = ResourceDefinitions.getDefinition(key);
      const title = def ? def.title : key;
      say(player, `  ${title} x${amount}`);
    }
  },
});

subcommands.add({
  name: 'create',
  command: state => (args, player) => {
    if (!args) {
      return say(player, "Create what? 'craft create 1 1' for example.");
    }

    const categories = getCraftingCategories(state);
    const [catArg, itemArg] = args.split(' ');
    const catIndex = parseInt(catArg, 10) - 1;
    const category = categories[catIndex];
    if (!isValidCategory(state, player, { category })) return say(player, 'Invalid category.');

    const itemIndex = parseInt(itemArg, 10) - 1;
    const entry = category.items[itemIndex];
    if (!isValidRecipeEntry(state, player, { entry })) return say(player, 'Invalid item.');

    for (const [key, required] of Object.entries(entry.recipe)) {
      if (!hasSufficientResource(state, player, { key, required })) {
        const def = ResourceDefinitions.getDefinition(key);
        const title = def ? def.title : key;
        const shortfall = required - ResourceContainer.getAmount(player, key);
        return say(player, `You need ${shortfall} more ${title}.`);
      }
    }

    if (!hasInventorySpace(state, player)) {
      return say(player, "You can't hold any more items.");
    }

    for (const [key, amount] of Object.entries(entry.recipe)) {
      const result = ResourceContainer.remove(player, key, amount);
      if (!result.ok) {
        return say(player, 'Something went wrong crafting that item.');
      }
    }

    const area = state.AreaManager.getAreaByReference(entry.itemRef);
    const newItem = state.ItemFactory.create(area, entry.itemRef);
    newItem.hydrate(state);
    state.ItemManager.add(newItem);
    player.addItem(newItem);
    say(player, `<b><green>You create: ${newItem.name}.</green></b>`);
    player.save();
  },
});

module.exports = {
  usage: 'craft <list/create> [category #] [item #]',
  subcommands: ['create', 'list'],
  command: state => (args, player) => {
    if (!args) {
      return say(player, "Missing craft command. See 'help craft'");
    }

    const [command, ...subArgs] = args.split(' ');
    const subcommand = subcommands.find(command);
    if (!subcommand) {
      return say(player, 'Invalid command. Use craft list or craft create.');
    }

    subcommand.command(state)(subArgs.join(' '), player);
  },
};
