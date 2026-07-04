'use strict';

const Telnet = require('ranvier-telnet');
const { Config, Logger } = require('ranvier');
const TelnetStream = require('../lib/TelnetStream');
const LineEditor   = require('../lib/LineEditor');
const linkMonitor  = require('../../session/lib/linkMonitor');

module.exports = {
  listeners: {
    startup: state => function(commander) {
      /**
      * Effectively the 'main' game loop but not really because it's a REPL
      */
      const maxPromptLength = (Config.get('communication') || {}).maxPromptLength;

      const server = new Telnet.TelnetServer(rawSocket => {
        const telnetSocket = new Telnet.TelnetSocket();
        telnetSocket.attach(rawSocket);

        const stream = new TelnetStream();
        stream.attach(telnetSocket);

        const lineEditor = new LineEditor(stream, maxPromptLength);
        stream.attachLineEditor(lineEditor);

        stream.on('interrupt', () => {
          stream.write('\r\n*interrupt*\r\n');
        });

        stream.on('error', err => {
          if (err.errno === 'EPIPE') {
            return Logger.error('EPIPE on write. A websocket client probably connected to the telnet port.');
          }

          Logger.error(err);
        });

        // Register all of the input events (login, etc.)
        state.InputEventManager.attach(stream);

        // Track link state for ethereal/grace handling on disconnect
        linkMonitor.attach(state, stream);

        stream.write('Connecting...\r\n');
        Logger.log('User connected...');

        // @see: bundles/ranvier-events/events/login.js
        stream.emit('intro', stream);
      }).netServer;

      // Start the server and setup error handlers.
      server.listen(commander.port).on('error', err => {
        if (err.code === 'EADDRINUSE') {
          Logger.error(`Cannot start server on port ${commander.port}, address is already in use.`);
          Logger.error('Do you have a MUD server already running?');
        } else if (err.code === 'EACCES') {
          Logger.error(`Cannot start server on port ${commander.port}: permission denied.`);
          Logger.error('Are you trying to start it on a priviledged port without being root?');
        } else {
          Logger.error('Failed to start MUD server:');
          Logger.error(err);
        }
        process.exit(1);
      });

      Logger.log(`Telnet server started on port: ${commander.port}...`);
    },

    shutdown: () => function() {
    },
  }
};