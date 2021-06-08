import { Card } from '../utils/cardBuilder';

export type MessageReply = {
  reply: (content: string | Card, quote?: string, temp?: boolean | string) => Promise<string>;
  replyCard: (content: Card, quote?: string, temp?: boolean | string) => Promise<string>;
  update: (msgId: string, content: string, quote?: string) => Promise<void>;
  delete: (msgId: string) => Promise<void>;
  addReaction: (msgId: string, emoji: string[]) => Promise<void>;
  deleteReaction: (msgId: string, emoji: string[], userId?: string) => Promise<void>;
};

export abstract class GenericMessage<BotType> {
  protected _authorKey: string;
  protected _channelId: string;
  protected _channelType: 'GROUP' | 'PERSON';
  protected _content: string;
  protected _msgId: string;
  protected _eventMsgId: string;
  protected _msgTimestamp: number;
  protected _type: string;
  protected _author: {
    id: string;
    username: string;
    nickname: string;
    avatar?: string;
    online?: boolean;
    identifyNum?: string;
    isAdmin: boolean;
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
  };
  protected _raw: any;
  protected _bot: BotType;

  public constructor(bot: BotType, e: any) {
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

  public get autherKey() {
    return this._authorKey;
  }

  public get channelId() {
    return this._channelId;
  }

  public get channelType() {
    return this._channelType;
  }

  public get bot(): BotType {
    return this._bot;
  }

  public abstract get reply(): MessageReply;
  public abstract get platform(): string;
}
