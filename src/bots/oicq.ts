import {
  GenericBot,
  GenericMessage,
  GenericMessageElement,
  MessageAction,
  MessageReply,
} from './base';
import { Client, MessageEventData, segment } from 'oicq';
import { packID, unpackID } from '../utils/helpers';
import { getUser, LEVEL_MANAGER, LEVEL_USER } from '../db/user';
import { outboundMessage } from '../relay';
import { QMOTE } from '../utils/consts';

let oicqLastMsgID: string = null;

export const segmentToOICQSegs = (
  bot: GenericBot<any>,
  content: GenericMessageElement[],
  mention: 'ignore' | 'mention' | 'text' = 'ignore'
) => {
  const result = [];

  for (const elem of content) {
    if (elem.type == 'quote' && elem.platform == bot.platform) {
      result.push(segment.reply(elem.msgId));
      result.push(segment.at(parseInt(unpackID(elem.userKey).id)));
      break;
    }
  }

  for (const elem of content) {
    if (elem.type == 'text') {
      result.push(segment.text(elem.content));
    } else if (elem.type == 'quote' && elem.platform != bot.platform) {
      if (elem.content) {
        result.push(segment.text(`> ${elem.content.slice(0, 24)}\n`));
      } else {
        result.push(segment.text(`> 回复了一条消息\n`));
      }
    } else if (elem.type == 'mention') {
      if (mention == 'mention' && unpackID(elem.userKey).platform == bot.platform) {
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
    }
  }

  return result;
};

export class OICQBotAdapter extends GenericBot<Client> {
  public makeChannelContext(channelId: string): Partial<MessageAction> {
    return {
      text: async (content: string, quote?: string, onlyTo?: string) => {
        const msg = [];
        if (quote) {
          msg.push(segment.reply(quote));
        }
        msg.push(segment.text(content));
        const result = await this.instance.sendGroupMsg(parseInt(channelId), msg);
        if (result.retcode) {
          console.warn(`[OICQ] 发送消息失败`);
          console.warn(result);
          return null;
        }
        return result.data?.message_id || null;
      },
      image: async (url: string, onlyTo?: string) => {
        const result = await this.instance.sendGroupMsg(
          parseInt(channelId),
          segment.image(url, true, 10000)
        );
        if (result.retcode) {
          console.warn(`[OICQ] 发送图片失败`);
          console.warn(result);
          return null;
        }
        return result.data?.message_id || null;
      },
      elements: async (content: GenericMessageElement[], rich?: boolean, onlyTo?: string) => {
        const msg = segmentToOICQSegs(this, content, 'mention');
        if (msg.length == 0) return null;
        const result = await this.instance.sendGroupMsg(parseInt(channelId), msg);
        if (result.retcode) {
          console.warn(`[OICQ] 发送分段消息失败`);
          console.warn(result);
          return null;
        }
        return result.data?.message_id || null;
      },
      update: async (msgId: string, content: string, quote?: string) => {
        const deleteRes = await this.instance.deleteMsg(msgId);
        if (deleteRes.retcode) {
          console.warn(`[OICQ] 重发删除消息失败`);
          console.warn(deleteRes);
          return null;
        }

        const msg = [];
        if (quote) {
          msg.push(segment.reply(quote));
        }
        msg.push(segment.text(content));
        const result = await this.instance.sendGroupMsg(parseInt(channelId), msg);
        if (result.retcode) {
          console.warn(`[OICQ] 重发更新消息失败`);
          console.warn(result);
          return null;
        }
        return;
      },
      delete: async (msgId: string) => {
        const deleteRes = await this.instance.deleteMsg(msgId);
        if (deleteRes.retcode) {
          console.warn(`[OICQ] 删除消息失败`);
          console.warn(deleteRes);
          return null;
        }
      },
    };
  }
  public makeUserContext(userId: string): Partial<MessageAction> {
    return {
      text: async (content: string, quote?: string, onlyTo?: string) => {
        const msg = [];
        if (quote) {
          msg.push(segment.reply(quote));
        }
        msg.push(segment.text(content));
        const result = await this.instance.sendPrivateMsg(parseInt(userId), msg);
        if (result.retcode) {
          console.warn(`[OICQ] 发送私聊失败`);
          console.warn(result);
          return null;
        }
        return result.data?.message_id || null;
      },
      image: async (url: string, onlyTo?: string) => {
        const result = await this.instance.sendPrivateMsg(
          parseInt(userId),
          segment.image(url, true, 10000)
        );
        if (result.retcode) {
          console.warn(`[OICQ] 私聊图片失败`);
          console.warn(result);
          return null;
        }
        return result.data?.message_id || null;
      },
      elements: async (content: GenericMessageElement[], rich?: boolean, onlyTo?: string) => {
        const msg = segmentToOICQSegs(this, content, 'mention');
        if (msg.length == 0) return null;
        const result = await this.instance.sendPrivateMsg(parseInt(userId), msg);
        if (result.retcode) {
          console.warn(`[OICQ] 发送分段消息失败`);
          console.warn(result);
          return null;
        }
        return result.data?.message_id || null;
      },
      update: async (msgId: string, content: string, quote?: string) => {
        const deleteRes = await this.instance.deleteMsg(msgId);
        if (deleteRes.retcode) {
          console.warn(`[OICQ] 私聊重发删除消息失败`);
          console.warn(deleteRes);
          return null;
        }

        const msg = [];
        if (quote) {
          msg.push(segment.reply(quote));
        }
        msg.push(segment.text(content));
        const result = await this.instance.sendPrivateMsg(parseInt(userId), msg);
        if (result.retcode) {
          console.warn(`[OICQ] 私聊重发更新消息失败`);
          console.warn(result);
          return null;
        }
        return;
      },
      delete: async (msgId: string) => {
        const deleteRes = await this.instance.deleteMsg(msgId);
        if (deleteRes.retcode) {
          console.warn(`[OICQ] 删除消息失败`);
          console.warn(deleteRes);
          return null;
        }
      },
    };
  }

  public async uploadImage(name: string, data: Buffer): Promise<string> {
    const result = await this.instance.preloadImages([data]);
    if (result.retcode) {
      console.warn('[OICQ] 图片上传失败');
      console.warn(result);
      return null;
    }
    return result.data[0];
  }

  public async uploadImageAsset(name: string, data: Buffer) {
    return this.uploadImage(name, data);
  }

  public get platform(): string {
    return 'oicq';
  }

  public get platformShort(): string {
    return 'Q';
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
          await outboundMessage(msg);
        }
        return;
      }

      // 处理文本消息
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
        await outboundMessage(msg);
      }
    });

    this.instance.on('system.login.slider', () => {
      process.stdin.once('data', input => {
        this.instance.sliderLogin(input.toString());
      });
    });

    this.instance.on('request.friend.add', async data => {
      const userKey = packID({ platform: this.platform, id: data.user_id.toString() });
      const user = await getUser(userKey);
      if ((user?.level ?? LEVEL_USER) > LEVEL_MANAGER) {
        await this.instance.setFriendAddRequest(data.flag, false, '抱歉，我暂时不能加好友。');
      } else {
        await this.instance.setFriendAddRequest(data.flag, true);
      }
    });

    this.instance.on('request.group.invite', async data => {
      const userKey = packID({ platform: this.platform, id: data.user_id.toString() });
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
class OICQMessage extends GenericMessage<Client> {
  public constructor(bot: OICQBotAdapter, e: MessageEventData) {
    super(bot, e);

    this._type = 'text';

    const tag = `${e.sender.nickname}#${e.sender.user_id}`;
    this._userId = `${e.sender.user_id}`;
    this._userKey = packID({ platform: this.bot.platform, id: this._userId });

    this._content = [];

    let lastQuote = false;

    for (const seg of e.message) {
      if (seg.type == 'text') {
        this._content.push({ type: 'text', content: seg.data.text });
      } else if (seg.type == 'at' && !lastQuote) {
        // reply 可能自带一个 at，无视掉
        if (seg.data.qq == 'all') {
          this._content.push({
            type: 'notify',
            content: (seg.data.text || '').slice(1),
            targetType: 'all',
          });
        } else {
          this._content.push({
            type: 'mention',
            content: (seg.data.text || '').slice(1),
            userKey: packID({ platform: this.bot.platform, id: seg.data.qq.toString() }),
          });
        }
      } else if (seg.type == 'bface') {
        this._content.push({
          type: 'emote',
          platform: this.bot.platform,
          content: seg.data.file,
          id: null,
          name: seg.data.text,
        });
      } else if (seg.type == 'sface') {
        if (seg.data.text) {
          this._content.push({
            type: 'emote',
            platform: this.bot.platform,
            content: null,
            id: null,
            name: seg.data.text,
          });
        }
      } else if (seg.type == 'face') {
        if (seg.data.id != null) {
          const qmote = QMOTE[seg.data.id];
          if (qmote) {
            this._content.push({
              type: 'emote',
              platform: this.bot.platform,
              content: null,
              id: null,
              name: qmote.name,
              english: qmote.eng,
              replacement: qmote.emoji,
            });
          } else {
            this._content.push({
              type: 'emote',
              platform: this.bot.platform,
              content: null,
              id: null,
              name: seg.data.id.toString(),
            });
          }
        }
      } else if (seg.type == 'image') {
        this._content.push({
          type: 'image',
          content: seg.data.url,
        });
      } else if (seg.type == 'reply') {
        this._content.push({
          type: 'quote',
          platform: this.bot.platform,
          msgId: seg.data.id,
        });
      } else if (seg.type == 'xml') {
        console.log(seg.data);
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
      nickname: e.sender.nickname,
      username: e.sender.nickname,
      avatar: `https://q2.qlogo.cn/headimg_dl?dst_uin=${this._userId}&spec=100&t=${
        time - (time % 43200000)
      }`,
    };

    if (e.message_type == 'private') {
      this._sessionType = 'DM';
      this._channelKey = packID({ platform: this.bot.platform, id: this._userId });
      this._channelId = this._userId;
    } else if (e.message_type == 'group') {
      this._sessionType = 'CHANNEL';
      this._channelId = `${e.group_id}`;
      this._channelKey = packID({ platform: this.bot.platform, id: this._channelId });
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
      this._channelKey = packID({ platform: this.bot.platform, id: this._channelId });
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
        const result = await this.bot.instance.getMsg(part.msgId);
        if (result.retcode) {
          console.warn('[OICQ] 获取被回复消息失败');
          console.warn(result);
          return;
        }
        part.userKey = packID({
          platform: this.bot.platform,
          id: result.data.sender.user_id.toString(),
        });

        const quoteMsg = new OICQMessage(this.bot, result.data);
        part.content = quoteMsg.text;
      }
    }
    this._text = null;
  }
}
