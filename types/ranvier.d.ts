type Ctor<T, A extends any[] = any[]> = new (...args: A) => T;
declare module 'ranvier' {
  export const Broadcast: import('./').RanvierBroadcast;
  export const Logger: import('./').RanvierLogger;
  export const EffectFlag: import('.').RanvierEffectFlag

  export const ItemType: Ctor<import('.').RanvierItemType>
  export const SkillConfig: Ctor<import('.').RanvierSkillConfig>
  export const NotEnoughResourcesError: Ctor<Error>
  export const PassiveError: Ctor<Error>
  export const SkillType: Ctor<import('.').RanvierSkillType>
  export const SkillFlag: Ctor<import('.').RanvierSkillFlag>
  export const PlayerRoles: Ctor<import('.').RanvierPlayerRoles>
  export const Config: Ctor<import('.').RanvierConfig>
  export const ResourceCost: Ctor<import('.').RanvierResourceCost>
  export const Room: Ctor<import('.').RanvierRoom>;
  export const Area: Ctor<import('.').RanvierArea>;
  export const Npc: Ctor<import('.').RanvierNpc>;
  export const Item: Ctor<import('.').RanvierItem>;
  export const Quest: Ctor<import('.').RanvierQuest>;
  export const QuestReward: Ctor<import('.').RanvierQuestReward>;
  export const QuestGoal: Ctor<import('.').RanvierQuestGoal>;
  export const Account: Ctor<import('.').RanvierAccount>;
  export const AreaAudience: Ctor<import('.').RanvierAreaAudience>
  export const PartyAudience: Ctor<import('.').RanvierPartyAudience>
  export const PrivateAudience: Ctor<import('.').RanvierPrivateAudience>
  export const RoomAudience: Ctor<import('.').RanvierRoomAudience>
  export const WorldAudience: Ctor<import('.').RanvierWorldAudience>
  export const CommandTypeValue: Ctor<import('.').RanvierCommandTypeValue>;
  export const CommandType: Ctor<import('.').RanvierCommandType>;
  export const InventoryFullError: Ctor<Error>
  export const CommandManager: Ctor<import('.').RanvierCommandManager>;
  export const EventUtil: import('.').RanvierEventUtil

  export const Player: Ctor<import('.').RanvierPlayer, [
    data: {
      name: string,
      account: import('.').RanvierAccount
    }
  ]>;

  export const Heal: Ctor<import('.').RanvierHeal, [
    stat: string,
    amount: number,
    source: object,
    attacker: object,
    options?: object
  ]>;
  
  export const Damage: Ctor<import('.').RanvierDamage, [
    stat: string,
    amount: number,
    attacker: object,
    source: object,
    options?: object
  ]>;

  export class Channel {
    constructor(options: {
      name: string;
      aliases?: string[];
      color?: string[];
      description: string;
      audience: object;
      formatter: {
        sender: (sender: typeof Player, target: object, message: string, colorify: (s: string) => string) => string;
        target: (sender: typeof Player, target: object, message: string, colorify: (s: string) => string) => string;
      };
    });
  }

  export const Skill: Ctor<import('.').RanvierSkill, [
    id: string,
    config: import('.').RanvierSkillConfig,
    state: import('.').GameState
  ]>

  export const CooldownError: Ctor<import('.').RanvierCooldownError, [
    effect: import('.').RanvierEffect
  ]>

  export const Inventory: Ctor<import('.').RanvierInventory, [
    init?: {
      items?: Array<import('.').RanvierItem>,
      max?: number
    }
  ]>
}