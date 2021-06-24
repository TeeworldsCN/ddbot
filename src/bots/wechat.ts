import express from 'express';
import { webhook } from '../webhook';
import { DateTime } from 'luxon';
import axios, { AxiosInstance } from 'axios';
import sha1 from 'sha1';
import { TextHandler } from '../bottype';
import { GenericBot, GenericMessage, MessageAction, MessageReply } from './base';
import { packID } from '../utils/helpers';
import { parse, j2xParser } from 'fast-xml-parser';
import FormData from 'form-data';
import { WechatReplyModel } from '../db/wechatReply';
import _ from 'lodash';

const xmlParseOption = {
  ignoreAttributes: true,
  allowBooleanAttributes: false,
  parseNodeValue: true,
  trimValues: true,
  cdataTagName: '__cdata',
  cdataPositionChar: '',
};

const json2xml = new j2xParser(xmlParseOption);

const wechatState = {
  token: '',
  expireDate: DateTime.now(),
};

export const wechatAPI = axios.create({
  baseURL: 'https://api.weixin.qq.com/cgi-bin/',
  headers: {
    'Accept-Encoding': 'gzip, deflate',
  },
  decompress: true,
  timeout: 3000,
});

export const accessToken = async () => {
  if (DateTime.now() >= wechatState.expireDate) {
    wechatState.expireDate = DateTime.now();
    const result = await wechatAPI.get('/token', {
      params: {
        grant_type: 'client_credential',
        appid: process.env.WECHAT_APPID,
        secret: process.env.WECHAT_SECRET,
      },
    });

    wechatState.token = result.data.access_token;
    wechatState.expireDate = DateTime.now().plus({ seconds: result.data.expires_in });
  }

  return wechatState.token;
};

const checkSign = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const signData = [process.env.BOT_AUTH_TOKEN, req.query.timestamp, req.query.nonce];
  const sign = sha1(signData.sort().join(''));

  if (req.query.signature === sign) {
    return next();
  }
  res.sendStatus(404);
};

const PLATFORM = 'wechat';

export class WechatBotAdapter extends GenericBot<AxiosInstance> {
  public makeChannelContext(channelId: string): Partial<MessageAction> {
    return {};
  }
  public makeUserContext(userId: string): Partial<MessageAction> {
    return {};
  }
  public get platform(): string {
    return PLATFORM;
  }

  public get platformShort(): string {
    return 'W';
  }

  public async uploadImage(name: string, imageData: Buffer) {
    try {
      const formData = new FormData();
      formData.append('media', imageData, {
        filename: name,
        knownLength: imageData.length,
      });
      const { data } = await this.instance.post('/media/upload', formData, {
        params: {
          access_token: await accessToken(),
          type: 'image',
        },
        headers: {
          'content-length': formData.getLengthSync(),
          ...formData.getHeaders(),
        },
      });

      return data.media_id;
    } catch (e) {
      console.warn('[微信] 临时图片素材上传失败');
      console.warn(e);
    }
    return null;
  }

  public connect() {
    const wechatHook = express.Router();

    // 微信Webhook
    wechatHook.get('/', checkSign, (req, res) => {
      if (req.query.echostr) return res.send(req.query.echostr);
      return res.sendStatus(404);
    });

    wechatHook.post('/', checkSign, express.text({ type: 'text/*' }), async (req, res) => {
      try {
        const data = parse(req.body, xmlParseOption);
        req.body = data.xml;
      } catch (e) {
        return res.send();
      }

      const type = req.body.MsgType.__cdata;

      if (type === 'text') {
        const msg = new WechatMessage(this, { req, res });
        await msg.fillMsgDetail();

        const text = msg.onlyText;
        const command = text.split(' ')[0].toLowerCase();
        msg.command = text;

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

        if (this.commands[command]) {
          try {
            if (msg.userLevel > this.commands[command].level) return;
            await this.commands[command].func(msg);
          } catch (e) {
            console.error(`Error proccessing command '${text}'`);
            console.error(e);
          }
        } else if (this.converses[command]) {
          if (msg.userLevel > this.converses[command].level) return;
          const context = {};
          const progress = await this.converses[command].func<any>(msg, 0, context);
          if (progress && progress >= 0) {
            await msg.setConverse(command, progress, context);
          } else {
            await msg.finishConverse();
          }
        } else {
          await wechatAutoReplyCommand(msg);
        }

        if (!msg.sent) res.send();
        return;
      }

      if (type === 'event') {
        let event = req.body.Event.__cdata;
        if (event === 'subscribe') {
          _.set(req.body, 'Content.__cdata', 'subscribe');
          const reply = new WechatMessage(this, { req, res });
          await wechatAutoReplyCommand(reply);

          if (!reply.sent) res.send();
          return;
        }
      }

      res.send();
    });

    webhook.use('/wechat', wechatHook);
    this.started = true;
    console.log('Wechat Bot Connected');
  }
}

class WechatMessage extends GenericMessage<AxiosInstance> {
  private _sent = false;

  public constructor(bot: WechatBotAdapter, e: { req: express.Request; res: express.Response }) {
    super(bot, e);
    const { req } = e;
    this._type = 'text';

    this._userId = req.body.FromUserName.__cdata;
    this._userKey = packID({ platform: this.bot.platform, id: this._userId });
    this._content = [{ type: 'text', content: req.body.Content.__cdata }];
    this._msgId = req.body.MsgId;
    this._eventMsgId = req.body.MsgId;
    this._author = {
      tag: 'Anonymous',
      nickname: '公众号用户',
      username: 'WechatUser',
    };
    if (!this._author.nickname) this._author.nickname = this._author.username;

    this._channelId = req.body.ToUserName.__cdata;
    this._channelKey = packID({ platform: this.bot.platform, id: req.body.ToUserName.__cdata });
    this._sessionType = 'DM';
    this._msgTimestamp = req.body.CreateTime;
  }

  public makeReply(context: MessageAction): Partial<MessageReply> {
    const res: express.Response = this._raw.res;
    return {
      text: async (content: string, quote?: string, temp?: boolean) => {
        if (this._sent) return null;
        const xml = json2xml.parse({
          xml: {
            ToUserName: { __cdata: this.userId },
            FromUserName: { __cdata: this.channelId },
            CreateTime: DateTime.now().toMillis(),
            MsgType: { __cdata: 'text' },
            Content: { __cdata: content },
          },
        });
        res.send(xml);
        this._sent = true;
        return 'wechatTextMessage';
      },
      image: async (mediaId: string, temp?: boolean) => {
        if (this._sent) return null;
        const xml = json2xml.parse({
          xml: {
            ToUserName: { __cdata: this.userId },
            FromUserName: { __cdata: this.channelId },
            CreateTime: DateTime.now().toMillis(),
            MsgType: { __cdata: 'image' },
            Image: {
              MediaId: { __cdata: mediaId },
            },
          },
        });
        res.send(xml);
        this._sent = true;
        return 'wechatImageMessage';
      },
    };
  }

  public get sent() {
    return this._sent;
  }

  public async fetchExtraMsgInfo() {
    // 订阅号不能用
    // try {
    //   const { data } = await this.bot.instance.get('/user/info', {
    //     params: {
    //       access_token: await accessToken(),
    //       openid: this.userId,
    //       lang: 'zh_CN',
    //     },
    //   });
    //   if (!data.subscribe) return;
    //   this.author.nickname = data.nickname;
    //   this.author.username = data.nickname;
    //   this.author.tag = data.remark;
    //   this.author.avatar = data.headimgurl;
    // } catch (e) {
    //   console.warn(`[微信]获取用户信息(${this.userId})失败`);
    //   console.warn(e);
    // }
  }
}

// 不是个command，做成command好调试
export const wechatAutoReplyCommand: TextHandler = async msg => {
  const content = msg.onlyText.replace('.wxtestkw ', '');
  const autoReply = await WechatReplyModel.findOne({
    keyword: content,
  });

  if (autoReply) {
    if (autoReply.replyType == 'text') {
      await msg.reply.text(autoReply.content);
    } else if (autoReply.replyType == 'image') {
      await msg.reply.image(autoReply.content);
    }
  }
};
