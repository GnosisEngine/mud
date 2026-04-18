// bundles/lib/lib/EventHelpers.js
'use strict';

/**
 * Converts a SCREAMING_SNAKE_CASE constant key to a camelCase helper name.
 *
 * @param {string} constKey  e.g. 'RESOURCE_ROTTED'
 * @returns {string}         e.g. 'resourceRotted'
 */
function toHelperName(constKey) {
  return constKey.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Builds a map of named emit helpers from an EVENTS constant object and its SCHEMA.
 *
 * Each helper has the signature: (emitterObj, ...payloadArgs) => void
 *
 * When the schema entry has payload keys, the helper assembles the positional
 * args into a named payload object before emitting. When there are no payload
 * keys the helper emits with no second argument.
 *
 * Events with no matching schema entry are silently skipped.
 *
 * @param {Record<string, string>} events  Frozen map of CONST_KEY -> eventName
 * @param {Record<string, object>} schema  Map of eventName -> descriptor
 * @returns {Record<string, Function>}
 */
function buildEmitHelpers(events, schema) {
  /** @type {Record<string, Function>} */
  const helpers = {};

  for (const [constKey, eventName] of Object.entries(events)) {
    const descriptor = schema[eventName];
    if (!descriptor) continue;

    const payloadKeys = Object.keys(descriptor.payload ?? {});

    if (payloadKeys.length === 0) {
      helpers[toHelperName(constKey)] = (emitterObj) => {
        emitterObj.emit(eventName);
      };
    } else {
      helpers[toHelperName(constKey)] = (emitterObj, ...args) => {
        const payload = {};
        payloadKeys.forEach((key, i) => { payload[key] = args[i]; });
        emitterObj.emit(eventName, payload);
      };
    }
  }

  return helpers;
}

module.exports = { toHelperName, buildEmitHelpers };
