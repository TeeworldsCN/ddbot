import express from 'express';
import { webhook } from '../webhook';
import { DateTime } from 'luxon';
import axios, { AxiosInstance } from 'axios';
import sha1 from 'sha1';
import { ButtonHandler, TextHandler } from '../bottype';
import { GenericMessage, MessageReply } from './reply';
import { packID } from '../utils/helpers';
import { parse, j2xParser } from 'fast-xml-parser';

const xmlParseOption = {
  ignoreAttributes: true,
  allowBooleanAttributes: false,
  parseNodeValue: true,
  trimValues: true,
  cdataTagName: '__cdata',
  cdataPositionChar: '',
};

const json2xml = new j2xParser(xmlParseOption);

const wechat = express.Router();
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

const getToken = async () => {
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

class WechatMessage extends GenericMessage<AxiosInstance> {
  private _sent = false;

  public constructor(
    bot: AxiosInstance,
    e: { req: express.Request; res: express.Response },
    type: 'text'
  ) {
    super(bot, e);
    const { req } = e;
    this._type = type;

    if (type == 'text') {
      this._authorKey = packID({ platform: this.platform, id: req.body.FromUserName.__cdata });
      this._content = req.body.Content.__cdata;
      this._msgId = req.body.MsgId;
      this._eventMsgId = req.body.MsgId;
      this._author = {
        isAdmin: false,
        tag: 'Anonymous',
        nickname: '公众号用户',
        username: 'WechatUser',
        id: req.body.FromUserName.__cdata,
      };
      if (!this._author.nickname) this._author.nickname = this._author.username;
    }

    this._channelId = req.body.ToUserName.__cdata;
    this._channelType = 'PERSON';
    this._msgTimestamp = req.body.CreateTime;
  }

  public get reply(): MessageReply {
    const res: express.Response = this._raw.res;
    return {
      reply: async (content: string, quote?: string, temp?: boolean | string) => {
        if (this._sent) return null;
        const xml = json2xml.parse({
          xml: {
            ToUserName: { __cdata: this.author.id },
            FromUserName: { __cdata: this.channelId },
            CreateTime: DateTime.now().toMillis(),
            MsgType: { __cdata: 'text' },
            Content: { __cdata: content },
          },
        });
        res.send(xml);
        this._sent = true;
        return null;
      },
      replyCard: async (content: any, quote?: string, temp?: boolean | string) => {
        return null;
      },
      update: async (msgId: string, content: string, quote?: string) => {
        return null;
      },
      delete: async (msgId: string) => {
        return null;
      },
      addReaction: async (msgId: string, emoji: string[]) => {
        return null;
      },
      deleteReaction: async (msgId: string, emoji: string[], userId?: string) => {
        return null;
      },
    };
  }

  public get platform(): string {
    return 'wechat';
  }

  public get sent() {
    return this._sent;
  }
}

const Commands: { [key: string]: TextHandler } = {};
const Buttons: { [key: string]: ButtonHandler } = {};

wechat.get('/', checkSign, (req, res) => {
  if (req.query.echostr) return res.send(req.query.echostr);
  return res.sendStatus(404);
});

wechat.post('/', checkSign, express.text(), async (req, res) => {
  try {
    const data = parse(req.body, xmlParseOption);
    req.body = data.xml;
  } catch (e) {
    return res.send();
  }

  const type = req.body.MsgType.__cdata;

  if (type === 'text') {
    const content = req.body.Content.__cdata;
    const command = content.split(' ')[0].toLowerCase();

    const reply = new WechatMessage(wechatAPI, { req, res }, 'text');

    for (let key in Commands) {
      if (key == command) {
        try {
          await Commands[key](reply, 'text');
        } catch (e) {
          console.error(`Error proccessing command '${content}'`);
          console.error(e);
        }
        break;
      }
    }

    if (!reply.sent) {
      return res.send();
    }
  }

  res.send();
});

export const wechatStart = () => {
  if (!process.env.WECHAT_APPID) return;

  webhook.use('/wechat', wechat);
};

export const wechatAddCommand = (command: string, handler: TextHandler) => {
  Commands[command] = handler;
};
