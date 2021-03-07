import { ButtonClickEvent, TextMessage } from 'kaiheila-bot-root';
import { DirectMessageCreateResponseInternal } from 'kaiheila-bot-root/dist/api/directMessage/directMessage.types';
import { MessageCreateResponseInternal } from 'kaiheila-bot-root/dist/api/message/message.types';
import { BotInstance } from 'kaiheila-bot-root/dist/BotInstance';
import axios from 'axios';
import { Card } from './utils/cardBuilder';
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import { DateTime } from 'luxon';

export type ReplyType = keyof typeof TYPES;
const TYPES = {
  text: 1,
  card: 10,
};

export type ReplyTool = {
  create: (
    content: string | Card,
    quote?: string,
    temp?: boolean | string
  ) => Promise<DirectMessageCreateResponseInternal | MessageCreateResponseInternal>;
  update: (msgId: string, content: string, quote?: string) => Promise<boolean>;
  delete: (msgId: string) => Promise<boolean>;
  addReaction: (msgId: string, emoji: string[]) => Promise<boolean>;
  deleteReaction: (msgId: string, emoji: string[], userId?: string) => Promise<boolean>;
};

const dbAdapter = new FileSync(process.env.KAIHEILA_BOT_FILEPATH);

const adminUsers = process.env.KAIHEILA_ADMIN_USERS.split('|');

const tools = {
  axios: axios.create({
    headers: {
      'Accept-Encoding': 'gzip, deflate',
    },
    decompress: true,
    timeout: 10000,
  }),
  db: low(dbAdapter),
  dateTime: (date: number) =>
    DateTime.fromMillis(date).setZone('Asia/Shanghai').toFormat('yyyy/MM/dd HH:mm'),
  date: (date: number) => DateTime.fromMillis(date).setZone('Asia/Shanghai').toFormat('yyyy/MM/dd'),
  secTime: (time: number) => `${Math.floor(time / 60)}分${time % 60}秒`,
};

export const initTools = () => tools;

export class Tools {
  private _authorId: string;
  private _channelId: string;
  private _channelType: 'GROUP' | 'PERSON';
  private _content: string;
  private _msgId: string;
  private _eventMsgId: string;
  private _msgTimestamp: number;
  private bot: BotInstance;
  private _type: string;
  private _author: {
    id: string;
    username: string;
    nickname: string;
    avatar: string;
    online: boolean;
    identifyNum: string;
    isAdmin: boolean;
    tag: string;
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

  public constructor(bot: BotInstance, e: TextMessage | ButtonClickEvent, type: 'text' | 'button') {
    this.bot = bot;
    this._type = type;

    if (type == 'text') {
      e = e as TextMessage;
      const tag = `${e.author.username}#${e.author.identifyNum}`;
      this._authorId = e.authorId;
      this._content = e.content;
      this._msgId = e.msgId;
      this._eventMsgId = e.msgId;
      this._author = {
        isAdmin: adminUsers.indexOf(tag) >= 0,
        tag,
        ...(e as TextMessage).author,
      };
      if (!this._author.nickname) this._author.nickname = this._author.username;
    } else {
      e = e as ButtonClickEvent;
      const tag = `${e.user.username}#${e.user.identifyNum}`;
      this._authorId = e.userId;
      this._content = e.value;
      this._msgId = e.targetMsgId;
      this._eventMsgId = e.msgId;
      this._author = {
        isAdmin: adminUsers.indexOf(tag) >= 0,
        tag,
        ...e.user,
        nickname: e.user.username,
      };
    }

    this._channelId = e.channelId;
    this._channelType = e.channelType as any;
    this._msgTimestamp = e.msgTimestamp;
  }

  public get msgId() {
    return this._msgId;
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

  public get authorId() {
    return this._authorId;
  }

  public get channelId() {
    return this._channelId;
  }

  public get channelType() {
    return this._channelType;
  }

  public get tools() {
    return tools;
  }

  public get reply(): ReplyTool {
    if (this._channelType == 'PERSON') {
      return {
        create: (content: string | Card, quote?: string, temp?: boolean | string) => {
          let type = TYPES.text;
          if (content instanceof Card) type = TYPES.card;
          return this.bot.API.directMessage.create(
            type,
            this._authorId,
            undefined,
            content.toString(),
            quote
          );
        },
        update: (msgId: string, content: string | Card, quote?: string) => {
          return this.bot.API.directMessage.update(msgId, content.toString(), quote);
        },
        delete: (msgId: string) => this.bot.API.directMessage.delete(msgId),
        addReaction: async (msgId: string, emoji: string[]) =>
          this.bot.API.directMessage.addReaction(msgId, emoji.length > 1 ? emoji[1] : emoji[0]),
        deleteReaction: async (msgId: string, emoji: string[], userId?: string) =>
          this.bot.API.directMessage.deleteReaction(
            msgId,
            emoji.length > 1 ? emoji[1] : emoji[0],
            undefined
          ),
      };
    } else {
      return {
        create: (content: string | Card, quote?: string, temp?: boolean | string) => {
          let type = TYPES.text;
          if (content instanceof Card) type = TYPES.card;
          return this.bot.API.message.create(
            type,
            this._channelId,
            content.toString(),
            quote,
            typeof temp == 'boolean' ? (temp ? this._authorId : undefined) : temp
          );
        },
        update: (msgId: string, content: string | Card, quote?: string) => {
          return this.bot.API.message.update(msgId, content.toString(), quote);
        },
        delete: (msgId: string) => this.bot.API.message.delete(msgId),
        addReaction: async (msgId: string, emoji: string[]) =>
          this.bot.API.message.addReaction(msgId, emoji[0]),
        deleteReaction: async (msgId: string, emoji: string[], userId?: string) =>
          this.bot.API.message.deleteReaction(msgId, emoji[0], undefined),
      };
    }
  }
}
