import {
  ButtonClickEvent,
  FileMessage,
  ImageMessage,
  MessageType,
  TextMessage,
  VideoMessage,
} from 'kaiheila-bot-root';
import {
  GenericBot,
  GenericMessage,
  GenericMessageElement,
  MessageAction,
  MessageReply,
} from './base';
import { Card } from '../utils/cardBuilder';
import { packID, unpackID } from '../utils/helpers';
import { BotInstance } from 'kaiheila-bot-root/dist/BotInstance';
import { broadcastMessage } from '../relay';
import { LEVEL_USER } from '../db/user';
import ImageSize from 'image-size';
import axios from 'axios';
import { IncomingMessage } from 'http';
import { kaiheila } from '.';

const getImageWidth = (url: string) => {
  let buffer: Buffer = null;
  let length = 0;
  return new Promise<number>(res => {
    axios
      .get<IncomingMessage>(url, { responseType: 'stream' })
      .then(value => {
        value.data.on('data', (chunk: Buffer) => {
          length += chunk.length;
          if (!buffer) buffer = chunk;
          else buffer = Buffer.concat([buffer, chunk]);

          try {
            const size = ImageSize(buffer);
            value.data.destroy();
            res(size.width);
          } catch {
            if (length > 65536) {
              value.data.destroy();
              res(0);
            }
          }
        });
      })
      .catch(() => {
        res(0);
      });
  });
};

const MSG_TYPES = {
  text: 1,
  image: 2,
  video: 3,
  file: 4,
  markdown: 9,
  card: 10,
};

const PLATFORM = 'kaiheila';

const messageToSegment = (
  bot: GenericBot<any>,
  msg: string,
  quote?: TextMessage
): GenericMessageElement[] => {
  const parts = msg.match(
    /(\[:[^:\s]+:[^\/\s]+\/[^\s]+\])|(\[#[0-9]+;\])|(@[^#\s]+#[0-9]+)|(@role:[0-9]+;)|(@在线成员)|(@全体成员)|(#channel:[0-9]+;)|([^[@#]+)|([\[@#])/gs
  );

  const result: GenericMessageElement[] = [];

  if (quote) {
    result.push({
      type: 'quote',
      platform: bot.platform,
      content: quote.content,
      msgId: quote.msgId,
      userKey: packID({ platform: bot.platform, id: quote.authorId }),
    });
  }

  const textParts: string[] = [];

  const pushText = () => {
    if (textParts.length > 0) {
      result.push({
        type: 'text',
        content: textParts.join(''),
      });
      textParts.splice(0, textParts.length);
    }
  };

  for (const part of parts) {
    const mention = part.match(/@([^#\s]+)#([0-9]+)/);
    if (mention) {
      pushText();
      result.push({
        type: 'mention',
        content: mention[1],
        userKey: packID({ platform: bot.platform, id: mention[2] }),
      });
      continue;
    }
    const channel = part.match(/#channel:([0-9]+);/);
    if (channel) {
      pushText();
      result.push({
        type: 'channel',
        content: 'CHANNEL',
        channelKey: packID({ platform: bot.platform, id: channel[1] }),
      });
      continue;
    }
    const emote = part.match(/\[:([^:\s]+):([^\/\s]+\/[^\s]+)\]/);
    if (emote) {
      pushText();
      result.push({
        type: 'emote',
        platform: bot.platform,
        name: emote[1],
        id: part,
        content: `https://img.kaiheila.cn/emojis/${emote[2]}.png`,
      });
      continue;
    }
    const mentionRole = part.match(/@role:([0-9]+);/);
    if (mentionRole) {
      pushText();
      result.push({
        type: 'notify',
        content: part,
        target: mentionRole[1],
        targetType: 'role',
      });
      continue;
    }
    const unicode = part.match(/\[#([0-9]+);\]/);
    if (unicode) {
      textParts.push(String.fromCodePoint(parseInt(unicode[1])));
      continue;
    }
    if (part === '@全体成员') {
      pushText();
      result.push({
        type: 'notify',
        content: part,
        targetType: 'all',
      });
      continue;
    }
    if (part === '@在线成员') {
      pushText();
      result.push({
        type: 'notify',
        content: part,
        targetType: 'here',
      });
      continue;
    }
    textParts.push(part);
  }
  pushText();
  return result;
};

export const segmentToMessage = (
  bot: GenericBot<any>,
  content: GenericMessageElement[],
  allowMention: boolean = false
): { msg: string; quote?: string } => {
  let quote = undefined;
  const message = [];
  for (const elem of content) {
    if (elem.type == 'quote' && elem.platform == bot.platform && quote != null) {
      quote = elem.msgId;
    } else if (elem.type == 'text') {
      message.push(elem.content);
    } else if (
      allowMention &&
      elem.type == 'mention' &&
      unpackID(elem.userKey).platform == bot.platform
    ) {
      message.push(`@${elem.content}#${unpackID(elem.userKey).id}`);
    } else if (elem.type == 'channel' && unpackID(elem.channelKey).platform == bot.platform) {
      message.push(`#channel:${unpackID(elem.channelKey).id};`);
    } else if (allowMention && elem.type == 'notify' && elem.targetType == 'role') {
      message.push(elem.content); // role 目前只有开黑啦有
    } else if (allowMention && elem.type == 'notify' && elem.targetType == 'all') {
      message.push('@全体成员');
    } else if (allowMention && elem.type == 'notify' && elem.targetType == 'here') {
      message.push('@在线成员');
    } else if (elem.type == 'unknown') {
      message.push(`[${elem.content}]`);
    }
  }
  return { msg: message.join(' '), quote };
};

export const segmentToCard = async (
  bot: GenericBot<any>,
  content: GenericMessageElement[],
  card: Card,
  mention: 'ignore' | 'mention' | 'text' = 'ignore'
): Promise<string> => {
  let quote = undefined;
  const text: string[] = [];
  const images: string[] = [];

  const addText = () => {
    if (text.length > 0) {
      card.addText(text.join(' '));
      text.splice(0, text.length);
    }
  };

  const addImages = async () => {
    while (images.length > 0) {
      const data = images.splice(0, 9).map(src => {
        return { src };
      });
      if (data.length == 1) {
        const width = await getImageWidth(data[0].src);
        if (width <= 256) {
          data.push(
            { src: 'https://teeworlds.cn/null.png' },
            { src: 'https://teeworlds.cn/null.png' }
          );
        } else if (width <= 512) {
          data.push({ src: 'https://teeworlds.cn/null.png' });
        }
      }
      if (data.length > 0) {
        card.addImages(data);
      }
    }
  };

  for (const elem of content) {
    if (elem.type == 'quote' && elem.platform == bot.platform && quote != null) {
      quote = elem.msgId;
    } else if (elem.type == 'quote' && elem.platform != bot.platform) {
      if (elem.content) {
        addText();
        await addImages();
        card.addMarkdown(`> ${elem.content.slice(0, 24)}`);
      } else {
        card.addMarkdown(`> 回复了一条消息\n`);
      }
    } else if (elem.type == 'text') {
      await addImages();
      text.push(elem.content);
    } else if (elem.type == 'mention') {
      if (mention == 'mention' && unpackID(elem.userKey).platform == bot.platform) {
        await addImages();
        text.push(`@${elem.content}#${unpackID(elem.userKey).id}`);
      } else if (mention == 'text') {
        await addImages();
        text.push(`[@${elem.content}]`);
      }
    } else if (elem.type == 'channel' && unpackID(elem.channelKey).platform == bot.platform) {
      await addImages();
      text.push(`#channel:${unpackID(elem.channelKey).id};`);
    } else if (elem.type == 'notify' && elem.targetType == 'role') {
      if (mention == 'mention') {
        await addImages();
        text.push(elem.content);
      } else if (mention == 'text') {
        await addImages();
        text.push(`[@#${elem.targetType}${elem.target ? `:${elem.target}` : ''}]`);
      }
    } else if (elem.type == 'notify' && elem.targetType == 'all') {
      if (mention == 'mention') {
        await addImages();
        text.push('@全体成员');
      } else if (mention == 'text') {
        await addImages();
        text.push(`[@#${elem.targetType}${elem.target ? `:${elem.target}` : ''}]`);
      }
    } else if (elem.type == 'notify' && elem.targetType == 'here') {
      if (mention == 'mention') {
        await addImages();
        text.push('@在线成员');
      } else if (mention == 'text') {
        await addImages();
        text.push(`[@#${elem.targetType}${elem.target ? `:${elem.target}` : ''}]`);
      }
    } else if (elem.type == 'emote') {
      if (elem.content) {
        addText();
        images.push(elem.content);
      } else if (elem.id) {
        text.push(`${elem.id}`);
      } else if (elem.name) {
        text.push(`[${elem.name}]`);
      }
    } else if (elem.type == 'image') {
      if (typeof elem.content == 'string') {
        addText();
        images.push(elem.content);
      } else {
        const url = await bot.uploadImage('image.png', elem.content);
        if (url) {
          addText();
          images.push(url);
        }
      }
    } else if (elem.type == 'unknown') {
      text.push(`[${elem.content}]`);
    }
  }
  addText();
  await addImages();
  return quote;
};

export class KaiheilaBotAdapter extends GenericBot<BotInstance> {
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
      elements: async (content: GenericMessageElement[], rich?: boolean, onlyTo?: string) => {
        if (!rich) {
          const data = segmentToMessage(this, content, true);
          if (!data.msg.trim()) return null;
          try {
            const result = await this.instance.API.message.create(
              MSG_TYPES.text,
              channelId,
              data.msg,
              data.quote,
              onlyTo
            );
            return result.msgId;
          } catch (e) {
            console.warn(`[开黑啦] 发送分段文本消息失败`);
            console.warn(e);
            return null;
          }
        } else {
          const card = new Card('lg');
          if (card.isEmpty) return null;
          const quote = await segmentToCard(this, content, card, 'mention');
          try {
            const result = await this.instance.API.message.create(
              MSG_TYPES.text,
              channelId,
              card.toString(),
              quote || undefined,
              onlyTo
            );
            return result.msgId;
          } catch (e) {
            console.warn(`[开黑啦] 发送分段卡片消息失败`);
            console.warn(e);
            return null;
          }
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
            console.warn(`[开黑啦] 发送图片消息失败`);
            console.warn(e);
            return null;
          }
        }
      },
      file: async (url: string, onlyTo?: string) => {
        try {
          const result = await this.instance.API.message.create(
            MSG_TYPES.file,
            channelId,
            url,
            undefined,
            onlyTo
          );
          return result.msgId;
        } catch (e) {
          console.warn(`[开黑啦] 发送文件消息失败`);
          console.warn(e);
          return null;
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
          return msgId;
        } catch (e) {
          console.warn(`[开黑啦] 更新消息失败`);
          console.warn(e);
          return null;
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
      text: async (content: string, quote?: string, onlyTo?: string) => {
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
      elements: async (content: GenericMessageElement[], rich?: boolean, onlyTo?: string) => {
        if (!rich) {
          const data = segmentToMessage(this, content, true);
          if (!data.msg.trim()) return null;
          try {
            const result = await this.instance.API.directMessage.create(
              MSG_TYPES.text,
              userId,
              undefined,
              data.msg,
              data.quote
            );
            return result.msgId;
          } catch (e) {
            console.warn(`[开黑啦] 发送分段文本消息失败`);
            console.warn(e);
            return null;
          }
        } else {
          const card = new Card('lg');
          if (card.isEmpty) return null;
          const quote = await segmentToCard(this, content, card, 'mention');
          try {
            const result = await this.instance.API.directMessage.create(
              MSG_TYPES.text,
              userId,
              undefined,
              card.toString(),
              quote || undefined
            );
            return result.msgId;
          } catch (e) {
            console.warn(`[开黑啦] 发送分段卡片消息失败`);
            console.warn(e);
            return null;
          }
        }
      },
      file: async (url: string, onlyTo?: string) => {
        try {
          const result = await this.instance.API.directMessage.create(
            MSG_TYPES.file,
            userId,
            undefined,
            url
          );
          return result.msgId;
        } catch (e) {
          console.warn(`[开黑啦] 发送文件失败`);
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
          return msgId;
        } catch (e) {
          console.warn(`[开黑啦] 更新消息失败`);
          console.warn(e);
          return null;
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

  public async uploadFile(name: string, data: Buffer) {
    try {
      const result = await this.instance.API.asset.create(data, {
        filename: name,
        knownLength: data.length,
      });
      return result.url;
    } catch (e) {
      console.warn('[开黑啦] 文件上传失败');
      console.warn(e);
    }
    return null;
  }

  public get platform(): string {
    return PLATFORM;
  }

  public get platformShort(): string {
    return 'KH';
  }

  public connect() {
    this.instance.on('textMessage', async (e: TextMessage) => {
      // no bot message
      if (e.author.bot) return;
      const msg = new KaiheilaMessage(this, e, 'text');
      const text = msg.onlyText;

      if (!text.startsWith('.') && !text.startsWith('。')) {
        if (msg.sessionType == 'DM') {
          // 是私聊的情况下检查会话
          await msg.fillMsgDetail();
          if (msg.userLevel > LEVEL_USER) return;
          const converse = await msg.getConverse();
          const context = converse.context;
          if (converse.key && this.converses[converse.key]) {
            if (msg.userLevel > this.converses[converse.key].level) return;

            const progress = await this.converses[converse.key].func<any>(
              msg,
              converse.progress,
              context
            );
            if (progress && progress >= 0) {
              await msg.setConverse(converse.key, progress, context);
            } else {
              await msg.finishConverse();
            }
          } else if (converse.key) {
            await msg.finishConverse();
          }
        } else if (msg.sessionType == 'CHANNEL') {
          // try relay
          await broadcastMessage(msg);
        }
        return;
      }

      msg.command = text.replace(/^[\.。] ?/, '');
      const command = msg.command.split(' ')[0].toLowerCase();

      if (this.commands[command]) {
        await msg.fillMsgDetail();
        if (msg.userLevel > LEVEL_USER) return;
        if (msg.userLevel > this.commands[command].level) return;

        this.commands[command].func(msg).catch(reason => {
          console.error(`Error proccessing command '${text}'`);
          console.error(reason);
        });
      } else if (msg.sessionType == 'DM' && this.converses[command]) {
        // 只有私聊会触发会话
        await msg.fillMsgDetail();
        if (msg.userLevel > LEVEL_USER) return;
        if (msg.userLevel > this.converses[command].level) return;

        const context = {};
        const progress = await this.converses[command].func<any>(msg, 0, context);
        if (progress && progress >= 0) {
          await msg.setConverse(command, progress, context);
        } else {
          await msg.finishConverse();
        }
      } else if (msg.sessionType == 'CHANNEL') {
        // try relay if no commands are triggered
        await broadcastMessage(msg);
      }
    });

    this.instance.on('imageMessage', async (e: ImageMessage) => {
      // no bot message
      if (e.author.bot) return;
      const msg = new KaiheilaMessage(this, e, 'image');
      if (msg.sessionType == 'DM') {
        // 是私聊的情况下检查会话
        await msg.fillMsgDetail();
        if (msg.userLevel > LEVEL_USER) return;
        const converse = await msg.getConverse();
        const context = converse.context;
        if (converse.key && this.converses[converse.key]) {
          if (msg.userLevel > this.converses[converse.key].level) return;

          const progress = await this.converses[converse.key].func<any>(
            msg,
            converse.progress,
            context
          );
          if (progress && progress >= 0) {
            await msg.setConverse(converse.key, progress, context);
          } else {
            await msg.finishConverse();
          }
        } else if (converse.key) {
          await msg.finishConverse();
        }
      } else if (msg.sessionType == 'CHANNEL') {
        // try relay
        await broadcastMessage(msg);
      }
    });

    const relayUnsupported = async (e: VideoMessage | FileMessage) => {
      // no bot message
      if (e.author.bot) return;
      let type: 'file' | 'video' = 'file';
      if (e.type == MessageType.video) {
        type = 'video';
      }

      const msg = new KaiheilaMessage(this, e, type);
      if (msg.sessionType == 'CHANNEL') {
        // try relay
        await broadcastMessage(msg);
      }
    };

    this.instance.on('videoMessage', relayUnsupported);
    this.instance.on('fileMessage', relayUnsupported);

    // buttons are always LEVEL_USER
    this.instance.on('buttonClick', async (e: ButtonClickEvent) => {
      if (e.value.startsWith('.')) {
        const command = e.value.split(' ')[0].slice(1);
        if (this.commands[command]) {
          this.commands[command].func(new KaiheilaMessage(this, e, 'button')).catch(reason => {
            console.error(`Error proccessing command button'${e.value}'`);
            console.error(reason);
          });
        }
      } else {
        if (this.buttons[e.value]) {
          this.buttons[e.value](new KaiheilaMessage(this, e, 'button')).catch(reason => {
            console.error(`Error proccessing event button '${e.value}'`);
            console.error(reason);
          });
        }
      }
    });

    this.instance.connect();
    this.started = true;
    console.log('Kaiheila Bot Connected');
  }
}
class KaiheilaMessage extends GenericMessage<BotInstance> {
  public constructor(
    bot: KaiheilaBotAdapter,
    e: TextMessage | ButtonClickEvent | ImageMessage | VideoMessage | FileMessage,
    type: 'text' | 'button' | 'image' | 'video' | 'file'
  ) {
    super(bot, e);

    this._type = type == 'button' ? 'button' : 'message';
    this._eventMsgId = e.msgId;

    if (this._type == 'message') {
      e = e as TextMessage | ImageMessage | VideoMessage | FileMessage;
      const tag = `${e.author.username}#${e.author.identifyNum}`;
      const nicktag = `${e.author.nickname}#${e.author.identifyNum}`;
      this._userId = e.authorId;
      this._userKey = packID({ platform: this.bot.platform, id: e.authorId });
      if (type == 'text') {
        const t = e as TextMessage;
        this._content = messageToSegment(this.bot, t.content, t.quote);
      } else if (type == 'image') {
        const i = e as ImageMessage;
        this._content = [
          {
            type: 'image',
            content: i.attachment.url,
          },
        ];
      } else {
        this._content = [
          {
            type: 'unknown',
            content: type,
            platform: this.bot.platform,
            raw: e,
          },
        ];
      }
      this._msgId = e.msgId;
      this._author = {
        tag,
        nicktag,
        id: e.authorId,
        ...(e as TextMessage).author,
      };
      if (!this._author.nickname) this._author.nickname = this._author.username;
    } else {
      e = e as ButtonClickEvent;
      const tag = `${e.user.username}#${e.user.identifyNum}`;
      this._userId = e.userId;
      this._userKey = packID({ platform: this.bot.platform, id: e.userId });
      this._content = [{ type: 'text', content: e.value }];
      this._msgId = e.targetMsgId;
      this._author = {
        tag,
        nicktag: tag,
        ...e.user,
        nickname: e.user.username,
      };
    }

    this._channelKey = packID({ platform: this.bot.platform, id: e.channelId });
    this._channelId = e.channelId;
    this._sessionType = e.channelType == 'GROUP' ? 'CHANNEL' : 'DM';
    this._msgTimestamp = e.msgTimestamp;
  }

  public makeReply(context: MessageAction): Partial<MessageReply> {
    return {
      text: (c, q, t) => context.text(c, q, t ? this.userId : undefined),
      elements: (c, r, t) => context.elements(c, r, t ? this.userId : undefined),
      image: (c, t) => context.image(c, t ? this.userId : undefined),
      file: (c, t) => context.file(c, t ? this.userId : undefined),
      card: (c, q, t) => context.card(c, q, t ? this.userId : undefined),
      delete: () => this.sessionType == 'CHANNEL' && context.delete(this.msgId),
      addReaction: e => context.addReaction(this.msgId, e),
      deleteReaction: (e, u) => context.deleteReaction(this.msgId, e, u),
    };
  }
}
