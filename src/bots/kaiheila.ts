import { ButtonClickEvent, KaiheilaBot, TextMessage } from 'kaiheila-bot-root';
import { ButtonHandler, TextHandler } from '../bottype';
import { GenericMessage, MessageReply } from './reply';
import { ADMIN_USERS } from '../utils/consts';
import { Card } from '../utils/cardBuilder';
import { packID } from '../utils/helpers';
import { BotInstance } from 'kaiheila-bot-root/dist/BotInstance';

const MSG_TYPES = {
  text: 1,
  card: 10,
};

class KaiheilaMessage extends GenericMessage<BotInstance> {
  public constructor(bot: BotInstance, e: TextMessage | ButtonClickEvent, type: 'text' | 'button') {
    super(bot, e);

    this._type = type;

    if (type == 'text') {
      e = e as TextMessage;
      const tag = `${e.author.username}#${e.author.identifyNum}`;
      this._authorKey = packID({ platform: this.platform, id: e.authorId });
      this._content = e.content;
      this._msgId = e.msgId;
      this._eventMsgId = e.msgId;
      this._author = {
        isAdmin: ADMIN_USERS.map(v => v.id).indexOf(tag) >= 0,
        tag,
        id: e.authorId,
        ...(e as TextMessage).author,
      };
      if (!this._author.nickname) this._author.nickname = this._author.username;
    } else {
      e = e as ButtonClickEvent;
      const tag = `${e.user.username}#${e.user.identifyNum}`;
      this._authorKey = packID({ platform: this.platform, id: e.userId });
      this._content = e.value;
      this._msgId = e.targetMsgId;
      this._eventMsgId = e.msgId;
      this._author = {
        isAdmin: ADMIN_USERS.map(v => v.id).indexOf(tag) >= 0,
        tag,
        ...e.user,
        id: e.userId,
        nickname: e.user.username,
      };
    }

    this._channelId = e.channelId;
    this._channelType = e.channelType as any;
    this._msgTimestamp = e.msgTimestamp;
  }

  public get reply(): MessageReply {
    if (this._channelType == 'PERSON') {
      return {
        reply: async (content: string, quote?: string, temp?: boolean | string) => {
          let type = MSG_TYPES.text;
          const result = await this.bot.API.directMessage.create(
            type,
            this.author.id,
            undefined,
            content,
            quote
          );
          return result.msgId;
        },
        replyCard: async (content: Card, quote?: string, temp?: boolean | string) => {
          let type = MSG_TYPES.card;
          const result = await this.bot.API.directMessage.create(
            type,
            this.author.id,
            undefined,
            content.toString(),
            quote
          );
          return result.msgId;
        },
        update: async (msgId: string, content: string, quote?: string) => {
          await this.bot.API.directMessage.update(msgId, content.toString(), quote);
        },
        delete: async (msgId: string) => {
          await this.bot.API.directMessage.delete(msgId);
        },
        addReaction: async (msgId: string, emoji: string[]) => {
          await this.bot.API.directMessage.addReaction(
            msgId,
            emoji.length > 1 ? emoji[1] : emoji[0]
          );
        },
        deleteReaction: async (msgId: string, emoji: string[], userId?: string) => {
          await this.bot.API.directMessage.deleteReaction(
            msgId,
            emoji.length > 1 ? emoji[1] : emoji[0],
            undefined
          );
        },
      };
    } else {
      return {
        reply: async (content: string, quote?: string, temp?: boolean | string) => {
          let type = MSG_TYPES.text;
          const result = await this.bot.API.message.create(
            type,
            this._channelId,
            content,
            quote,
            typeof temp == 'boolean' ? (temp ? this.author.id : undefined) : temp
          );
          return result.msgId;
        },
        replyCard: async (content: Card, quote?: string, temp?: boolean | string) => {
          let type = MSG_TYPES.card;
          const result = await this.bot.API.message.create(
            type,
            this._channelId,
            content.toString(),
            quote,
            typeof temp == 'boolean' ? (temp ? this.author.id : undefined) : temp
          );
          return result.msgId;
        },
        update: async (msgId: string, content: string, quote?: string) => {
          await this.bot.API.message.update(msgId, content.toString(), quote);
        },
        delete: async (msgId: string) => {
          await this.bot.API.message.delete(msgId);
        },
        addReaction: async (msgId: string, emoji: string[]) => {
          await this.bot.API.message.addReaction(msgId, emoji[0]);
        },
        deleteReaction: async (msgId: string, emoji: string[], userId?: string) => {
          await this.bot.API.message.deleteReaction(msgId, emoji[0], undefined);
        },
      };
    }
  }

  public get platform(): string {
    return 'kaiheila';
  }
}

const Commands: { [key: string]: TextHandler } = {};
const Buttons: { [key: string]: ButtonHandler } = {};

export let kaiheila: BotInstance = null;

export const kaiheilaStart = () => {
  if (!process.env.KAIHEILA_BOT_TOKEN) return;

  kaiheila = new KaiheilaBot(
    process.env.KAIHEILA_BOT_MODE == 'webhook'
      ? {
          mode: 'webhook',
          token: process.env.KAIHEILA_BOT_TOKEN,
          port: parseInt(process.env.KAIHEILA_BOT_PORT),
          verifyToken: process.env.KAIHEILA_BOT_VERIFYTOKEN,
          key: process.env.KAIHEILA_BOT_KEY,
          ignoreDecryptError: false,
        }
      : {
          mode: 'websocket',
          token: process.env.KAIHEILA_BOT_TOKEN,
          ignoreDecryptError: false,
        }
  );

  kaiheila.on('textMessage', (e: TextMessage) => {
    // no bot message
    if (e.author.bot) return;

    if (!e.content.startsWith('.') && !e.content.startsWith('。')) {
      return;
    }

    const text = e.content.replace(/^\. /, '.');
    const command = text.split(' ')[0].slice(1).toLowerCase();

    e.content = text;

    for (let key in Commands) {
      if (key == command) {
        Commands[key](new KaiheilaMessage(kaiheila, e, 'text'), 'text').catch(reason => {
          console.error(`Error proccessing command '${text}'`);
          console.error(reason);
        });
      }
    }
  });

  kaiheila.on('buttonClick', (e: ButtonClickEvent) => {
    if (e.value.startsWith('.')) {
      const command = e.value.split(' ')[0].slice(1);
      for (let key in Commands) {
        if (key == command) {
          Commands[key](new KaiheilaMessage(kaiheila, e, 'button'), 'button').catch(reason => {
            console.error(`Error proccessing command button'${e.value}'`);
            console.error(reason);
          });
        }
      }
    } else {
      for (let key in Buttons) {
        if (e.value == key) {
          Buttons[key](new KaiheilaMessage(kaiheila, e, 'button')).catch(reason => {
            console.error(`Error proccessing event button '${e.value}'`);
            console.error(reason);
          });
        }
      }
    }
  });

  kaiheila.connect();
};

export const kaiheilaAddCommand = (command: string, handler: TextHandler) => {
  Commands[command] = handler;
};

export const kaiheilaAddButton = (command: string, handler: ButtonHandler) => {
  Buttons[command] = handler;
};
