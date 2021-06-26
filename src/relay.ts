import axios, { AxiosInstance } from 'axios';
import { IncomingMessage } from 'http';
import { segment } from 'oicq';
import { kaiheila, oicq } from './bots';
import { GenericMessage } from './bots/base';
import { segmentToCard } from './bots/kaiheila';
import { segmentToOICQSegs } from './bots/oicq';
import { getRelay } from './db/relay';
import { LEVEL_NORELAY } from './db/user';
import { Card, SMD } from './utils/cardBuilder';
import { unpackID } from './utils/helpers';
import ndjson from 'ndjson';

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

const broadcastMessage = async (bridge: string, msg: any) => {
  if (!msg?.gateway) return;

  const doc = await getRelay(`gateway|${bridge}:${msg.gateway}`);
  if (!doc) return;

  // broadcast
  for (const channel of doc.channels) {
    const unpacked = unpackID(channel);
    if (unpacked.platform == 'kaiheila') {
      if (kaiheila) {
        const card = new Card('sm');
        if (msg.avatar) {
          card.addTextWithImage(
            `**[${SMD(msg.protocol)}] ${SMD(msg.username)}**\n${SMD(msg.text)}`,
            { src: `https://ip.webmasterapi.com/api/imageproxy/32/${msg.avatar}` },
            'sm',
            false,
            true,
            true
          );
        } else {
          card.addMarkdown(`**[${SMD(msg.protocol)}] ${SMD(msg.username)}**`);
          card.addText(msg.text);
        }
        kaiheila.channel(channel).card(card);
      }
    } else {
      if (oicq) {
        oicq.channel(channel).text(`[${msg.protocol}] ${msg.username}: ${msg.text}`);
      }
    }
  }
};

let stream: IncomingMessage = null;

const connectBridge = (name: string) => {
  BRIDGES[name]
    .get<IncomingMessage>('/stream', {
      responseType: 'stream',
    })
    .then(res => {
      res.data.pipe(ndjson.parse()).on('data', obj => {
        broadcastMessage(name, obj);
      });
      res.data.on('close', () => {
        console.log(`bridge ${name} disconnected, retry in 10 seconds`);
        setTimeout(connectBridge, 10000, name);
      });
      stream = res.data;
      console.log('relay connected');
    })
    .catch(err => {
      console.log(`bridge ${name} failed to connect`);
      console.log(err.message);
      console.log('retrying bridge in 10 seconds');
      setTimeout(connectBridge, 10000, name);
    });
};

export const relayStart = () => {
  for (const name in BRIDGES) {
    connectBridge(name);
  }
};

export const relayStop = () => {
  if (stream) {
    stream.destroy();
    console.log('relay stopped');
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
        avatar: msg.author?.avatar,
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
        avatar: msg.author?.avatar,
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
        if (c.content) text.push(`> ${c.content.slice(0, 24)}\n`);
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

export const outboundMessage = async (msg: GenericMessage<any>, update: boolean = false) => {
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
        if (msg.author?.avatar) {
          card.addTextWithImage(
            `**${SMD(msg.author.nicktag)}\n[${SMD(msg.bot.platformShort)}]**`,
            { src: `${msg.author?.avatar}` },
            'sm',
            false,
            true,
            true
          );
        } else {
          card.addMarkdown(`**[${SMD(msg.bot.platformShort)}] ${SMD(msg.author.nicktag)}**`);
        }
        await segmentToCard(kaiheila, msg.content, card, 'text');
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
