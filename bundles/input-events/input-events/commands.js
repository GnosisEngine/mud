'use strict';

const { Broadcast: B, Config, CommandType, Logger, PlayerRoles, Room } = require('ranvier');
const { NoPartyError, NoRecipientError, NoMessageError } = require('ranvier').Channel;
const { CommandParser, InvalidCommandError, RestrictedCommandError } = require('../../lib/lib/CommandParser');
const { emit: playerEmit } = require('../../player-events/events');
const { complete } = require('../../telnet-networking/lib/TabCompleter');
const Communication = require('../../channels/lib/communication');
const sty = require('sty');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Keeps the LineEditor's stored prompt string in sync with the player's
// current prompt after each B.prompt() call. The LineEditor uses this string
// when redrawing the input line during history navigation.
//
// Intentionally a no-op when no LineEditor is attached (e.g. websocket
// connections or sessions created before the line editor was introduced).
function _syncPrompt(player) {
  if (!player.socket._lineEditor) return;
  const promptStr = sty.parse(player.interpolatePrompt(player.prompt) + ' ');
  player.socket._lineEditor.setPrompt(promptStr);
}

// Registers the tab-completion function on the player's LineEditor.
// Called once per session on first entry to the command loop — the guard on
// _completerRegistered prevents re-registration on every subsequent command.
//
// No-op when no LineEditor is attached (websocket, test harness, etc.).
function _registerCompleter(state, player) {
  if (!player.socket._lineEditor || player._completerRegistered) return;
  player._completerRegistered = true;
  player.socket._lineEditor.setCompleter(input => complete(state, player, input));
}

// True when a submitted line dispatches as a communication channel (say, tell,
// yell, chat, gtell, or a dynamic channel). Reuses the command parser so the
// classification matches dispatch exactly, including command-vs-channel
// precedence and prefix matching. Unparseable lines are not communications.
function _isCommunication(state, player, line) {
  try {
    const result = CommandParser.parse(state, line.trim(), player);
    return result.type === CommandType.CHANNEL;
  } catch (e) {
    return false;
  }
}

// Registers a history filter that keeps communications out of up/down history.
// Called once per session; guarded like the completer.
//
// No-op when no LineEditor is attached (websocket, test harness, etc.).
function _registerHistoryFilter(state, player) {
  if (!player.socket._lineEditor || player._historyFilterRegistered) return;
  player._historyFilterRegistered = true;
  player.socket._lineEditor.setHistoryFilter(line => !_isCommunication(state, player, line));
}

/**
 * Main command loop. All player input after login goes through here.
 * If you want to swap out the command parser this is the place to do it
 */
module.exports = {
  event: state => player => {
    _registerCompleter(state, player);
    _registerHistoryFilter(state, player);

    player.socket.once('data', data => {
      function loop() {
        player.socket.emit('commands', player);
      }
      data = data.toString().trim();

      if (!data.length) {
        return loop();
      }

      player._lastCommandTime = Date.now();

      try {
        // allow for modal commands, _commandState is set below when command.execute() returns a value
        if (player._commandState) {
          const { state: commandState, command } = player._commandState;
          // note this calls command.func(), not command.execute()
          const newState = command.func(data, player, command.name, commandState);
          if (newState) {
            player._commandState.state = newState;
          } else {
            player._commandState = null;
            B.prompt(player);
            _syncPrompt(player);
          }

          loop();
          return;
        }

        const result = CommandParser.parse(state, data, player);
        if (!result) {
          throw null;
        }
        switch (result.type) {
          case CommandType.MOVEMENT: {
            playerEmit.move(player, result.roomExit);
            break;
          }

          case CommandType.COMMAND: {
            const { requiredRole = PlayerRoles.PLAYER } = result.command;
            if (requiredRole > player.role) {
              throw new RestrictedCommandError();
            }
            // commands have no lag and are not queued, just immediately execute them
            const state = result.command.execute(result.args, player, result.originalCommand);
            if (state) {
              player._commandState = {
                command: result.command,
                state,
              };

              // bypasses prompt
              loop();
              return;
            }

            player._commandState = null;
            break;
          }

          case CommandType.CHANNEL: {
            const { channel } = result;
            if (channel.minRequiredRole !== null && channel.minRequiredRole > player.role) {
              throw new RestrictedCommandError();
            }

            const commConfig = Config.get('communication');

            // Level gate. Tell is gated in its own formatter (reply-only below
            // the tell level); every other channel is gated here by player level.
            if (commConfig && channel.name !== 'tell') {
              const levelCheck = Communication.checkLevel(commConfig, player, channel.name);
              if (!levelCheck.allowed) {
                B.sayAt(player, levelCheck.message);
                break;
              }
            }

            // Rate limit (gtell exempt via config). Checked before sending;
            // recorded only after a message actually goes out.
            if (commConfig) {
              const rateCheck = Communication.checkRate(commConfig, player, channel.name);
              if (!rateCheck.allowed) {
                B.sayAt(player, rateCheck.message);
                break;
              }
            }

            try {
              channel.send(state, player, result.args);
              if (commConfig) {
                Communication.recordCommunication(commConfig, player, channel.name);
              }
            } catch (error) {
              switch (true) {
                case error instanceof NoPartyError:
                  B.sayAt(player, "You aren't in a group.");
                  break;
                case error instanceof NoRecipientError:
                  B.sayAt(player, 'Send the message to whom?');
                  break;
                case error instanceof NoMessageError:
                  B.sayAt(player, `\r\nChannel: ${channel.name}`);
                  B.sayAt(player, 'Syntax: ' + channel.getUsage());
                  if (channel.description) {
                    B.sayAt(player, channel.description);
                  }
                  break;
              }
            }
            break;
          }

          case CommandType.SKILL: {
            // See bundles/ranvier-player-events/player-events.js commandQueued and updateTick for when these
            // actually get executed
            player.queueCommand({
              execute: _ => {
                player.emit('useAbility', result.skill, result.args);
              },
              label: data,
            }, result.skill.lag || state.Config.get('skillLag') || 1000);
            break;
          }
        }
      } catch (error) {
        switch (true) {
          case error instanceof InvalidCommandError:
            if (player.room && player.room instanceof Room) {
              // check to see if room has a matching context-specific command
              const roomCommands = player.room.getMeta('commands');
              const [commandName, ...args] = data.split(' ');
              if (roomCommands && roomCommands.includes(commandName)) {
                player.room.emit('command', player, commandName, args.join(' '));
                break;
              }
            }

            B.sayAt(player, 'Huh?');
            // Log only the attempted command word, never the arguments, so no
            // message content (a mistyped communication, stray text, etc.)
            // reaches the logs.
            Logger.warn(`WARNING: Player tried non-existent command '${data.split(' ')[0]}'`);
            break;
          case error instanceof RestrictedCommandError:
            B.sayAt(player, "You can't do that.");
            break;
          default:
            Logger.error(error);
        }
      }

      B.prompt(player);
      _syncPrompt(player);
      loop();
    });
  }
};