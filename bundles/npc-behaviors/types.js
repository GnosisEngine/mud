/**
 * @typedef {object} AggressiveBehaviorConfig
 * @property {number}   [delay]          seconds after a character enters before attacking. Default: 5
 * @property {string}   [warnMessage]    message sent at half delay. Supports %name%. Default: '%name% growls, warning you away.'
 * @property {string}   [attackMessage]  message sent on attack. Supports %name%. Default: '%name% attacks you!'
 * @property {{
 *   players?: boolean,
 *   npcs?:    string[]
 * }}                   [towards]        aggro targets. players defaults true; npcs is list of entityReferences
 */

/**
 * @typedef {object} WanderBehaviorConfig
 * @property {boolean} [areaRestricted]  if true, NPC will not wander outside its home area. Default: false
 * @property {string|null} [restrictTo]  entityReference of a room to restrict wandering to. Default: null
 * @property {number}  [interval]        seconds between wander attempts. Default: 20
 */
