'use strict';

/**
 * @typedef {object} FactionProfile
 * @property {object}  axes
 * @property {object}  brackets
 * @property {number}  renown
 * @property {boolean} isStranger
 */

/**
 * @typedef {object} FactionStance
 * @property {object}  brackets
 * @property {number}  renown
 * @property {boolean} isStranger
 */

/**
 * @typedef {object} FactionService
 * @property {function(number): object|null}                                          getFaction
 * @property {function(): number[]}                                                   getFactionIds
 * @property {function(string, number): Promise<FactionProfile|null>}                 getProfile
 * @property {function(string, number, string): Promise<{profile: FactionProfile, action: string|null}>} applyEvent
 * @property {function(string, number): Promise<FactionStance|null>}                  getStance
 * @property {function(number, number): string|null}                                  getFactionRelation
 * @property {function(object): number[]}                                             getFactionsForRoom
 * @property {function(string, object): object|null}                                  executePolicy
 */

module.exports = {};
