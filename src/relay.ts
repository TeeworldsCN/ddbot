import { getRelay } from './db/relay';
import { LEVEL_NORELAY } from './db/user';
import { unpackChannelID } from './utils/helpers';
import { EMPTY_ACTIONS, GenericMessage, MessageReply, quotify } from './bots/base';
import { botsByName, bridges, qqguild } from './bots';
import { elementsToQQGuildMessage } from './bots/qqguild';
import { eText } from './utils/messageElements';

// 多Bot共用Adapter和Message
export class RelayMessage {
  private baseMessage: GenericMessage<any>;
  constructor(baseMessage: GenericMessage<any>) {
    this.baseMessage = baseMessage;
  }

  public get replyOne(): MessageReply {
    return this.baseMessage.reply;
  }

  // TODO: add more message types?
  public get reply(): MessageReply {
    return {
      ...EMPTY_ACTIONS,
      text: async (content: string, quote?: string) => {
        broadcastText(content, this.baseMessage);
        return null;
      },
    };
  }

  public get base(): GenericMessage<any> {
    return this.baseMessage;
  }
}

const relayMessageToGateway = async (name: string, gateway: string, msg: GenericMessage<any>) => {
  if (!bridges[name]) return;

  const text: string[] = [];
  const sendImage = async (url: string) => {
    try {
      bridges[name].instance.send({
        username: `[${msg.platformShort}] ${msg.author.nickname}`,
        text: url,
        gateway,
        avatar: typeof msg.author?.avatar == 'string' ? msg.author?.avatar : undefined,
      });
    } catch (err) {
      console.error(`桥接图片至${name}发送失败`);
      console.error(err);
    }
  };

  const sendText = async () => {
    if (text.length == 0) return;
    try {
      bridges[name].instance.send({
        username: `[${msg.platformShort}] ${msg.author.nickname}`,
        text: text.splice(0, text.length).join(' '),
        gateway,
        avatar: typeof msg.author?.avatar == 'string' ? msg.author?.avatar : undefined,
      });
    } catch (err) {
      console.error(`桥接消息至${name}发送失败`);
      console.error(err);
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

export const broadcastRelay = async (msg: GenericMessage<any>, update: boolean = false) => {
  const relay = await getRelay(msg.channelKey);
  if (!relay) return false;

  await msg.fillMsgDetail();
  if (msg.userLevel >= LEVEL_NORELAY) return;

  // FIXME：开黑啦缺少事件，撤回做不了
  // if (!update) await createMsg(msg.channelKey, msg.msgId);

  // broadcast
  for (const channel of relay.channels) {
    if (channel == msg.channelKey) continue;

    const unpacked = unpackChannelID(channel);
    if (unpacked.platform == 'gateway') {
      await relayMessageToGateway(unpacked.botName, unpacked.id, msg);
    } else if (unpacked.platform == 'qqguild') {
      const guildMsg = elementsToQQGuildMessage(
        qqguild,
        [eText(`[${msg.platformShort}] ${msg.author.nickname}: \n`), ...msg.content],
        'text'
      );
      if (guildMsg.content || guildMsg.image) {
        await qqguild.instance.client.messageApi.postMessage(unpacked.id, guildMsg);
      }
    }
  }

  return true;
};

export const broadcastText = async (text: string, caller?: GenericMessage<any>) => {
  if (caller) {
    await caller.fillMsgDetail();
    if (caller.userLevel >= LEVEL_NORELAY) return;
  }

  // do normal reply if it's not a relay channel
  const relay = (await getRelay(caller.channelKey)) || {
    channels: caller ? [caller.channelKey] : [],
  };

  // broadcast
  for (const channel of relay.channels) {
    const unpacked = unpackChannelID(channel);
    const bot = botsByName[unpacked.botName];
    if (bot) {
      await bot.channel(channel).text(text);
    }
  }

  return true;
};
