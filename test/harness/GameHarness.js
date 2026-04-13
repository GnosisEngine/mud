// test/harness/GameHarness.js
'use strict';

const path = require('path');
const fs = require('fs');
const Module = require('module');

const REPO_ROOT = process.env.FIEF_ROOT || path.resolve(__dirname, '..', '..');

async function boot() {
  const Ranvier = require('ranvier');
  const { Config } = Ranvier;

  Ranvier.Data.setDataPath(path.join(REPO_ROOT, 'data') + path.sep);

  const confJsPath = path.join(REPO_ROOT, 'ranvier.conf.js');
  const confJsonPath = path.join(REPO_ROOT, 'ranvier.json');

  if (fs.existsSync(confJsPath)) {
    Config.load(require(confJsPath));
  } else if (fs.existsSync(confJsonPath)) {
    Config.load(require(confJsonPath));
  } else {
    throw new Error(`No ranvier.json or ranvier.conf.js found at ${REPO_ROOT}`);
  }

  const Logger = Ranvier.Logger;
  Logger.setLevel('error');

  const GameState = {
    AccountManager: new Ranvier.AccountManager(),
    AreaBehaviorManager: new Ranvier.BehaviorManager(),
    AreaFactory: new Ranvier.AreaFactory(),
    AreaManager: new Ranvier.AreaManager(),
    AttributeFactory: new Ranvier.AttributeFactory(),
    ChannelManager: new Ranvier.ChannelManager(),
    CommandManager: new Ranvier.CommandManager(),
    Config,
    EffectFactory: new Ranvier.EffectFactory(),
    HelpManager: new Ranvier.HelpManager(),
    InputEventManager: new Ranvier.EventManager(),
    ItemBehaviorManager: new Ranvier.BehaviorManager(),
    ItemFactory: new Ranvier.ItemFactory(),
    ItemManager: new Ranvier.ItemManager(),
    MobBehaviorManager: new Ranvier.BehaviorManager(),
    MobFactory: new Ranvier.MobFactory(),
    MobManager: new Ranvier.MobManager(),
    PartyManager: new Ranvier.PartyManager(),
    PlayerManager: new Ranvier.PlayerManager(),
    QuestFactory: new Ranvier.QuestFactory(),
    QuestGoalManager: new Ranvier.QuestGoalManager(),
    QuestRewardManager: new Ranvier.QuestRewardManager(),
    RoomBehaviorManager: new Ranvier.BehaviorManager(),
    RoomFactory: new Ranvier.RoomFactory(),
    RoomManager: new Ranvier.RoomManager(),
    SkillManager: new Ranvier.SkillManager(),
    SpellManager: new Ranvier.SkillManager(),
    ServerEventManager: new Ranvier.EventManager(),
    GameServer: new Ranvier.GameServer(),
    DataLoader: Ranvier.Data,
    EntityLoaderRegistry: new Ranvier.EntityLoaderRegistry(),
    DataSourceRegistry: new Ranvier.DataSourceRegistry(),
  };

  const rootRequire = Module.createRequire(path.join(REPO_ROOT, 'package.json'));

  GameState.DataSourceRegistry.load(rootRequire, REPO_ROOT, Config.get('dataSources'));
  GameState.EntityLoaderRegistry.load(GameState.DataSourceRegistry, Config.get('entityLoaders'));
  GameState.AccountManager.setLoader(GameState.EntityLoaderRegistry.get('accounts'));
  GameState.PlayerManager.setLoader(GameState.EntityLoaderRegistry.get('players'));

  const BundleManager = new Ranvier.BundleManager(
    path.join(REPO_ROOT, 'bundles') + path.sep,
    GameState
  );
  GameState.BundleManager = BundleManager;

  await BundleManager.loadBundles();

  // Wipe the sql.js test database before startup so every run begins clean.
  // The claims bundle creates a fresh test.db during its async startup.
  if (process.env.NODE_ENV === 'test') {

    const files = [
      path.join(REPO_ROOT, 'bundles', 'claims', 'data', 'claims-test.db'),
      path.join(REPO_ROOT, 'bundles', 'claims', 'data', 'claims-test.log.state.json'),
      path.join(REPO_ROOT, 'bundles', 'factions', 'data', 'factions-test.db'),
    ];

    for (const file of files) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }

    const segments = path.join(REPO_ROOT, 'bundles', 'claims', 'data', 'segments-test');
    fs.rmSync(segments, { recursive: true, force: true });
  }

  // Fire all server-events 'startup' listeners so bundles can register things
  // onto state (e.g. state.getTarget, state.TimeService, state.WorldManager).
  // Stub net.createServer so the input-events bundle cannot actually bind a
  // TCP port during the startup emit — the stub is restored immediately after.
  const startupPoll = require(path.join(REPO_ROOT, 'bundles', 'lib', 'lib', 'StartupPoll'));

  const net = require('net');
  const _createServer = net.createServer.bind(net);
  net.createServer = () => {
    const EventEmitter = require('events');
    const mock = new EventEmitter();
    mock.listen = () => mock;
    mock.address = () => ({ port: 0 });
    mock.close = (cb) => { if (cb) cb(); };
    return mock;
  };

  GameState.ServerEventManager.attach(GameState.GameServer);
  GameState.GameServer.startup({});

  // Yield one tick so synchronous startup listeners fire, then poll until the
  // claims bundle's async startup (Db.create → replay → compact) completes
  // and registers StorageManager on state.
  await new Promise(resolve => setImmediate(resolve));
  await startupPoll(
    () => !!GameState.StorageManager,
    async() => {}
  );

  net.createServer = _createServer;

  return GameState;
}

module.exports = { boot, REPO_ROOT };
