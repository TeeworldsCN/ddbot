import {
  GenericBotAdapter,
  GenericMessage,
  GenericMessageElement,
  MessageAction,
  MessageReply,
  quotify,
} from './base';
import { Client, DiscussMessage, GroupMessage, PrivateMessage, segment } from 'oicq';
import { unpackID } from '../utils/helpers';
import { getUser, LEVEL_MANAGER, LEVEL_USER } from '../db/user';
import { QMOTE } from '../utils/consts';
import { parse as parseXML } from 'fast-xml-parser';
import { broadcastRelay, RelayMessage } from '../relay';

let oicqLastMsgID: string = null;

export const segmentToOICQSegs = (
  bot: GenericBotAdapter<any>,
  content: GenericMessageElement[],
  mention: 'ignore' | 'mention' | 'text' = 'ignore'
) => {
  const result = [];

  for (const elem of content) {
    if (elem.type == 'quote' && elem.platform == bot.platformKey) {
      result.push(segment.at(parseInt(unpackID(elem.userKey).id)));
      break;
    }
  }

  for (const elem of content) {
    if (elem.type == 'text') {
      result.push(segment.text(elem.content));
    } else if (elem.type == 'quote' && elem.platform != bot.platformKey) {
      if (elem.content) {
        result.push(segment.text('\n' + quotify(elem.content) + '---\n'));
      } else {
        result.push(segment.text(`\n> 回复了一条消息\n---\n`));
      }
    } else if (elem.type == 'mention') {
      if (mention == 'mention' && unpackID(elem.userKey).platform == bot.platformKey) {
        result.push(segment.at(parseInt(unpackID(elem.userKey).id)));
      } else if (mention == 'text') {
        result.push(segment.text(`[@${elem.content}]`));
      }
    } else if (elem.type == 'notify' && elem.targetType == 'all') {
      if (mention == 'mention') {
        result.push(segment.at('all' as any));
      } else if (mention == 'text') {
        result.push(segment.text(`[@#${elem.targetType}${elem.target ? `:${elem.target}` : ''}]`));
      }
    } else if (elem.type == 'notify' && mention == 'text') {
      result.push(segment.text(`[@#${elem.targetType}${elem.target ? `:${elem.target}` : ''}]`));
    } else if (elem.type == 'channel') {
      result.push(segment.text(`[#${elem.content}]`));
    } else if (elem.type == 'emote') {
      if (elem.content) {
        result.push(segment.image(elem.content, true, 10000));
      } else if (elem.name) {
        result.push(segment.text(`[${elem.name}]`));
      }
    } else if (elem.type == 'image') {
      if (elem.content) {
        result.push(segment.image(elem.content, true, 10000));
      }
    } else if (elem.type == 'link') {
      result.push(segment.text(` ${elem.url} `));
    } else if (elem.type == 'unknown') {
      result.push(segment.text(`[${elem.content}]`));
    }
  }

  return result;
};

export class OICQBotAdapter extends GenericBotAdapter<Client> {
  public makeChannelContext(channelId: string): Partial<MessageAction> {
    return {
      text: async (content: string, quote?: string, onlyTo?: string) => {
        const msg = [];
        msg.push(content);
        try {
          const result = await this.instance.sendGroupMsg(parseInt(channelId), msg);
          return result.message_id;
        } catch (e) {
          console.warn(`[OICQ] 发送消息失败`);
          console.warn(e);
          return null;
        }
      },
      image: async (image: string | Buffer, onlyTo?: string) => {
        try {
          const result = await this.instance.sendGroupMsg(
            parseInt(channelId),
            segment.image(image, true, 10000)
          );
          return result.message_id;
        } catch (e) {
          console.warn(`[OICQ] 发送图片失败`);
          console.warn(e);
          return null;
        }
      },
      elements: async (content: GenericMessageElement[], rich?: boolean, onlyTo?: string) => {
        const msg = segmentToOICQSegs(this, content, 'mention');
        if (msg.length == 0) return null;
        try {
          const result = await this.instance.sendGroupMsg(parseInt(channelId), msg);
          return result.message_id;
        } catch (e) {
          console.warn(`[OICQ] 发送分段消息失败`);
          console.warn(e);
          return null;
        }
      },
      update: async (msgId: string, content: string, quote?: string) => {
        try {
          await this.instance.deleteMsg(msgId);
        } catch (e) {
          console.warn(`[OICQ] 重发删除消息失败`);
          console.warn(e);
          return null;
        }

        const msg = [];

        msg.push(content);
        try {
          await this.instance.sendGroupMsg(parseInt(channelId), msg);
        } catch (e) {
          console.warn(`[OICQ] 重发更新消息失败`);
          console.warn(e);
          return null;
        }
      },
      delete: async (msgId: string) => {
        try {
          await this.instance.deleteMsg(msgId);
        } catch (e) {
          console.warn(`[OICQ] 删除消息失败`);
          console.warn(e);
          return null;
        }
      },
    };
  }

  public makeUserContext(userId: string): Partial<MessageAction> {
    return {
      text: async (content: string, quote?: string, onlyTo?: string) => {
        const msg = [];
        msg.push(content);
        try {
          const result = await this.instance.sendPrivateMsg(parseInt(userId), msg);
          return result.message_id;
        } catch (e) {
          console.warn(`[OICQ] 发送私聊失败`);
          console.warn(e);
          return null;
        }
      },
      image: async (url: string, onlyTo?: string) => {
        try {
          const result = await this.instance.sendPrivateMsg(
            parseInt(userId),
            segment.image(url, true, 10000)
          );
          return result.message_id;
        } catch (e) {
          console.warn(`[OICQ] 私聊图片失败`);
          console.warn(e);
          return null;
        }
      },
      elements: async (content: GenericMessageElement[], rich?: boolean, onlyTo?: string) => {
        const msg = segmentToOICQSegs(this, content, 'mention');
        if (msg.length == 0) return null;
        try {
          const result = await this.instance.sendPrivateMsg(parseInt(userId), msg);
          return result.message_id;
        } catch (e) {
          console.warn(`[OICQ] 发送分段消息失败`);
          console.warn(e);
          return null;
        }
      },
      update: async (msgId: string, content: string, quote?: string) => {
        try {
          await this.instance.deleteMsg(msgId);
        } catch (e) {
          console.warn(`[OICQ] 私聊重发删除消息失败`);
          console.warn(e);
          return null;
        }
        const msg = [];
        msg.push(content);
        try {
          await this.instance.sendPrivateMsg(parseInt(userId), msg);
        } catch (e) {
          console.warn(`[OICQ] 私聊重发更新消息失败`);
          console.warn(e);
          return null;
        }
        return;
      },
      delete: async (msgId: string) => {
        try {
          await this.instance.deleteMsg(msgId);
        } catch (e) {
          console.warn(`[OICQ] 删除消息失败`);
          console.warn(e);
          return null;
        }
      },
    };
  }

  public async uploadImage(name: string, data: Buffer): Promise<string | Buffer> {
    return data;
  }

  public async uploadImageAsset(name: string, data: Buffer) {
    return this.uploadImage(name, data);
  }

  public connect() {
    this.instance.on('message', async e => {
      if (oicqLastMsgID === e.message_id) return;
      oicqLastMsgID = e.message_id;

      const msg = new OICQMessage(this, e);
      const text = msg.onlyText;

      // 无文本消息或不是指令
      if (!text.startsWith('.') && !text.startsWith('。')) {
        if (msg.sessionType == 'DM') {
          // 只有私聊会触发会话
          await msg.fillMsgDetail();
          if (msg.effectiveUserLevel > LEVEL_USER) return;
          const converse = await msg.getConverse();
          const context = converse.context;
          if (converse.key && this.converses[converse.key]) {
            if (msg.effectiveUserLevel > this.converses[converse.key].level) return;
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
          await broadcastRelay(msg);
        }
        return;
      }

      // 处理文本消息
      msg.command = text.replace(/^[\.。] ?/, '');
      const command = msg.command.split(' ')[0].toLowerCase();

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
      } else if (msg.sessionType == 'DM' && this.converses[command]) {
        // 只有私聊会触发会话
        await msg.fillMsgDetail();
        if (msg.effectiveUserLevel > LEVEL_USER) return;
        if (msg.effectiveUserLevel > this.converses[command].level) return;

        const context = {};
        const progress = await this.converses[command].func<any>(msg, 0, context);
        if (progress && progress >= 0) {
          await msg.setConverse(command, progress, context);
        } else {
          await msg.finishConverse();
        }
      } else if (msg.sessionType == 'CHANNEL') {
        // try relay if no commands are triggered
        await broadcastRelay(msg);
      }
    });

    this.instance.on('system.login.slider', () => {
      process.stdin.once('data', input => {
        this.instance.sliderLogin(input.toString());
      });
    });

    this.instance.on('request.friend.add', async data => {
      const userKey = this.packID(data.user_id.toString());
      const user = await getUser(userKey);
      if ((user?.level ?? LEVEL_USER) > LEVEL_MANAGER) {
        await this.instance.setFriendAddRequest(data.flag, false, '抱歉，我暂时不能加好友。');
      } else {
        await this.instance.setFriendAddRequest(data.flag, true);
      }
    });

    this.instance.on('request.group.invite', async data => {
      const userKey = this.packID(data.user_id.toString());
      const user = await getUser(userKey);
      if ((user?.level ?? LEVEL_USER) > LEVEL_MANAGER) {
        await this.instance.setGroupAddRequest(data.flag, false);
      } else {
        await this.instance.setGroupAddRequest(data.flag, true);
      }
    });

    console.log('OICQ Bot Connected');
    this.instance.login(process.env.OICQ_PASSWORD);
    this.started = true;
  }
}

const parseOICQXML = (xml: string): GenericMessageElement => {
  try {
    const data = parseXML(xml, {
      ignoreAttributes: false,
    });

    if (data?.msg?.['@_url']) {
      let title = data?.msg?.item?.title;
      if (Array.isArray(title)) {
        title = title[0];
      }

      return {
        type: 'link',
        content: data?.msg?.item?.title || data?.msg?.['@_url'],
        url: data?.msg?.['@_url'],
      };
    } else {
      let title = data?.msg?.item?.title;
      if (!Array.isArray(title)) {
        title = [title];
      }
      const content = title.map((t: any) => (typeof t == 'string' ? t : t?.['#text'] || ''));
      if (data?.msg?.item?.summary) {
        if (typeof data.msg.item.summary == 'string') {
          content.push(data.msg.item.summary);
        } else if (data.msg.item.summary?.['#text']) {
          content.push(data.msg.item.summary['#text']);
        }
      }
      return {
        type: 'text',
        content: content.join('\n'),
      };
    }
  } catch {
    return {
      type: 'text',
      content: '[invalid xml message]',
    };
  }
};

const parseOICQJson = (json: string): GenericMessageElement => {
  try {
    const data = JSON.parse(json);
    if (data?.prompt) {
      return {
        type: 'text',
        content: `[card:${data.prompt}]`,
      };
    } else if (data?.desc) {
      return {
        type: 'text',
        content: `[card:${data.desc}]`,
      };
    } else if (data?.text) {
      return {
        type: 'text',
        content: `[card:${data.text}]`,
      };
    } else if (data?.app) {
      return {
        type: 'text',
        content: `[card:${data.app}]`,
      };
    }
  } catch {
    return {
      type: 'text',
      content: '[invalid json message]',
    };
  }
};

export type OICQMessageType = PrivateMessage | GroupMessage | DiscussMessage;

class OICQMessage extends GenericMessage<Client> {
  public constructor(bot: OICQBotAdapter, e: OICQMessageType) {
    super(bot, e);

    this._type = 'message';

    const tag = `${e.sender.nickname}#${e.sender.user_id}`;
    this._userId = `${e.sender.user_id}`;
    this._userKey = this.bot.packID(this._userId);

    this._content = [];

    let lastQuote = false;

    for (const seg of e.message) {
      if (seg.type == 'text') {
        this._content.push({ type: 'text', content: seg.text });
      } else if (seg.type == 'at' && !lastQuote) {
        // reply 可能自带一个 at，无视掉
        if (seg.qq == 'all') {
          this._content.push({
            type: 'notify',
            content: (seg.text || '').slice(1),
            targetType: 'all',
          });
        } else {
          this._content.push({
            type: 'mention',
            content: (seg.text || '').slice(1),
            userKey: this.bot.packID(seg.qq.toString()),
          });
        }
      } else if (seg.type == 'bface') {
        this._content.push({
          type: 'emote',
          platform: this.bot.platformKey,
          content: seg.file,
          id: null,
          name: seg.text,
        });
      } else if (seg.type == 'sface') {
        if (seg.text) {
          this._content.push({
            type: 'emote',
            platform: this.bot.platformKey,
            content: null,
            id: null,
            name: seg.text,
          });
        }
      } else if (seg.type == 'face') {
        if (seg.id != null) {
          const qmote = QMOTE[seg.id];
          if (qmote) {
            this._content.push({
              type: 'emote',
              platform: this.bot.platformKey,
              content: null,
              id: null,
              name: qmote.name,
              english: qmote.eng,
              replacement: qmote.emoji,
            });
          } else {
            this._content.push({
              type: 'emote',
              platform: this.bot.platformKey,
              content: null,
              id: null,
              name: seg.id.toString(),
            });
          }
        }
      } else if (seg.type == 'image') {
        this._content.push({
          type: 'image',
          content: seg.url,
        });
      } else if (seg.type == 'reply') {
        this._content.push({
          type: 'quote',
          platform: this.bot.platformKey,
          msgId: seg.id,
        });
      } else if (seg.type == 'xml') {
        this._content.push(parseOICQXML(seg.data));
      } else if (seg.type == 'json') {
        this._content.push(parseOICQJson(seg.data));
      } else {
        this._content.push({
          type: 'unknown',
          platform: this.bot.platformKey,
          content: seg.type,
          raw: seg,
        });
      }

      if (seg.type == 'reply') {
        lastQuote = true;
      } else {
        lastQuote = false;
      }
    }

    this._msgId = e.message_id;
    this._eventMsgId = e.message_id;

    const time = Date.now();

    this._author = {
      tag,
      nicktag: tag,
      nickname: e.sender.nickname,
      username: e.sender.nickname,
      avatar: `https://q2.qlogo.cn/headimg_dl?dst_uin=${this._userId}&spec=100&t=${
        time - (time % 43200000)
      }`,
    };

    if (e.message_type == 'private') {
      this._sessionType = 'DM';
      this._channelKey = this.bot.packChannelID(this._userId);
      this._channelId = this._userId;
    } else if (e.message_type == 'group') {
      this._sessionType = 'CHANNEL';
      this._channelId = `${e.group_id}`;
      this._channelKey = this.bot.packChannelID(this._channelId);
      this._channelName = `${e.group_name}`;
      this._author.isMaster = e.sender.role == 'owner';
      let roleId = 0;
      if (e.sender.role == 'owner') roleId = 2;
      if (e.sender.role == 'admin') roleId = 1;
      this._author.hoistInfo = {
        name: e.sender.title,
        roleId,
      };
      this._author.chatLevel = e.sender.level;
      if (e.sender.card) {
        this._author.nickname = e.sender.card;
      }
    } else if (e.message_type == 'discuss') {
      this._sessionType = 'CHANNEL';
      this._channelId = `${e.discuss_id}`;
      this._channelKey = this.bot.packChannelID(this._channelId);
      this._channelName = `${e.discuss_name}`;
      this.author.isMaster = false;
      this._author.hoistInfo = {
        name: '',
        roleId: 0,
      };
      if (e.sender.card) {
        this._author.nickname = e.sender.card;
      }
    }

    this._author.nicktag = `${this._author.nickname}#${e.sender.user_id}`;
    this._msgTimestamp = e.time;
  }

  public makeReply(context: MessageAction): Partial<MessageReply> {
    return {
      text: (c, q, t) => context.text(c, q, t ? this.userId : undefined),
      image: (c, t) => context.image(c, t ? this.userId : undefined),
      elements: (c, r, t) => context.elements(c, r, t ? this.userId : undefined),
      delete: () => this._sessionType == 'CHANNEL' && context.delete(this.msgId),
    };
  }

  public async fetchExtraMsgInfo() {
    for (const part of this._content) {
      if (part.type == 'quote') {
        try {
          const result = await this.bot.instance.getMsg(part.msgId);
          part.userKey = this.bot.packID(result.sender.user_id.toString());

          const quoteMsg = new OICQMessage(this.bot, result);
          part.content = `${result.sender.nickname}: ${quoteMsg.text}`;
        } catch (e) {
          console.warn('[OICQ] 获取被回复消息失败');
          console.warn(e);
          return;
        }
      }
    }
    this._text = null;
  }

  public get platform(): string {
    return 'oicq';
  }

  public get platformShort(): string {
    return 'Q';
  }
}
