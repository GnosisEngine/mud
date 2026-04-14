// tests/causality/patch.js
'use strict';

const EventEmitter = require('events');
const { AsyncLocalStorage } = require('async_hooks');
const tracker = require('./tracker');

const als = new AsyncLocalStorage();
const originalEmit = EventEmitter.prototype.emit;

function resolveRef(emitter) {
  return (
    emitter._ieName ||
    emitter.name ||
    emitter.id ||
    emitter.uuid ||
    emitter.constructor?.name ||
    'unknown'
  );
}

EventEmitter.prototype.emit = function(event, ...args) {
  const parent = als.getStore() ?? null;
  const child = { ref: resolveRef(this), event, ts: Date.now() };
  tracker.record(parent, child);
  return als.run(child, () => originalEmit.call(this, event, ...args));
};
