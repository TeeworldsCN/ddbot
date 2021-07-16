// 多Bot共用Adapter和Message

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
        text: text.splice(0, text.length).join(' '),
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
