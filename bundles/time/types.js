'use strict';

/**
 * @typedef {{ name: string, emoji: string, index: number }} PhaseInfo
 * @typedef {{ name: string, index: number | null }} NamedIndex
 *
 * @typedef {object} TimeService
 * @property {function(): number}                getTick
 * @property {function(number=): string}         getFormalTime
 * @property {function(number=): NamedIndex}     getMonth
 * @property {function(number=): NamedIndex}     getDayOfWeek
 * @property {function(number=): number|null}    getDayOfMonth
 * @property {function(number=): number}         getHour
 * @property {function(number=): number}         getMinute
 * @property {function(number=): PhaseInfo}      getMoonPhase
 * @property {function(number=): PhaseInfo}      getDayPhase
 * @property {function(number=): PhaseInfo}      getMoonSkyPosition
 * @property {function(number=): string}         getTimePosition
 */

module.exports = {};
