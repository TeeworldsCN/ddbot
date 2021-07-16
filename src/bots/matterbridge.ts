import axios, { AxiosInstance } from 'axios';
import { packID } from '../utils/helpers';
import { eQuote, eText, eImage } from '../utils/messageElements';
import { GenericBotAdapter, GenericMessage, MessageAction } from './base';

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

const queryBridge = (name: string) => {
  BRIDGES[name]
    .get<MatterMessage[]>('/messages')
    .then(res => {
      for (const msg of res.data) {
        new MatterBridgeMessage(msg, name);
      }
      setTimeout(queryBridge, 500, name);
    })
    .catch(err => {
      console.log(`bridge ${name} failed to connect`);
      console.log(err.message);
      console.log('retrying bridge in 5 seconds');
      setTimeout(queryBridge, 5000, name);
    });
};

class MatterBridgeMessage extends GenericMessage<null> {
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

  public makeReply(_: MessageAction) {
    return {};
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
            username: `ddbot`,
            text: content,
            gateway,
            avatar: undefined, // TODO: add avatar
          });
        } catch {
          return null;
        }
      },
    };
  }

  // bridge does not
  public makeUserContext(_: string) {
    return {};
  }

  public connect() {
    for (const name in BRIDGES) {
      queryBridge(name);
    }
  }
}
