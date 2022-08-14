import { LEVEL_USER } from '../db/user';
import { broadcastRelay, RelayMessage } from '../relay';
import { eQuote, eText, eImage } from '../utils/messageElements';
import {
  GenericBotAdapter,
  GenericMessage,
  GenericMessageElement,
  MessageAction,
  MessageReply,
  quotify,
} from './base';
import WebSocket from 'ws';
import sharp from 'sharp';
import { CONFIG } from '../config';

export class StableWebSocket {
  private ws: WebSocket;
  private url: string;
  private options: WebSocket.ClientOptions;
  public onMessage: (data: any) => void;

  constructor(url: string, options?: WebSocket.ClientOptions) {
    this.url = url;
    this.options = options;
  }

  public async connect() {
    this.ws = new WebSocket(this.url, this.options);
    this.ws.on('message', (data: WebSocket.Data) => {
      if (this.onMessage) this.onMessage(JSON.parse(data.toString()));
    });
    this.ws.on('close', () => {
      console.log('桥接连接断开，将在5秒后重试');
      this.ws.close();
      this.ws = null;
      setTimeout(() => this.connect(), 5000);
    });
    return new Promise<void>((resolve, reject) => {
      this.ws.on('open', () => {
        resolve();
      });
      this.ws.on('error', err => {
        reject(err);
      });
    });
  }

  public async send(data: any) {
    return new Promise<void>((resolve, reject) => {
      this.ws.send(JSON.stringify(data), err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

interface MatterMessage {
  avatar: string;
  event: string;
  gateway: string;
  text: string;
  username: string;
  account: string;
  channel: string;
  id: string;
  parent_id: string;
  protocol: string;
  timestamp: string;
  userid: string;
  label?: string;
  Extra: {
    file?: {
      Avatar: string;
      Comment: string;
      Data: string;
      Name: string;
      SHA: string;
      Size: number;
      URL?: string;
    }[];
  };
}

const PROTOCOL_SHORT: { [key: string]: string } = {
  telegram: 'TG',
  discord: 'DC',
};

const proto = (protocol: string) => {
  return PROTOCOL_SHORT[protocol] || protocol;
};
class MatterBridgeMessage extends GenericMessage<StableWebSocket> {
  private _platform: string;
  private _bridgeName: string;

  constructor(bot: MatterbridgeBotAdapter, msg: MatterMessage, bridgeName: string) {
    super(bot, msg);

    this._platform = msg.protocol;
    this._content = [];
    this._bridgeName = bridgeName;
    this._channelId = `${msg.gateway}`;
    this._channelKey = this.bot.packChannelID(this._channelId);
    this._userId = `${msg.protocol}:${msg.userid}`;
    this._userKey = this.bot.packID(this._userId);
    this._msgTimestamp = parseFloat(msg.timestamp) * 1000;
    this._sessionType = 'CHANNEL';
    this._msgId = msg.id;
    this._eventMsgId = msg.id;
    this._type = 'message';
    this._author = {
      username: msg.username,
      nickname: msg.username,
      avatar: msg.avatar,
    };
    this._raw = msg;
  }

  public async processMessage() {
    const msg = this._raw;
    if (this._content.length > 0) return;
    if (msg.text) {
      const quote = msg.text.match(/(.*)\(re (.*)\)/s);
      if (quote) {
        this._content.push(eQuote('relayMsg', quote[2], msg.protocol));
        this._content.push(eText(quote[1]));
      } else {
        const imageMatch = msg.text.match(
          /(.*)(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif)\??[^\s]*)(.*)/s
        );
        const tenorMatch = msg.text.match(/(.*)(https:\/\/tenor\.com[^\s]*)(.*)/);
        if (imageMatch) {
          if (imageMatch[1]) {
            this._content.push(eText(imageMatch[1].trim()));
          }
          if (CONFIG.imageProxy) {
            this._content.push(eImage(`${CONFIG.imageProxy}//${imageMatch[2]}`));
          } else {
            this._content.push(eImage(`${imageMatch[2]}`));
          }
          if (imageMatch[3]) {
            this._content.push(eText(imageMatch[3].trim()));
          }
        } else if (tenorMatch) {
          if (tenorMatch[1]) {
            this._content.push(eText(tenorMatch[1].trim()));
          }
          if (CONFIG.imageProxy) {
            this._content.push(eImage(`${CONFIG.imageProxy}//${tenorMatch[2]}.gif`));
          } else {
            this._content.push(eImage(`${imageMatch[2]}`));
          }
          if (tenorMatch[3]) {
            this._content.push(eText(tenorMatch[3].trim()));
          }
        } else {
          this._content.push(eText(msg.text));
        }
      }
    }
    if (msg.Extra?.file) {
      for (const file of msg.Extra.file) {
        if (file.Name.match('.*.(png|jpeg|jpg|gif)')) {
          if (file.Data) {
            this._content.push(eImage(Buffer.from(file.Data, 'base64')));
          } else if (file.URL) {
            this._content.push(eImage(file.URL));
          } else {
            this._content.push(eText('[Image]'));
          }
        } else if (file.Name.match('.*.(webp)')) {
          if (file.Data) {
            try {
              const image = Buffer.from(file.Data, 'base64');
              const out = await sharp(image, { animated: true }).resize(128).gif().toBuffer();
              this._content.push(eImage(out));
            } catch {
              this._content.push(eText('[Sticker]'));
            }
          } else if (file.URL) {
            this._content.push(eText(`[Image ${file.URL}]`));
          } else {
            this._content.push(eText('[Image]'));
          }
        }
        if (file.Comment) this._content.push(eText(file.Comment));
      }
    }
  }

  public get bridgeName() {
    return this._bridgeName;
  }

  public makeReply(context: MessageAction): Partial<MessageReply> {
    return {
      text: (c, q) => context.text(c, q),
      image: c => context.image(c),
      elements: c => context.elements(c),
      delete: () => this.sessionType == 'CHANNEL' && context.delete(this.msgId),
    };
  }

  public get platform(): string {
    return this._platform;
  }

  public get platformShort(): string {
    return proto(this._platform);
  }
}

export class MatterbridgeBotAdapter extends GenericBotAdapter<StableWebSocket> {
  public makeChannelContext(gateway: string): Partial<MessageAction> {
    return {
      text: async (content: string, quote?: string) => {
        try {
          this.instance.send({
            username: this.botName,
            text: content,
            gateway,
            avatar:
              'https://raw.githubusercontent.com/TeeworldsCN/ddbot/master/images/avatar128.png',
          });
          return null;
        } catch {
          return null;
        }
      },
      elements: async (elements: GenericMessageElement[]) => {
        const text: string[] = [];
        const sendImage = async (url: string) => {
          try {
            this.instance.send({
              username: this.botName,
              text: url,
              gateway,
              avatar:
                'https://raw.githubusercontent.com/TeeworldsCN/ddbot/master/images/avatar128.png',
            });
          } catch (err) {
            /** ignore */
          }
        };

        const sendText = async () => {
          if (text.length == 0) return;
          try {
            this.instance.send({
              username: this.botName,
              text: text.splice(0, text.length).join(' '),
              gateway,
              avatar:
                'https://raw.githubusercontent.com/TeeworldsCN/ddbot/master/images/avatar128.png',
            });
          } catch (err) {
            /** ignore */
          }
        };

        let imageSent = false;

        for (const c of elements) {
          switch (c.type) {
            case 'text':
              text.push(c.content);
              break;
            case 'emote':
              text.push(`[${c.english ? c.english : c.name}]`);
              break;
            case 'mention':
              text.push(`[@${c.content}]`);
              break;
            case 'notify':
              text.push(`[@#${c.targetType}${c.target ? `:${c.target}` : ''}]`);
              break;
            case 'quote':
              if (c.content) text.push(quotify(c.content));
              break;
            case 'channel':
              text.push(`[#${c.content}]`);
              break;
            case 'image':
              if (!imageSent && typeof c.content == 'string') {
                await sendText();
                await sendImage(c.content);
                imageSent = true;
              } else {
                text.push(`[image]`);
              }
              break;
            case 'link':
              text.push(c.url);
              break;
            case 'unknown':
              text.push(`[${c.content}]`);
              break;
            default:
              text.push(`[unsupported]`);
          }
        }

        await sendText();
        return null;
      },
      image: async (image: string) => {
        try {
          this.instance.send({
            username: this.botName,
            text: image,
            gateway,
            avatar:
              'https://raw.githubusercontent.com/TeeworldsCN/ddbot/master/images/avatar128.png',
          });
          return null;
        } catch {
          return null;
        }
      },
      delete: async (msgid: string) => {
        try {
          this.instance.send({
            username: this.botName,
            id: msgid,
            event: 'msg_delete',
            gateway,
            avatar:
              'https://raw.githubusercontent.com/TeeworldsCN/ddbot/master/images/avatar128.png',
          });
          return null;
        } catch {
          return null;
        }
      },
    };
  }

  // bridge does not support direct messages
  public makeUserContext(_: string) {
    return {};
  }

  public connect() {
    const processMessage = async (matterMessage: MatterMessage) => {
      if (!matterMessage.event) {
        const msg = new MatterBridgeMessage(this, matterMessage, this.botName);
        await msg.processMessage();
        const text = msg.onlyText;

        if (!text.startsWith('.') && !text.startsWith('。')) {
          // not a command, do relay
          // no support for converse
          // fast broadcast, no await
          broadcastRelay(msg);
          return;
        }

        msg.command = text.replace(/^[\.。] ?/, '');
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
          } else {
            await broadcastRelay(msg);
          }
        })();
      }
    };

    this.instance.onMessage = async msg => {
      if (!Array.isArray(msg)) {
        processMessage(msg);
      } else {
        for (const matterMessage of msg) {
          processMessage(matterMessage);
        }
      }
    };
    this.instance.connect();
  }
}
