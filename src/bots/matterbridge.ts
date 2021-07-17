import { AxiosInstance } from 'axios';
import { command } from 'commander';
import { LEVEL_USER } from '../db/user';
import { broadcastRelay, RelayMessage } from '../relay';
import { eQuote, eText, eImage } from '../utils/messageElements';
import { GenericBotAdapter, GenericMessage, MessageAction, MessageReply } from './base';

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

class MatterBridgeMessage extends GenericMessage<AxiosInstance> {
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
      nicktag: msg.username,
      tag: msg.username,
      avatar: msg.avatar,
    };

    if (msg.text) {
      const quote = msg.text.match(/(.*)\(re (.*)\)/s);
      if (quote) {
        this._content.push(eQuote('relayMsg', quote[2], msg.protocol));
        this._content.push(eText(quote[1]));
      } else {
        const imageMatch = msg.text.match(/(.*)(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif))(.*)/s);
        if (imageMatch) {
          if (imageMatch[1]) {
            this._content.push(eText(imageMatch[1].trim()));
          }
          this._content.push(eImage(imageMatch[2]));
          if (imageMatch[3]) {
            this._content.push(eText(imageMatch[3].trim()));
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
            if (file.Comment) this._content.push(eText(file.Comment));
          } else if (file.URL) {
            this._content.push(eImage(file.URL));
            if (file.Comment) this._content.push(eText(file.Comment));
          }
        }
      }
    }
  }

  public get bridgeName() {
    return this._bridgeName;
  }

  public makeReply(context: MessageAction): Partial<MessageReply> {
    return {
      text: (c, q, t) => context.text(c, q, t ? this.userId : undefined),
      image: (c, t) => context.image(c, t ? this.userId : undefined),
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

export class MatterbridgeBotAdapter extends GenericBotAdapter<AxiosInstance> {
  public makeChannelContext(gateway: string): Partial<MessageAction> {
    return {
      text: async (content: string, quote?: string, onlyTo?: string) => {
        try {
          const data = await this.instance.post('/message', {
            username: this.botName,
            text: content,
            gateway,
            avatar:
              'https://raw.githubusercontent.com/TeeworldsCN/ddbot/master/images/avatar128.png',
          });
          return data.data.id;
        } catch {
          return null;
        }
      },
      image: async (image: string, onlyTo?: string) => {
        try {
          const data = await this.instance.post('/message', {
            username: this.botName,
            text: image,
            gateway,
            avatar:
              'https://raw.githubusercontent.com/TeeworldsCN/ddbot/master/images/avatar128.png',
          });
          return data.data.id;
        } catch {
          return null;
        }
      },
      delete: async (msgid: string) => {
        try {
          const data = await this.instance.post('/message', {
            username: this.botName,
            id: msgid,
            event: 'msg_delete',
            gateway,
            avatar:
              'https://raw.githubusercontent.com/TeeworldsCN/ddbot/master/images/avatar128.png',
          });
          return data.data.id;
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

  public queryBridge() {
    this.instance
      .get<MatterMessage[]>('/messages')
      .then(async res => {
        for (const matterMessage of res.data) {
          if (!matterMessage.event) {
            const msg = new MatterBridgeMessage(this, matterMessage, this.botName);
            const text = msg.onlyText;

            if (!text.startsWith('.') && !text.startsWith('。')) {
              // not a command, do relay
              // no support for converse
              await broadcastRelay(msg);
              continue;
            }

            msg.command = text.replace(/^[\.。] ?/, '');
            const command = msg.command.split(' ')[0].toLowerCase();

            if (this.globalCommands[command]) {
              await broadcastRelay(msg);
              await msg.fillMsgDetail();
              if (msg.effectiveUserLevel > LEVEL_USER) continue;
              if (msg.effectiveUserLevel > this.globalCommands[command].level) continue;
              this.globalCommands[command].func(new RelayMessage(msg)).catch(reason => {
                console.error(`Error proccessing global command '${text}'`);
                console.error(reason);
              });
            } else if (this.commands[command]) {
              await msg.fillMsgDetail();
              if (msg.effectiveUserLevel > LEVEL_USER) continue;
              if (msg.effectiveUserLevel > this.commands[command].level) continue;

              this.commands[command].func(msg).catch(reason => {
                console.error(`Error proccessing command '${text}'`);
                console.error(reason);
              });
            } else {
              await broadcastRelay(msg);
            }
          }
        }
        setTimeout(() => {
          this.queryBridge();
        }, 500);
      })
      .catch(err => {
        console.log(`bridge ${this.botName} failed to connect`);
        console.log(err.message);
        console.log('retrying bridge in 5 seconds');
        setTimeout(() => {
          this.queryBridge();
        }, 5000);
      });
  }

  public connect() {
    this.queryBridge();
  }
}
