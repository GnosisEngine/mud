// test/harness/MockTransport.js
'use strict';

const { TransportStream } = require('ranvier');

class MockTransport extends TransportStream {
  constructor() {
    super();
    this._chunks = [];
    this._prompted = false;
  }

  get writable() {
    return true;
  }

  get readable() {
    return true;
  }

  write(data) {
    if (data !== undefined && data !== null && data !== '') {
      this._chunks.push(String(data));
    }
  }

  drain() {
    const out = this._chunks.join('');
    this._chunks = [];
    return out;
  }

  address() {
    return '127.0.0.1';
  }
}

module.exports = MockTransport;
