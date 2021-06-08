import { Card } from '../utils/cardBuilder';
import { unpackID } from '../utils/helpers';

export type MessageReply = {
  text: (content: string, quote?: string, temp?: boolean) => Promise<string>;
  card: (content: Card, quote?: string, temp?: boolean) => Promise<string>;
  update: (content: string, quote?: string) => Promise<void>;
  delete: () => Promise<void>;
  addReaction: (emoji: string[]) => Promise<void>;
  deleteReaction: (emoji: string[], userId?: string) => Promise<void>;
};

export type MessageAction = {
  text: (content: string, quote?: string, temp?: string) => Promise<string>;
  card: (content: Card, quote?: string, temp?: string) => Promise<string>;
  update: (msgid: string, content: string, quote?: string) => Promise<void>;
  delete: (msgid: string) => Promise<void>;
  addReaction: (msgid: string, emoji: string[]) => Promise<void>;
  deleteReaction: (msgid: string, emoji: string[], userId?: string) => Promise<void>;
};

// empty stub
const EMPTY_ACTIONS: MessageReply & MessageAction = {
  text: async () => null as string,
  card: async () => null as string,
  addReaction: async () => {},
  deleteReaction: async () => {},
  update: async () => {},
  delete: async () => {},
};

export interface UserInfo {
  username: string;
  nickname: string;
  avatar?: string;
  online?: boolean;
  identifyNum?: string;
  tag?: string;
  roles?: number[];
  game?: {
    icon: string;
    id: number;
    name: string;
    startTime: number;
    type: number;
  };
  music?: {
    musicName: string;
    singer: string;
    software: string;
    startTime: number;
  };
  isMaster?: boolean;
  mobileVerified?: boolean;
  hoistInfo?: {
    color: number;
    name: string;
    roleId: number;
  };
}

export abstract class GenericBot<BotType> {
  protected _instance: any;

  constructor(instance: any) {
    this._instance = instance;
  }

  // 频道相关
  public channel(channelKey: string): MessageAction {
    const { platform, id } = unpackID(channelKey);
    if (platform !== this.platform) return EMPTY_ACTIONS;

    return {
      ...EMPTY_ACTIONS,
      ...this.makeChannelContext(id),
    };
  }

  // 私聊相关
  public dm(userKey: string): MessageAction {
    const { platform, id } = unpackID(userKey);
    if (platform !== this.platform) return EMPTY_ACTIONS;

    return {
      ...EMPTY_ACTIONS,
      ...this.makeUserContext(id),
    };
  }

  public get instance(): BotType {
    return this._instance;
  }

  public abstract makeChannelContext(channelId: string): Partial<MessageAction>;
  public abstract makeUserContext(userId: string): Partial<MessageAction>;
  public abstract get platform(): string;
}

export abstract class GenericMessage<BotType> {
  protected _userKey: string;
  protected _userId: string;
  protected _channelKey: string;
  protected _channelId: string;
  protected _sessionType: 'CHANNEL' | 'DM';
  protected _content: string;
  protected _msgId: string;
  protected _eventMsgId: string;
  protected _msgTimestamp: number;
  protected _type: string;
  protected _author: UserInfo;
  protected _raw: any;
  protected _bot: GenericBot<BotType>;

  public constructor(bot: GenericBot<BotType>, e: any) {
    this._raw = e;
    this._bot = bot;
  }

  public get raw(): any {
    return this.raw;
  }

  public get msgId() {
    return this._msgId;
  }

  public get eventId() {
    return this._eventMsgId;
  }

  public get msgTimestamp() {
    return this._msgTimestamp;
  }

  public get content() {
    return this._content;
  }

  public get author() {
    return this._author;
  }

  public get userKey() {
    return this._userKey;
  }

  public get userId() {
    return this._userId;
  }

  public get channelKey() {
    return this._channelKey;
  }

  public get channelId() {
    return this._channelId;
  }

  public get sessionType() {
    return this._sessionType;
  }

  public get bot(): GenericBot<BotType> {
    return this._bot;
  }

  public get reply(): MessageReply {
    return {
      ...EMPTY_ACTIONS,
      ...this.makeReply(),
    };
  }

  public abstract makeReply(): Partial<MessageReply>;
}
