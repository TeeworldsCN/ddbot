import { ButtonClickEvent, KaiheilaBot, TextMessage } from 'kaiheila-bot-root';
import { GenericBot, GenericMessage, MessageAction, MessageReply } from './base';
import { Card } from '../utils/cardBuilder';
import { packID } from '../utils/helpers';
import { BotInstance } from 'kaiheila-bot-root/dist/BotInstance';

const MSG_TYPES = {
  text: 1,
  image: 2,
  video: 3,
  file: 4,
  markdown: 9,
  card: 10,
};

const PLATFORM = 'kaiheila';
class KaiheilaBotAdapter extends GenericBot<BotInstance> {
  public makeChannelContext(channelId: string): Partial<MessageAction> {
    return {
      text: async (content: string, quote?: string, onlyTo?: string) => {
        try {
          const result = await this.instance.API.message.create(
            MSG_TYPES.text,
            channelId,
            content,
            quote,
            onlyTo
          );
          return result.msgId;
        } catch (e) {
          console.warn(`[开黑啦] 发送消息失败`);
          console.warn(e);
          return null;
        }
      },
      image: async (url: string, onlyTo?: string) => {
        if (!url.startsWith('http')) {
          try {
            const result = await this.instance.API.message.create(
              MSG_TYPES.text,
              channelId,
              `非正常图片消息：${url}`,
              undefined,
              onlyTo
            );
            return result.msgId;
          } catch (e) {
            console.warn(`[开黑啦] 发送非正常图片消息失败`);
            console.warn(e);
            return null;
          }
        } else {
          try {
            const result = await this.instance.API.message.create(
              MSG_TYPES.image,
              channelId,
              url,
              undefined,
              onlyTo
            );
            return result.msgId;
          } catch (e) {
            console.warn(`[开黑啦] 发送消息失败`);
            console.warn(e);
            return null;
          }
        }
      },
      card: async (content: Card, quote?: string, onlyTo?: string) => {
        try {
          const result = await this.instance.API.message.create(
            MSG_TYPES.card,
            channelId,
            content.toString(),
            quote,
            onlyTo
          );
          return result.msgId;
        } catch (e) {
          console.warn(`[开黑啦] 发送卡片失败`);
          console.warn(e);
          return null;
        }
      },
      update: async (msgId: string, content: string, quote?: string) => {
        try {
          await this.instance.API.message.update(msgId, content.toString(), quote);
        } catch (e) {
          console.warn(`[开黑啦] 更新消息失败`);
          console.warn(e);
        }
      },
      delete: async (msgId: string) => {
        try {
          await this.instance.API.message.delete(msgId);
        } catch (e) {
          console.warn(`[开黑啦] 删除消息失败`);
          console.warn(e);
        }
      },
      addReaction: async (msgId: string, emoji: string[]) => {
        try {
          await this.instance.API.message.addReaction(msgId, emoji[0]);
        } catch (e) {
          console.warn(`[开黑啦] 添加回应失败`);
          console.warn(e);
        }
      },
      deleteReaction: async (msgId: string, emoji: string[], userId?: string) => {
        try {
          await this.instance.API.message.deleteReaction(msgId, emoji[0], userId);
        } catch (e) {
          console.warn(`[开黑啦] 删除回应失败`);
          console.warn(e);
        }
      },
    };
  }

  public makeUserContext(userId: string): Partial<MessageAction> {
    return {
      text: async (content: string, quote?: string, temp?: string) => {
        try {
          const result = await this.instance.API.directMessage.create(
            MSG_TYPES.text,
            userId,
            undefined,
            content,
            quote
          );
          return result.msgId;
        } catch (e) {
          console.warn(`[开黑啦] 发送消息失败`);
          console.warn(e);
          return null;
        }
      },
      image: async (url: string, onlyTo?: string) => {
        try {
          const result = await this.instance.API.directMessage.create(
            MSG_TYPES.image,
            userId,
            undefined,
            url
          );
          return result.msgId;
        } catch (e) {
          console.warn(`[开黑啦] 发送图片失败`);
          console.warn(e);
          return null;
        }
      },
      card: async (content: Card, quote?: string, temp?: string) => {
        try {
          const result = await this.instance.API.directMessage.create(
            MSG_TYPES.card,
            userId,
            undefined,
            content.toString(),
            quote
          );
          return result.msgId;
        } catch (e) {
          console.warn(`[开黑啦] 发送卡片失败`);
          console.warn(e);
          return null;
        }
      },
      update: async (msgId: string, content: string, quote?: string) => {
        try {
          await this.instance.API.directMessage.update(msgId, content.toString(), quote);
        } catch (e) {
          console.warn(`[开黑啦] 更新消息失败`);
          console.warn(e);
        }
      },
      delete: async (msgId: string) => {
        try {
          await this.instance.API.directMessage.delete(msgId);
        } catch (e) {
          console.warn(`[开黑啦] 删除消息失败`);
          console.warn(e);
        }
      },
      addReaction: async (msgId: string, emoji: string[]) => {
        try {
          await this.instance.API.directMessage.addReaction(
            msgId,
            emoji.length > 1 ? emoji[1] : emoji[0]
          );
        } catch (e) {
          console.warn(`[开黑啦] 添加回应失败`);
          console.warn(e);
        }
      },
      deleteReaction: async (msgId: string, emoji: string[], userId?: string) => {
        try {
          await this.instance.API.directMessage.deleteReaction(
            msgId,
            emoji.length > 1 ? emoji[1] : emoji[0],
            undefined
          );
        } catch (e) {
          console.warn(`[开黑啦] 删除回应失败`);
          console.warn(e);
        }
      },
    };
  }

  public async uploadImage(name: string, data: Buffer) {
    try {
      const result = await this.instance.API.asset.create(data, {
        filename: name,
        knownLength: data.length,
      });
      return result.url;
    } catch (e) {
      console.warn('[开黑啦] 图片上传失败');
      console.warn(e);
    }
    return null;
  }

  public async uploadImageAsset(name: string, data: Buffer) {
    return this.uploadImage(name, data);
  }

  public get platform(): string {
    return PLATFORM;
  }
}
class KaiheilaMessage extends GenericMessage<BotInstance> {
  public constructor(
    bot: KaiheilaBotAdapter,
    e: TextMessage | ButtonClickEvent,
    type: 'text' | 'button'
  ) {
    super(bot, e);

    this._type = type;

    if (type == 'text') {
      e = e as TextMessage;
      const tag = `${e.author.username}#${e.author.identifyNum}`;
      this._userId = e.authorId;
      this._userKey = packID({ platform: this.bot.platform, id: e.authorId });
      this._content = e.content;
      this._msgId = e.msgId;
      this._eventMsgId = e.msgId;
      this._author = {
        tag,
        id: e.authorId,
        ...(e as TextMessage).author,
      };
      if (!this._author.nickname) this._author.nickname = this._author.username;
    } else {
      e = e as ButtonClickEvent;
      const tag = `${e.user.username}#${e.user.identifyNum}`;
      this._userId = e.userId;
      this._userKey = packID({ platform: this.bot.platform, id: e.userId });
      this._content = e.value;
      this._msgId = e.targetMsgId;
      this._eventMsgId = e.msgId;
      this._author = {
        tag,
        ...e.user,
        nickname: e.user.username,
      };
    }

    this._channelKey = packID({ platform: this.bot.platform, id: e.channelId });
    this._channelId = e.channelId;
    this._sessionType = e.channelType == 'GROUP' ? 'CHANNEL' : 'DM';
    this._msgTimestamp = e.msgTimestamp;
  }

  public makeReply(): Partial<MessageReply> {
    const context =
      this.sessionType == 'DM' ? this.bot.dm(this.userKey) : this.bot.channel(this.channelKey);
    return {
      text: (c, q, t) => context.text(c, q, t ? this.userId : undefined),
      image: (c, t) => context.image(c, t ? this.userId : undefined),
      card: (c, q, t) => context.card(c, q, t ? this.userId : undefined),
      update: (c, q) => context.update(this.msgId, c, q),
      delete: () => context.delete(this.msgId),
      addReaction: e => context.addReaction(this.msgId, e),
      deleteReaction: (e, u) => context.deleteReaction(this.msgId, e, u),
    };
  }
}

export const kaiheila: KaiheilaBotAdapter = new KaiheilaBotAdapter(
  process.env.KAIHEILA_BOT_TOKEN
    ? new KaiheilaBot(
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
      )
    : null
);

export const kaiheilaStart = () => {
  if (!process.env.KAIHEILA_BOT_TOKEN) return;

  kaiheila.instance.on('textMessage', async (e: TextMessage) => {
    // no bot message
    if (e.author.bot) return;

    if (!e.content.startsWith('.') && !e.content.startsWith('。')) {
      const msg = new KaiheilaMessage(kaiheila, e, 'text');
      await msg.fetchUser();
      const converse = await msg.getConverse();
      const context = converse.context;
      if (converse.key && kaiheila.converses[converse.key]) {
        const progress = await kaiheila.converses[converse.key].func<any>(
          msg,
          converse.progress,
          context
        );
        if (progress && progress >= 0) {
          await msg.setConverse(converse.key, progress, context);
        } else {
          await msg.finishConverse();
        }
      }
      return;
    }

    const text = e.content.replace(/^\. /, '.');
    const command = text.split(' ')[0].slice(1).toLowerCase();

    e.content = text;

    const msg = new KaiheilaMessage(kaiheila, e, 'text');
    await msg.fetchUser();

    if (kaiheila.commands[command]) {
      kaiheila.commands[command].func(msg).catch(reason => {
        console.error(`Error proccessing command '${text}'`);
        console.error(reason);
      });
    } else if (kaiheila.converses[command]) {
      const context = {};
      const progress = await kaiheila.converses[command].func<any>(msg, 0, context);
      if (progress && progress >= 0) {
        await msg.setConverse(command, progress, context);
      } else {
        await msg.finishConverse();
      }
    }
  });

  kaiheila.instance.on('buttonClick', async (e: ButtonClickEvent) => {
    if (e.value.startsWith('.')) {
      const command = e.value.split(' ')[0].slice(1);
      if (kaiheila.commands[command]) {
        kaiheila.commands[command]
          .func(new KaiheilaMessage(kaiheila, e, 'button'))
          .catch(reason => {
            console.error(`Error proccessing command button'${e.value}'`);
            console.error(reason);
          });
      }
    } else {
      if (kaiheila.buttons[e.value]) {
        kaiheila.buttons[e.value](new KaiheilaMessage(kaiheila, e, 'button')).catch(reason => {
          console.error(`Error proccessing event button '${e.value}'`);
          console.error(reason);
        });
      }
    }
  });

  kaiheila.instance.connect();
};
