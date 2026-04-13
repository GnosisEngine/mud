'use strict';

// emoji → trigger keywords (first match wins)
const EMOJI_MAP = [
  // weapons
  ['⚔️',  ['sword', 'longsword', 'broadsword', 'blade', 'claymore', 'saber', 'sabre', 'rapier', 'katana', 'scimitar']],
  ['🗡️',  ['dagger', 'knife', 'dirk', 'stiletto', 'shiv', 'rusty', 'rusted', 'shortsword']],
  ['🪓',  ['axe', 'hatchet', 'cleaver', 'tomahawk']],
  ['🔨',  ['hammer', 'mace', 'maul', 'warhammer', 'club']],
  ['🏹',  ['bow', 'arrow', 'crossbow', 'quiver', 'bolt']],
  ['🔱',  ['trident', 'spear', 'lance', 'pike', 'polearm', 'halberd', 'glaive']],
  ['🪄',  ['staff', 'wand', 'rod', 'scepter', 'sceptre', 'stave']],
  ['🪃',  ['boomerang', 'thrown', 'throwing']],
  ['💣',  ['bomb', 'grenade', 'explosive', 'fuse']],

  // armor / clothing
  ['🛡️',  ['shield', 'buckler', 'aegis', 'targe']],
  ['⛑️',  ['helmet', 'helm', 'coif', 'visor', 'cap', 'hat', 'hood', 'circlet', 'crown', 'tiara']],
  ['🥾',  ['boots', 'boot', 'shoes', 'sandals', 'greaves', 'sabatons']],
  ['🧤',  ['gloves', 'gauntlets', 'mitts', 'handwraps']],
  ['🧥',  ['cloak', 'cape', 'mantle', 'robe', 'coat', 'jacket']],
  ['👗',  ['dress', 'gown', 'garment', 'tunic', 'vestment', 'habit']],
  ['🩱',  ['armor', 'armour', 'chestplate', 'cuirass', 'breastplate', 'mail', 'chainmail', 'platemail']],
  ['💍',  ['ring', 'band', 'signet']],
  ['📿',  ['necklace', 'amulet', 'pendant', 'talisman', 'medallion', 'collar', 'torque']],
  ['🧣',  ['scarf', 'sash', 'belt', 'girdle', 'wrap']],

  // containers / storage
  ['🎒',  ['backpack', 'pack', 'sack', 'bag', 'knapsack', 'rucksack']],
  ['👜',  ['pouch', 'purse', 'coinpurse', 'wallet']],
  ['📦',  ['crate', 'box', 'parcel', 'package', 'container']],
  ['🧰',  ['chest', 'trunk', 'coffer', 'strongbox', 'footlocker']],
  ['🪣',  ['bucket', 'pail', 'barrel', 'cask', 'keg']],
  ['🏺',  ['urn', 'vase', 'jar', 'amphora', 'vessel', 'pot', 'jug', 'pitcher']],
  ['🧪',  ['vial', 'phial', 'flask', 'beaker', 'test tube', 'bottle', 'potion']],

  // food / drink
  ['🍖',  ['meat', 'ration', 'jerky', 'steak', 'ham', 'haunch', 'leg']],
  ['🍞',  ['bread', 'loaf', 'biscuit', 'hardtack', 'roll', 'bun']],
  ['🧀',  ['cheese', 'wheel']],
  ['🍎',  ['apple', 'fruit', 'pear', 'plum', 'peach']],
  ['🧅',  ['onion', 'vegetable', 'carrot', 'turnip', 'root', 'herb']],
  ['🍷',  ['wine', 'mead', 'goblet', 'chalice', 'cup', 'tankard', 'flagon', 'ale', 'brew', 'spirits']],
  ['💧',  ['water', 'waterskin', 'canteen', 'flask']],

  // tools / misc
  ['🔑',  ['key', 'keyring']],
  ['🔒',  ['lock', 'padlock', 'latch']],
  ['🪔',  ['lantern', 'lamp', 'candle', 'torch', 'brazier', 'sconce']],
  ['📜',  ['scroll', 'parchment', 'letter', 'note', 'map', 'document', 'deed', 'warrant']],
  ['📖',  ['book', 'tome', 'grimoire', 'spellbook', 'journal', 'codex', 'manual']],
  ['🪙',  ['coin', 'gold', 'silver', 'copper', 'platinum', 'currency', 'money']],
  ['💎',  ['gem', 'jewel', 'ruby', 'sapphire', 'emerald', 'diamond', 'opal', 'crystal', 'gemstone']],
  ['🧲',  ['magnet', 'lodestone', 'magnetic']],
  ['⚙️',  ['gear', 'cog', 'mechanism', 'sprocket', 'component', 'part']],
  ['🪝',  ['hook', 'grapple', 'grappling']],
  ['🧵',  ['thread', 'needle', 'cloth', 'fabric', 'silk', 'wool', 'linen', 'cotton']],
  ['🪨',  ['stone', 'rock', 'pebble', 'boulder', 'mineral', 'ore', 'flint']],
  ['🪵',  ['wood', 'log', 'plank', 'timber', 'branch', 'stick', 'lumber']],
  ['🌿',  ['plant', 'herb', 'flower', 'root', 'leaf', 'mushroom', 'fungus', 'moss']],
  ['🦴',  ['bone', 'skull', 'skeleton', 'remains', 'relic']],
  ['🐾',  ['pelt', 'hide', 'fur', 'skin', 'leather', 'scale', 'scales', 'feather']],

  // mobs — humanoid
  ['🧙',  ['wizard', 'mage', 'sorcerer', 'witch', 'warlock', 'enchanter', 'conjurer', 'necromancer']],
  ['⚔️',  ['warrior', 'fighter', 'knight', 'guard', 'soldier', 'mercenary', 'bandit', 'brigand']],
  ['🏹',  ['ranger', 'hunter', 'archer', 'scout', 'tracker', 'poacher']],
  ['🗣️ ',  ['merchant', 'trader', 'vendor', 'peddler', 'shopkeeper', 'innkeeper', 'barkeep', 'bartender']],
  ['👤',  ['thief', 'rogue', 'assassin', 'spy', 'pickpocket', 'cutpurse', 'smuggler']],
  ['⛪',  ['priest', 'cleric', 'monk', 'friar', 'paladin', 'inquisitor', 'acolyte', 'bishop', 'abbess']],
  ['👑',  ['king', 'queen', 'prince', 'princess', 'lord', 'lady', 'duke', 'baron', 'noble', 'emperor']],
  ['🧝',  ['elf', 'elven', 'eladrin', 'sylvan', 'drow', 'dark elf']],
  ['🧔',  ['dwarf', 'dwarven', 'gnome', 'halfling', 'hobbit']],
  ['🧟',  ['zombie', 'undead', 'revenant', 'ghoul', 'wight', 'lich', 'draugr']],
  ['👻',  ['ghost', 'specter', 'spectre', 'wraith', 'shade', 'phantom', 'spirit', 'haunt']],
  ['👹',  ['demon', 'devil', 'fiend', 'imp', 'daemon', 'balor', 'pit fiend']],
  ['👺',  ['goblin', 'hobgoblin', 'bugbear', 'kobold', 'gremlin', 'gnoll', 'orc', 'ogre', 'troll']],
  ['🧛',  ['vampire', 'vampyre', 'nosferatu', 'bloodsucker']],
  ['🧜',  ['mermaid', 'merman', 'merfolk', 'siren', 'nixie', 'undine']],
  ['🧚',  ['fairy', 'faerie', 'fae', 'sprite', 'pixie', 'nymph', 'dryad', 'naiad']],
  ['🐉',  ['dragon', 'wyrm', 'wyvern', 'dracolich', 'drake', 'dragonkin', 'serpent', 'basilisk', 'hydra']],

  // mobs — animals
  ['🐺',  ['wolf', 'werewolf', 'lycanthrope', 'hound', 'warg', 'dog', 'cur', 'warhound']],
  ['🐗',  ['boar', 'pig', 'swine', 'hog']],
  ['🐻',  ['bear', 'werebear', 'grizzly', 'ursine', 'polar bear']],
  ['🦁',  ['lion', 'lioness', 'sphinx', 'chimera']],
  ['🐆',  ['cat', 'panther', 'leopard', 'cheetah', 'jaguar', 'cougar', 'tiger', 'lynx', 'feline']],
  ['🐴',  ['horse', 'mare', 'stallion', 'steed', 'destrier', 'pony', 'unicorn', 'pegasus']],
  ['🦅',  ['eagle', 'hawk', 'falcon', 'roc', 'griffon', 'hippogriff', 'bird', 'raven', 'crow']],
  ['🦇',  ['bat', 'vampire bat']],
  ['🐍',  ['snake', 'viper', 'cobra', 'asp', 'serpent', 'naga', 'yuan-ti']],
  ['🕷️',  ['spider', 'arachnid', 'drider', 'ettercap', 'scorpion']],
  ['🐀',  ['rat', 'mouse', 'rodent', 'vermin', 'pest']],
  ['🦟',  ['insect', 'bug', 'beetle', 'roach', 'ant', 'wasp', 'bee', 'fly', 'larvae', 'maggot']],
  ['🐊',  ['crocodile', 'alligator', 'lizard', 'reptile', 'gecko', 'iguana']],
  ['🦑',  ['squid', 'octopus', 'kraken', 'cephalopod', 'tentacle']],
  ['🐢',  ['turtle', 'tortoise', 'terrapin']],
  ['🐟',  ['fish', 'shark', 'eel', 'piranha', 'carp', 'trout']],
  ['🦀',  ['crab', 'lobster', 'crustacean']],
  ['🐛',  ['worm', 'grub', 'larva', 'leech', 'slug', 'snail']],
  ['🐘',  ['elephant', 'mammoth', 'mastodon']],
  ['🦏',  ['rhino', 'rhinoceros', 'triceratops']],
  ['🦍',  ['ape', 'gorilla', 'monkey', 'primate']],

  // constructs / elementals
  ['🤖',  ['golem', 'automaton', 'construct', 'clockwork', 'mechanical', 'animated']],
  ['🔥',  ['fire', 'flame', 'ember', 'inferno', 'elemental', 'magma', 'lava']],
  ['💨',  ['air', 'wind', 'storm', 'gale', 'tempest', 'zephyr']],
  ['🌊',  ['water', 'wave', 'tide', 'flood', 'aquatic']],
  ['🪨',  ['earth', 'stone', 'rock', 'golem', 'gargoyle']],
  ['❄️',  ['ice', 'frost', 'frozen', 'cold', 'blizzard', 'glacial', 'winter']],
  ['⚡',  ['lightning', 'thunder', 'electric', 'storm', 'bolt', 'spark']],
  ['☠️',  ['death', 'shadow', 'void', 'darkness', 'doom', 'plague', 'curse']],
];

function getEmoji(keywords) {
  if (!keywords || !keywords.length) return null;
  const lower = keywords.map(k => k.toLowerCase());
  for (const [emoji, triggers] of EMOJI_MAP) {
    for (const trigger of triggers) {
      if (lower.includes(trigger)) return emoji;
    }
  }
  return null;
}

function getItemEmoji(keywords) {
  return getEmoji(keywords) || '🔹';
}

function getNpcEmoji(keywords) {
  return getEmoji(keywords) || '🧑';
}

module.exports = { getEmoji, getItemEmoji, getNpcEmoji };
