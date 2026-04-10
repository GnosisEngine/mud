// bundles/world/lib/YamlSerializer.js
'use strict';

// YAML quoting
// Strings that start with YAML-special characters or contain ': ' need
// double-quote wrapping. Descriptions are always quoted — they are prose
// strings long enough to contain colons or other special sequences.

const YAML_SPECIAL_START = /^[\s{}\[\]#&*!|>'"%@`,?:-]/;
const NEEDS_QUOTE_ANYWHERE = /:|#|[\n\r"]|^true$|^false$|^null$/;

function quoteIfNeeded(str) {
  if (str === null || str === undefined) return '""';
  const s = String(str);
  if (s.length === 0) return '""';
  if (YAML_SPECIAL_START.test(s) || NEEDS_QUOTE_ANYWHERE.test(s)) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return s;
}

function quoteAlways(str) {
  const s = String(str || '');
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// Manifest serializer

/**
 * Serializes area metadata to a manifest.yml string.
 *
 * @param {{ title: string, zoneType: string|null }} schema
 * @returns {string}
 */
function serializeManifest({ title, zoneType }) {
  let out = `title: ${quoteIfNeeded(title)}\n`;
  if (zoneType) {
    out += 'metadata:\n';
    out += `  zoneType: ${zoneType}\n`;
  }
  return out;
}

// Rooms serializer

function _serializeExit(exit) {
  return (
    `    - direction: ${exit.direction}\n` +
    `      roomId: ${quoteIfNeeded(exit.roomId)}\n`
  );
}

function _serializeRoom(room) {
  const lines = [];

  lines.push(`- id: ${quoteIfNeeded(room.id)}`);
  lines.push(`  title: ${quoteIfNeeded(room.title)}`);
  lines.push(`  coordinates: [${room.coordinates.join(', ')}]`);

  if (room.keywords && room.keywords.length > 0) {
    lines.push('  keywords:');
    for (const kw of room.keywords) {
      lines.push(`    - ${kw}`);
    }
  }

  lines.push(`  description: ${quoteAlways(room.description)}`);

  if (room.exits && room.exits.length > 0) {
    lines.push('  exits:');
    for (const exit of room.exits) {
      lines.push(_serializeExit(exit).replace(/\n$/, ''));
    }
  }

  return lines.join('\n');
}

/**
 * Serializes an array of room objects to a rooms.yml string.
 *
 * @param {object[]} rooms - from RoomBuilder.build()
 * @returns {string}
 */
function serializeRooms(rooms) {
  if (!rooms || rooms.length === 0) return '';
  return rooms.map(_serializeRoom).join('\n\n') + '\n';
}

module.exports = { serializeManifest, serializeRooms, quoteIfNeeded };
