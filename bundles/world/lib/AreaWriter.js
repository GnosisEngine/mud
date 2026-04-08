// bundles/world/lib/AreaWriter.js
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Returns the absolute path for an area's output directory.
 *
 * @param {string} outputRoot  - base output directory
 * @param {string} folderName  - area folder name from AreaSchema.getFolderName()
 * @returns {string}
 */
function getOutputPath(outputRoot, folderName) {
  if (typeof outputRoot !== 'string' || !outputRoot.length) {
    throw new Error('AreaWriter.getOutputPath: outputRoot must be a non-empty string');
  }
  if (typeof folderName !== 'string' || !folderName.length) {
    throw new Error('AreaWriter.getOutputPath: folderName must be a non-empty string');
  }
  return path.join(outputRoot, folderName);
}

/**
 * Writes manifest.yml and rooms.yml for a single area.
 * Creates the directory if it does not exist.
 * Idempotent — re-running overwrites the previous output cleanly.
 *
 * @param {string} outputRoot   - base output directory
 * @param {string} folderName   - area folder name
 * @param {string} manifestYaml - serialized manifest content
 * @param {string} roomsYaml    - serialized rooms content
 */
function write(outputRoot, folderName, manifestYaml, roomsYaml) {
  if (typeof manifestYaml !== 'string') {
    throw new Error('AreaWriter.write: manifestYaml must be a string');
  }
  if (typeof roomsYaml !== 'string') {
    throw new Error('AreaWriter.write: roomsYaml must be a string');
  }

  const areaPath = getOutputPath(outputRoot, folderName);
  fs.mkdirSync(areaPath, { recursive: true });
  fs.writeFileSync(path.join(areaPath, 'manifest.yml'), manifestYaml, 'utf8');
  fs.writeFileSync(path.join(areaPath, 'rooms.yml'), roomsYaml, 'utf8');
}

module.exports = { write, getOutputPath };