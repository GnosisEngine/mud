// bundles/vendor-npcs/lib/MercNameGenerator.js
'use strict';

const FIRST_NAMES = [
  'Aldric', 'Bram',   'Calla',  'Dwyn',   'Edra',
  'Fenn',   'Gareth', 'Holt',   'Ines',   'Jorn',
  'Kael',   'Lyra',   'Maron',  'Nessa',  'Osric',
  'Petra',  'Rand',   'Sera',   'Thorn',  'Ulva',
  'Vance',  'Wren',   'Yara',   'Zale',   'Bryn',
  'Calder', 'Dara',   'Eryn',   'Falk',   'Gwynn',
];

const LAST_NAMES = [
  'Ashwood',    'Blackthorn', 'Coldwater',  'Duskmantle', 'Embervale',
  'Frostholm',  'Greystone',  'Hawkwind',   'Ironside',   'Kettlemore',
  'Longstride', 'Moorfield',  'Nighthollow','Oakhurst',   'Quickhand',
  'Redwater',   'Silverbrook','Thornwall',  'Underhill',  'Valebridge',
  'Westmarch',  'Ashford',    'Copperfield','Starfall',   'Ironbrow',
];

/**
 * Generate a random mercenary name that is not already in use.
 *
 * @param {Set<string>} [usedNames] — names currently held by the hiring player
 * @returns {string} a "First Last" name
 * @throws {Error} if every combination is already in use
 */
function generate(usedNames = new Set()) {
  const available = [];

  for (const first of FIRST_NAMES) {
    for (const last of LAST_NAMES) {
      const name = `${first} ${last}`;
      if (!usedNames.has(name)) available.push(name);
    }
  }

  if (!available.length) {
    throw new Error('MercNameGenerator: all name combinations are in use for this player');
  }

  return available[Math.floor(Math.random() * available.length)];
}

module.exports = { generate };
