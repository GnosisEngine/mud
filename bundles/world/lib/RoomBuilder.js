// bundles/world/lib/RoomBuilder.js
'use strict';

const { getRoomId } = require('./AreaSchema');

// ---------------------------------------------------------------------------
// Terrain display data
// Keyed by terrain name string from world.json legends.terrain.
// Unknown terrain falls back to FALLBACK_* values — never throws.
// ---------------------------------------------------------------------------

const FALLBACK_TITLE = 'Open Ground';
const FALLBACK_DESC  = 'Unremarkable ground stretches away in every direction.';

const TERRAIN_TITLES = {
  bog:               'Bogland',
  cave:              'Cave',
  forest_coniferous: 'Coniferous Forest',
  forest_deciduous:  'Deciduous Forest',
  hills:             'Hillside',
  forest_edge:       'Forest Edge',
  grassland:         'Grassland',
  meadow:            'Meadow',
  lakeshore:         'Lakeshore',
  mountain_outcrop:  'Mountain Outcrop',
  mountain_valley:   'Mountain Valley',
  mountain:          'Mountain',
  river:             'Riverbank',
  pasture:           'Pasture',
  wetland:           'Wetland',
};

const TERRAIN_DESCS = {
  bog:
    'Dark water seeps between hummocks of peat moss. The ground yields softly underfoot, ' +
    'and the air carries a sweet rot smell that hangs in the stillness.',
  cave:
    'The rock closes in overhead, dripping with cold water. Every sound echoes further than ' +
    'it should, and the darkness beyond has no clear edge.',
  forest_coniferous:
    'Tall pines rise in close columns, their resinous scent heavy in the still air. ' +
    'The needle carpet muffles every step and the light filters in thin and pale.',
  forest_deciduous:
    'Broad oaks and elms spread a canopy high overhead. Shafts of afternoon light fall ' +
    'through the leaves onto the mossy ground, and insects move lazily in the warmth.',
  hills:
    'The land rolls upward in long grassy swells. The footing is firm but the slope is ' +
    'relentless, and the wind off the ridgeline carries a chill even in summer.',
  forest_edge:
    'The trees thin here at the margin between wood and open ground. Shrubs and bramble ' +
    'fill the gaps where light reaches the earth, and the air smells of bruised greenery.',
  grassland:
    'Open ground stretches in every direction, covered in coarse grass bent by the ' +
    'prevailing wind. Insects hum somewhere in the heat.',
  meadow:
    'Wildflowers dot the thick grass in loose drifts of colour. The air is warm and ' +
    'fragrant, alive with the steady movement of bees between blossoms.',
  lakeshore:
    'The water lies flat and still just ahead. Reeds crowd the muddy margin and small ' +
    'wading birds pick through the shallows without much hurry.',
  mountain_outcrop:
    'Rock breaks through the thin soil in great rounded slabs. The going is difficult ' +
    'here, with loose stone underfoot and few handholds on the steeper faces.',
  mountain_valley:
    'The peaks rise steeply on either side, funneling wind along the narrow valley floor. ' +
    'A stream runs somewhere nearby, its sound bouncing off the rock walls.',
  mountain:
    'The slope is steep and the air noticeably thin. The rock is bare of soil, cut by ' +
    'frost and time into sharp edges and unstable rubble.',
  river:
    'The river runs fast and dark, cutting a deep channel through the bank. The sound of ' +
    'moving water fills the air and the ground near the edge is soft and unreliable.',
  pasture:
    'Low enclosed fields of cropped grass stretch away, bounded by ancient hedgerow. ' +
    'The land feels managed and worked, and there are signs of animals having been through.',
  wetland:
    'Standing water covers much of the ground, broken by tufts of sedge and scrubby ' +
    'willow. Every step needs testing before weight is put on it.',
};

const ROAD_DESC =
  'A worn track cuts through the landscape, the earth packed hard by foot traffic and ' +
  'the wheels of carts. The way ahead is clear enough.';

// Feature name → title modifier function
function _applyFeatureTitleModifier(baseTitle, featureName) {
  if (featureName === 'outpost') return `${baseTitle} Settlement`;
  if (featureName === 'road')    return `${baseTitle} Road`;
  return baseTitle;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds the room data object for a single world tile.
 *
 * @param {object}   tile    - resolved tile (coords, terrain, feature, canonicalCluster)
 * @param {object[]} exits   - from ExitResolver.resolve()
 * @param {object}   legends - from WorldLoader.load()
 * @returns {object}         - room data ready for YamlSerializer
 */
function build(tile, exits, legends) {
  const [x, y]     = tile.coords;
  const terrainName = legends.terrain[String(tile.terrain)] || 'none';
  const featureName = legends.features[String(tile.feature)] || 'none';
  const isRoad      = featureName === 'road';

  const baseTitle = TERRAIN_TITLES[terrainName] || FALLBACK_TITLE;
  const title     = _applyFeatureTitleModifier(baseTitle, featureName);
  const desc      = isRoad ? ROAD_DESC : (TERRAIN_DESCS[terrainName] || FALLBACK_DESC);

  const room = {
    id:          getRoomId(x, y),
    title,
    coordinates: [x, y, 0],
    metadata:    {
      terrain:     terrainName,
      // worldCoords: [x, y],
    },
    description: desc,
  };

  if (exits && exits.length > 0) {
    room.exits = exits;
  }

  return room;
}

module.exports = { build };