'use strict';

/**
 * @typedef {{ clusters: object[], coords: number[][] }} WorldPath
 *
 * @typedef {object} WorldManager
 * @property {function(object): string|null}                  getTerrainForRoom
 * @property {function(object): number|null}                  getFactionForRoom
 * @property {function(number): object[]}                     getRoomsByFaction
 * @property {function(number): number[]}                     getClustersByFaction
 * @property {function(number, number): object|null}          getEntryByCoords
 * @property {function(): object}                             getClusters
 * @property {function(): object[]}                           getRoadPairs
 * @property {function(number[], number[]): WorldPath|null}   getPath
 * @property {function(number, number): WorldPath|null}       getPathBetweenClusters
 * @property {function(number[], number[]): string|null}      getDirection
 * @property {function(): Map<number, object>}                getClusterIndex
 */

module.exports = {};
