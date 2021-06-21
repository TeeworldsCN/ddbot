import axios from 'axios';
import { IncomingMessage } from 'http';
import { kaiheila, oicq } from './bots';
import { GenericMessage } from './bots/base';
import { getGateway, getRelay } from './db/relay';
import { Card, SMD } from './utils/cardBuilder';
import { unpackID } from './utils/helpers';

const headers = process.env.MATTERBRIDGE_TOKEN
  ? {
      Authorization: `Bearer ${process.env.MATTERBRIDGE_TOKEN}`,
    }
  : {};

const bridgeAxios = process.env.MATTERBRIDGE_API
  ? axios.create({
      baseURL: process.env.MATTERBRIDGE_API,
      headers,
    })
  : null;

const broadcastMessage = async (msg: any) => {
  if (!msg?.gateway) return;

  const doc = await getGateway(msg.gateway);
  if (!doc) return;

  // broadcast
  for (const channel of doc.channels) {
    const unpacked = unpackID(channel);
    if (unpacked.platform == 'kaiheila') {
      if (kaiheila) {
        const card = new Card('lg');
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
        oicq.channel(channel).text(`[${msg.protocol}] ${msg.username}:\n${msg.text}`);
      }
    }
  }
};

let stream: IncomingMessage = null;

export const relayStart = () => {
  if (!process.env.MATTERBRIDGE_API) return;

  bridgeAxios
    .get<IncomingMessage>('/stream', {
      responseType: 'stream',
    })
    .then(res => {
      res.data.on('data', chunk => {
        try {
          const data = JSON.parse(chunk.toString());
          broadcastMessage(data).then(() => {});
        } catch (err) {
          console.log('relay invalid message');
          console.log(err.message);
        }
      });
      res.data.on('close', () => {
        console.log('relay disconnected, retry in 10 seconds');
        setTimeout(relayStart, 10000);
      });
      stream = res.data;
      console.log('relay connected');
    })
    .catch(err => {
      console.log('relay failed to connect');
      console.log(err.message);
      console.log('retrying relay in 10 seconds');
      setTimeout(relayStart, 10000);
    });
};

export const relayStop = () => {
  if (stream) {
    stream.destroy();
    console.log('relay stopped');
  }
};

export const outboundMessage = async (msg: GenericMessage<any>) => {
  const relay = await getRelay(msg.channelKey);
  if (!relay) return false;

  // broadcast
  for (const channel of relay.channels) {
    if (channel == msg.channelKey) return;

    const unpacked = unpackID(channel);
    if (unpacked.platform == 'kaiheila') {
      if (kaiheila) {
        const card = new Card('lg');
        if (msg.author?.avatar) {
          card.addTextWithImage(
            `**[${SMD(msg.bot.platformShort)}] ${SMD(msg.author.nickname)}**\n${SMD(msg.text)}`,
            { src: `${msg.author?.avatar}` },
            'sm',
            false,
            true,
            true
          );
        } else {
          card.addMarkdown(`**[${SMD(msg.bot.platformShort)}] ${SMD(msg.author.nickname)}**`);
          card.addText(msg.text);
        }
        kaiheila.channel(channel).card(card);
      }
    } else {
      if (oicq) {
        oicq
          .channel(channel)
          .text(`[${msg.bot.platformShort}] ${msg.author.nickname}:\n${msg.text}`);
      }
    }
  }

  if (!bridgeAxios) return true;

  try {
    await bridgeAxios.post('/message', {
      username: `[${msg.bot.platformShort}] ${msg.author.nickname}`,
      text: msg.text,
      gateway: relay.gateway,
      avatar: msg.author?.avatar,
    });
  } catch (err) {
    msg.reply.text('频道桥接已断连');
  }

  return true;
};
