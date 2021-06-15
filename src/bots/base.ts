import { ButtonHandler, ConverseHandler, TextHandler } from '../bottype';
import { getUser, LEVEL_USER, User, UserModel } from '../db/user';
import { Card } from '../utils/cardBuilder';
import { unpackID } from '../utils/helpers';

export type MessageReply = {
  text: (content: string, quote?: string, temp?: boolean) => Promise<string>;
  image: (image: string, temp?: boolean) => Promise<string>;
  file: (file: string, temp?: boolean) => Promise<string>;
  card: (content: Card, quote?: string, temp?: boolean) => Promise<string>;
  update: (content: string, quote?: string) => Promise<void>;
  delete: () => Promise<void>;
  addReaction: (emoji: string[]) => Promise<void>;
  deleteReaction: (emoji: string[], userId?: string) => Promise<void>;
};

export type MessageAction = {
  text: (content: string, quote?: string, onlyTo?: string) => Promise<string>;
  image: (image: string, onlyTo?: string) => Promise<string>;
  file: (file: string, onlyTo?: string) => Promise<string>;
  card: (content: Card, quote?: string, onlyTo?: string) => Promise<string>;
  update: (msgid: string, content: string, quote?: string) => Promise<void>;
  delete: (msgid: string) => Promise<void>;
  addReaction: (msgid: string, emoji: string[]) => Promise<void>;
  deleteReaction: (msgid: string, emoji: string[], userId?: string) => Promise<void>;
};

// empty stub
const EMPTY_ACTIONS: MessageReply & MessageAction = {
  text: async () => null as string,
  image: async () => null as string,
  file: async () => null as string,
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
  public commands: {
    [key: string]: { func: TextHandler; desc: string | boolean | number };
  } = {};
  public buttons: {
    [key: string]: ButtonHandler;
  } = {};
  public converses: {
    [key: string]: { func: ConverseHandler; desc: string | boolean | number };
  } = {};

  constructor(instance: any) {
    this._instance = instance;
  }

  public addCommand(cmd: string, func: TextHandler, desc?: string | boolean | number) {
    this.commands[cmd] = { func, desc };
  }

  public addButton(cmd: string, func: ButtonHandler) {
    this.buttons[cmd] = func;
  }

  public addConverse(cmd: string, func: ConverseHandler, desc?: string | boolean | number) {
    this.converses[cmd] = { func, desc };
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

  // 上传图片获取URL
  public async uploadImage(name: string, data: Buffer): Promise<string> {
    return null;
  }

  // 上传到图片素材库（微信），若不支持素材库则上传成URL
  public async uploadImageAsset(name: string, data: Buffer): Promise<string> {
    return null;
  }

  // 从素材库删除图片素材
  public async deleteImageAsset(id: string): Promise<void> {}

  public async uploadFile(name: string, data: Buffer): Promise<string> {
    return null;
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
  protected _dbuser: User;

  public constructor(bot: GenericBot<BotType>, e: any) {
    this._raw = e;
    this._bot = bot;
    this._dbuser = null;
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

  public get type() {
    return this._type;
  }

  public get bot(): GenericBot<BotType> {
    return this._bot;
  }

  public async fetchUser() {
    if (this._dbuser) return this._dbuser;
    try {
      this._dbuser = await getUser(this.userKey);
    } catch (e) {
      this._dbuser = null;
    }
    return this._dbuser;
  }

  public get user() {
    return this._dbuser;
  }

  public get userLevel() {
    return this.user?.level || LEVEL_USER;
  }

  public async setConverse(key: string, progress: number, context: any) {
    if (this._dbuser) {
      this._dbuser.converseKey = key;
      this._dbuser.converseProgress = progress;
      this._dbuser.converseContext = JSON.stringify(context);
      await this._dbuser.save();
    } else {
      await UserModel.updateOne(
        { userKey: this._userKey },
        {
          $set: {
            converseKey: key,
            converseProgress: progress,
            converseContext: JSON.stringify(context),
          },
        },
        { upsert: true }
      ).exec();
    }
  }

  public async finishConverse() {
    await this.setConverse('', 0, {});
  }

  public async getConverse() {
    return {
      key: this.user?.converseKey || '',
      progress: this.user?.converseProgress || 0,
      context: JSON.parse(this.user?.converseContext || '{}'),
    };
  }

  public get reply(): MessageReply {
    return {
      ...EMPTY_ACTIONS,
      ...this.makeReply(),
    };
  }

  public async fetchUserInfo(): Promise<void> {}
  public abstract makeReply(): Partial<MessageReply>;
}
