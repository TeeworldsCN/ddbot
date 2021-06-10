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

const wechatHook = express.Router();
const wechatState = {
  token: '',
  expireDate: DateTime.now(),
};

const wechatAPI = axios.create({
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
  const signData = [process.env.WECHAT_TOKEN, req.query.timestamp, req.query.nonce];
  const sign = sha1(signData.sort().join(''));

  if (req.query.signature === sign) {
    return next();
  }
  res.sendStatus(404);
};

const PLATFORM = 'wechat';

class WechatBotAdapter extends GenericBot<AxiosInstance> {
  public makeChannelContext(channelId: string): Partial<MessageAction> {
    return {};
  }
  public makeUserContext(userId: string): Partial<MessageAction> {
    return {};
  }
  public get platform(): string {
    return PLATFORM;
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
}

class WechatMessage extends GenericMessage<AxiosInstance> {
  private _sent = false;

  public constructor(
    bot: WechatBotAdapter,
    e: { req: express.Request; res: express.Response },
    type: 'text'
  ) {
    super(bot, e);
    const { req } = e;
    this._type = type;

    if (type == 'text') {
      this._userId = req.body.FromUserName.__cdata;
      this._userKey = packID({ platform: this.bot.platform, id: this._userId });
      this._content = req.body.Content.__cdata;
      this._msgId = req.body.MsgId;
      this._eventMsgId = req.body.MsgId;
      this._author = {
        tag: 'Anonymous',
        nickname: '公众号用户',
        username: 'WechatUser',
      };
      if (!this._author.nickname) this._author.nickname = this._author.username;
    }

    this._channelId = req.body.ToUserName.__cdata;
    this._channelKey = packID({ platform: this.bot.platform, id: req.body.ToUserName.__cdata });
    this._sessionType = 'DM';
    this._msgTimestamp = req.body.CreateTime;
  }

  public makeReply(): Partial<MessageReply> {
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

  public async fetchUserInfo() {
    // 订阅号不能用
    try {
      const { data } = await this.bot.instance.get('/user/info', {
        params: {
          access_token: await accessToken(),
          openid: this.userId,
          lang: 'zh_CN',
        },
      });
      if (!data.subscribe) return;
      this.author.nickname = data.nickname;
      this.author.username = data.nickname;
      this.author.tag = data.remark;
      this.author.avatar = data.headimgurl;
    } catch (e) {
      console.warn(`[微信]获取用户信息(${this.userId})失败`);
      console.warn(e);
    }
  }
}

export const wechat = new WechatBotAdapter(wechatAPI);

// 不是个command，做成command好调试
export const wechatAutoReplyCommand: TextHandler = async msg => {
  const content = msg.content.replace('.wxtestkw ', '');
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
    let content = req.body.Content.__cdata;
    const command = content.split(' ')[0].toLowerCase();
    const reply = new WechatMessage(wechat, { req, res }, 'text');

    let isCommand = false;
    for (let key in wechat.commands) {
      if (key == command) {
        isCommand = true;
        try {
          await wechat.commands[key].func(reply);
        } catch (e) {
          console.error(`Error proccessing command '${content}'`);
          console.error(e);
        }
        break;
      }
    }

    if (!isCommand && !reply.sent) {
      await wechatAutoReplyCommand(reply);
    }

    if (!reply.sent) res.send();
    return;
  }

  if (type === 'event') {
    let event = req.body.Event.__cdata;
    if (event === 'subscribe') {
      _.set(req.body, 'Content.__cdata', 'subscribe');
      const reply = new WechatMessage(wechat, { req, res }, 'text');
      await wechatAutoReplyCommand(reply);

      if (!reply.sent) res.send();
      return;
    }
  }

  res.send();
});

export const wechatStart = () => {
  if (!process.env.WECHAT_APPID) return;

  webhook.use('/wechat', wechatHook);
};
