import {
  GenericBotAdapter,
  GenericMessage,
  GenericMessageElement,
  MessageAction,
  MessageReply,
  quotify,
} from './base';
import { createOpenAPI, createWebsocket, MessageToCreate } from 'qq-guild-bot';
import { broadcastRelay, RelayMessage } from '../relay';
import { eQuote, eText, eImage } from '../utils/messageElements';
import { LEVEL_USER } from '../db/user';
import { unpackChannelID, unpackID } from '../utils/helpers';

export interface QQGuildBot {
  client: ReturnType<typeof createOpenAPI>;
  ws: ReturnType<typeof createWebsocket>;
}

export interface GuildMessageCreate {
  eventId: string;
  eventType: 'MESSAGE_CREATE';
  msg: {
    attachments?: {
      content_type: string;
      filename: string;
      height?: number;
      width?: number;
      id: string;
      size: number;
      url: string;
    }[];
    author: {
      avatar: string;
      bot: false;
      id: string;
      username: string;
    };
    channel_id: string;
    content: string;
    guild_id: string;
    id: string;
    member: {
      joined_at: string;
      nick: string;
      roles: string[];
    };
    message_reference?: {
      message_id: string;
    };
    seq: number;
    seq_in_channel: number;
    timestamp: string;
  };
}

export interface GuildMessageDelete {
  eventId: string;
  eventType: 'MESSAGE_DELETE';
  msg: {
    message: {
      author: {
        bot: false;
        id: string;
        username: string;
      };
      channel_id: string;
      guild_id: string;
      id: string;
    };
    op_user: {
      id: string;
    };
  };
}

export interface GuildReactionAdd {
  eventId: string;
  eventType: 'MESSAGE_REACTION_ADD';
  msg: {
    channel_id: string;
    emoji: {
      id: string;
      type: number;
    };
    guild_id: string;
    target: {
      id: string;
      type: number;
    };
    user_id: string;
  };
}

export interface GuildReactionRemove {
  eventId: string;
  eventType: 'MESSAGE_REACTION_REMOVE';
  msg: {
    channel_id: string;
    emoji: {
      id: string;
      type: number;
    };
    guild_id: string;
    target: {
      id: string;
      type: number;
    };
    user_id: string;
  };
}

export type GuildMessage = GuildMessageCreate | GuildMessageDelete;

export const elementsToQQGuildMessage = (
  bot: GenericBotAdapter<any>,
  content: GenericMessageElement[],
  mention: 'ignore' | 'mention' | 'text' = 'ignore'
) => {
  const msg: MessageToCreate = {};
  const textContent = [];

  for (const elem of content) {
    if (elem.type == 'quote' && elem.platform == bot.platformKey) {
      msg.message_reference = {
        message_id: elem.msgId,
      };
      break;
    }
  }

  for (const elem of content) {
    if (elem.type == 'text') {
      textContent.push(elem.content.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    } else if (elem.type == 'quote' && elem.platform != bot.platformKey) {
      if (elem.content) {
        textContent.push('\n' + quotify(elem.content) + '---\n');
      }
    } else if (elem.type == 'mention') {
      const unpacked = unpackID(elem.userKey);
      if (mention == 'mention' && unpacked.platform == bot.platformKey) {
        textContent.push(`<@${unpacked.id}>`);
      } else if (mention == 'text') {
        if (elem.content != 'everyone') textContent.push(` @${elem.content} `);
      }
    } else if (elem.type == 'notify' && elem.targetType == 'all') {
      textContent.push(` @everyone `);
    } else if (elem.type == 'notify' && mention == 'text') {
      // 不支持
    } else if (elem.type == 'channel') {
      const unpacked = unpackChannelID(elem.channelKey);
      if (mention == 'mention' && unpacked.platform == bot.platformKey) {
        textContent.push(` <#${unpacked.id}>`);
      } else if (elem.content) {
        textContent.push(` #${elem.content} `);
      }
    } else if (elem.type == 'emote') {
      if (elem.id) {
        textContent.push(`emoji:${elem.id}`);
      } else if (elem.content) {
        textContent.push(elem.content);
      } else if (elem.name) {
        textContent.push(`[${elem.name}]`);
      }
    } else if (elem.type == 'image') {
      if (elem.content && typeof elem.content == 'string') {
        msg.image = elem.content;
      }
    } else if (elem.type == 'link') {
      textContent.push(`${elem.url}`);
    } else if (elem.type == 'unknown') {
      textContent.push(`[${elem.content}]`);
    }
  }

  msg.content = textContent.join('');

  return msg;
};

class QQGuildBotMessage extends GenericMessage<QQGuildBot> {
  constructor(bot: QQGuildBotAdapter, msg: GuildMessageCreate) {
    super(bot, msg);

    this._content = [];
    this._channelId = msg.msg.channel_id;
    this._channelKey = this.bot.packChannelID(this._channelId);
    this._userId = msg.msg.author.id;
    this._userKey = this.bot.packID(this._userId);
    this._msgTimestamp = Number(new Date(msg.msg.timestamp)) * 1000;
    this._sessionType = 'CHANNEL';
    this._msgId = msg.msg.id;
    this._eventMsgId = msg.msg.id;
    this._type = 'message';
    this._author = {
      username: msg.msg.author.username,
      nickname: msg.msg.author.username,
      avatar: msg.msg.author.avatar,
    };
    this._raw = msg;
  }

  public async processMessage() {
    const msg = this._raw as GuildMessageCreate;
    if (this._content.length > 0) return;
    if (msg.msg.message_reference) {
      try {
        const result = await this.bot.instance.client.messageApi.message(
          msg.msg.channel_id,
          msg.msg.message_reference.message_id
        );
        this._content.push(
          eQuote(msg.msg.message_reference.message_id, result.data.message.content, 'qqguild')
        );
      } catch (e) {
        /** ignored */
      }
    }

    if (msg.msg.content) {
      this._content.push(eText(msg.msg.content));
    }

    if (msg.msg.attachments) {
      for (const attachment of msg.msg.attachments) {
        if (attachment.content_type.indexOf('image/') === 0) {
          this._content.push(eImage(attachment.url));
        }
      }
    }
  }

  public makeReply(context: MessageAction): Partial<MessageReply> {
    return {
      text: (c, q) => context.text(c, q),
      image: c => context.image(c),
      delete: () => this.sessionType == 'CHANNEL' && context.delete(this.msgId),
      addReaction: emoji => this.sessionType == 'CHANNEL' && context.addReaction(this.msgId, emoji),
      deleteReaction: emoji =>
        this.sessionType == 'CHANNEL' && context.deleteReaction(this.msgId, emoji),
    };
  }

  public get platform(): string {
    return 'qqguild';
  }

  public get platformShort(): string {
    return 'QG';
  }
}

export class QQGuildBotAdapter extends GenericBotAdapter<QQGuildBot> {
  public makeChannelContext(channelId: string): Partial<MessageAction> {
    return {
      text: async (content: string, quote?: string) => {
        try {
          const result = await this.instance.client.messageApi.postMessage(channelId, {
            content,
            message_reference: quote
              ? { message_id: quote, ignore_get_message_error: true }
              : undefined,
          });
          return result.data.id;
        } catch (e) {
          console.warn(`[QQ频道] 发送消息失败`);
          console.warn(e);
          return null;
        }
      },

      elements: async (content: GenericMessageElement[]) => {
        const message = elementsToQQGuildMessage(this, content, 'mention');
        try {
          console.log(
            JSON.stringify({
              channelId,
              message,
            })
          );
          const result = await this.instance.client.messageApi.postMessage(channelId, message);
          return result.data.id;
        } catch (e) {
          console.warn(`[QQ频道] 发送元素消息失败`);
          console.warn(e);
          return null;
        }
      },

      image: async (url: string, quote?: string) => {
        try {
          const result = await this.instance.client.messageApi.postMessage(channelId, {
            image: url,
            message_reference: quote
              ? { message_id: quote, ignore_get_message_error: true }
              : undefined,
          });
          return result.data.id;
        } catch (e) {
          console.warn(`[QQ频道] 发送图片失败`);
          console.warn(e);
          return null;
        }
      },
    };
  }

  public makeUserContext(userId: string): Partial<MessageAction> {
    const unpacked = unpackID(userId);
    return {
      text: async (content: string, quote?: string) => {
        try {
          const result = await this.instance.client.directMessageApi.postDirectMessage(
            unpacked.id,
            {
              content,
              message_reference: quote
                ? { message_id: quote, ignore_get_message_error: true }
                : undefined,
            }
          );
          return result.data.id;
        } catch (e) {
          console.warn(`[QQ频道] 发送私信失败`);
          console.warn(e);
          return null;
        }
      },

      elements: async (content: GenericMessageElement[]) => {
        const message = elementsToQQGuildMessage(this, content, 'ignore');
        try {
          const result = await this.instance.client.directMessageApi.postDirectMessage(
            unpacked.id,
            message
          );
          return result.data.id;
        } catch (e) {
          console.warn(`[QQ频道] 发送元素私信失败`);
          console.warn(e);
          return null;
        }
      },

      image: async (url: string, quote?: string) => {
        try {
          const result = await this.instance.client.directMessageApi.postDirectMessage(
            unpacked.id,
            {
              image: url,
              message_reference: quote
                ? { message_id: quote, ignore_get_message_error: true }
                : undefined,
            }
          );
          return result.data.id;
        } catch (e) {
          console.warn(`[QQ频道] 发送图片私信失败`);
          console.warn(e);
          return null;
        }
      },
    };
  }

  public connect(): void {
    const processMessage = async (message: GuildMessage) => {
      console.log(message);
      if (message.eventType == 'MESSAGE_CREATE') {
        const msg = new QQGuildBotMessage(this, message);
        await msg.processMessage();
        const text = msg.onlyText;

        if (!text.startsWith('/')) {
          // not a command, do relay
          // no support for converse
          // fast broadcast, no await
          broadcastRelay(msg);
          return;
        }

        msg.command = text.replace(/^\/ ?/, '');
        const command = msg.command.split(' ')[0].toLowerCase();

        // make sure command get broadcast first before the reply gets send,
        // but still do multiple messages at the same time.
        (async () => {
          if (this.globalCommands[command] && msg.sessionType == 'CHANNEL') {
            await broadcastRelay(msg);
            await msg.fillMsgDetail();
            if (msg.effectiveUserLevel > LEVEL_USER) return;
            if (msg.effectiveUserLevel > this.globalCommands[command].level) return;

            this.globalCommands[command].func(new RelayMessage(msg)).catch(reason => {
              console.error(`Error proccessing global command '${text}'`);
              console.error(reason);
            });
          } else if (this.commands[command]) {
            await msg.fillMsgDetail();
            if (msg.effectiveUserLevel > LEVEL_USER) return;
            if (msg.effectiveUserLevel > this.commands[command].level) return;

            this.commands[command].func(msg).catch(reason => {
              console.error(`Error proccessing command '${text}'`);
              console.error(reason);
            });
          } else if (msg.sessionType == 'CHANNEL') {
            await broadcastRelay(msg);
          }
        })();
      }
    };

    this.instance.ws.on('GUILD_MESSAGES', (data: GuildMessage) => {
      processMessage(data);
    });

    // this.instance.ws.on('GUILD_MESSAGE_REACTIONS', data => {
    //   console.log('[GUILD_MESSAGE_REACTIONS] 事件接收 :', data);
    // });
  }
}
