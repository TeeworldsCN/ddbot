import axios, { AxiosInstance } from 'axios';
import { segment } from 'oicq';
import { kaiheila, oicq } from './bots';
import { GenericBot, GenericMessage, MessageAction, quotify } from './bots/base';
import { segmentToCard } from './bots/kaiheila';
import { segmentToOICQSegs } from './bots/oicq';
import { getRelay } from './db/relay';
import { LEVEL_NORELAY } from './db/user';
import { Card, SMD } from './utils/cardBuilder';
import { packID, unpackID } from './utils/helpers';
import { eImage, eQuote, eText } from './utils/messageElements';

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

class RelayFakeBotAdapter extends GenericBot<null> {
  private name: string;

  constructor(name: string) {
    super(null);
    this.name = name;
  }
  public makeChannelContext(_: string) {
    return {};
  }
  public makeUserContext(_: string) {
    return {};
  }
  public connect() {}

  public get platform(): string {
    return this.name;
  }
  public get platformShort(): string {
    return proto(this.name);
  }
}

class RelayMessage extends GenericMessage<null> {
  constructor(msg: MatterMessage, bridgeName: string) {
    super(new RelayFakeBotAdapter(msg.protocol), msg);
    this._content = [];
    this._channelId = `${bridgeName}:${msg.gateway}`;
    this._channelKey = packID({ platform: 'gateway', id: this._channelId });
    this._userId = `${bridgeName}:${msg.userid}`;
    this._userKey = packID({ platform: 'gateway', id: this._userId });
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
        this._content.push(eText(msg.text));
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

  public makeReply(_: MessageAction) {
    return {};
  }
}

const BRIDGES = (() => {
  const info = process.env.MATTERBRIDGE_API
    ? process.env.MATTERBRIDGE_API.split('|').map(b => {
        const data = b.split('#');
        return {
          name: data[0],
          url: data.slice(1).join(''),
        };
      })
    : [];
  const tokens = process.env.MATTERBRIDGE_TOKEN ? process.env.MATTERBRIDGE_TOKEN.split('|') : [];
  const result: {
    [name: string]: AxiosInstance;
  } = {};
  for (let i = 0; i < info.length; ++i) {
    const b = info[i];
    const t = tokens[i];
    result[b.name] = axios.create({
      baseURL: b.url,
      headers: t ? { Authorization: `Bearer ${t}` } : undefined,
    });
  }

  return result;
})();

const queryBridge = (name: string) => {
  BRIDGES[name]
    .get<MatterMessage[]>('/messages')
    .then(res => {
      for (const msg of res.data) {
        broadcastMessage(new RelayMessage(msg, name));
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

export const relayStart = () => {
  for (const name in BRIDGES) {
    queryBridge(name);
  }
};

export const sendMessageToGateway = async (
  bridge: string,
  gateway: string,
  msg: GenericMessage<any>
) => {
  if (!BRIDGES[bridge]) return;

  const text: string[] = [];
  const sendImage = async (url: string) => {
    try {
      await BRIDGES[bridge].post('/message', {
        username: `[${msg.bot.platformShort}] ${msg.author.nickname}`,
        text: url,
        gateway,
        avatar: typeof msg.author?.avatar == 'string' ? msg.author?.avatar : undefined,
      });
    } catch (err) {
      await msg.reply.text(`桥接图片至${bridge}发送失败`);
    }
  };

  const sendText = async () => {
    if (text.length == 0) return;
    try {
      await BRIDGES[bridge].post('/message', {
        username: `[${msg.bot.platformShort}] ${msg.author.nickname}`,
        text: text.splice(0, text.length).join(''),
        gateway,
        avatar: typeof msg.author?.avatar == 'string' ? msg.author?.avatar : undefined,
      });
    } catch (err) {
      await msg.reply.text(`桥接消息至${bridge}发送失败`);
    }
  };

  let imageSent = false;

  for (const c of msg.content) {
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
      case 'unknown':
        text.push(`[${c.content}]`);
        break;
      default:
        text.push(`[unsupported]`);
    }
  }

  await sendText();
};

// FIXME：开黑啦缺少事件，撤回做不了
// export const recallMessage = async (msgId: string) => {
//   const msg = await getMsg(msgId);
//   if (!msg) return;

//   for (const message of msg.messages) {
//     if (msgId == message.msgId) continue;

//     const unpacked = unpackID(message.channel);
//     if (unpacked.platform == 'kaiheila') {
//       if (kaiheila) {
//         kaiheila.channel(message.channel).delete(message.msgId);
//       }
//     } else if (unpacked.platform == 'oicq') {
//       if (oicq) {
//         oicq.channel(message.channel).delete(message.msgId);
//       }
//     }
//   }
// };

export const broadcastMessage = async (msg: GenericMessage<any>, update: boolean = false) => {
  const relay = await getRelay(msg.channelKey);
  if (!relay) return false;

  await msg.fillMsgDetail();
  if (msg.userLevel >= LEVEL_NORELAY) return;

  // FIXME：开黑啦缺少事件，撤回做不了
  // if (!update) await createMsg(msg.channelKey, msg.msgId);

  // broadcast
  for (const channel of relay.channels) {
    if (channel == msg.channelKey) continue;

    const unpacked = unpackID(channel);
    if (unpacked.platform == 'kaiheila') {
      if (kaiheila) {
        const card = new Card('sm');
        // if (msg.author?.avatar) {
        //   if (typeof msg.author?.avatar != 'string') {
        //     msg.author.avatar = await kaiheila.uploadImage(
        //       `avatar-${msg.userKey}.png`,
        //       msg.author.avatar
        //     );
        //   }

        //   if (!msg.author.avatar) {
        //     card.addMarkdown(`**[${SMD(msg.bot.platformShort)}] ${SMD(msg.author.nicktag)}**`);
        //   } else {
        //     card.addTextWithImage(
        //       `**[${SMD(msg.bot.platformShort)}]\n${SMD(msg.author.nicktag)}**`,
        //       { src: `${msg.author?.avatar}` },
        //       'sm',
        //       false,
        //       true,
        //       true
        //     );
        //   }
        // } else {
        //   card.addMarkdown(`**[${SMD(msg.bot.platformShort)}] ${SMD(msg.author.nicktag)}**`);
        // }
        card.addMarkdown(`**[${SMD(msg.bot.platformShort)}] ${SMD(msg.author.nicktag)}**`);
        await segmentToCard(kaiheila, msg.content, card, false, 'text');
        if (card.length == 1) continue;
        kaiheila.channel(channel).card(card);
        // .then(id => {
        //   id && markMsg(msg.msgId, channel, id);
        // });
      }
    } else if (unpacked.platform == 'oicq') {
      if (oicq) {
        const segs = segmentToOICQSegs(oicq, msg.content, 'text');
        if (segs.length == 0) continue;
        oicq.instance.sendGroupMsg(parseInt(unpacked.id), [
          segment.text(`[${SMD(msg.bot.platformShort)}] ${SMD(msg.author.nicktag)}: `),
          ...segs,
        ]);
        // .then(data => {
        //   data.retcode || markMsg(msg.msgId, channel, data.data.message_id);
        // });
      }
    } else if (unpacked.platform == 'gateway') {
      const [name, gateway] = unpacked.id.split(':');
      sendMessageToGateway(name, gateway, msg);
    }
  }

  return true;
};
