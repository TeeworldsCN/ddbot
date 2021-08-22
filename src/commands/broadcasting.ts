import { kaiheila, oicq } from '../bots';
import { GenericMessage, GenericMessageElement } from '../bots/base';
import { TextHandler } from '../bottype';
import { SubscriptionModel } from '../db/subscription';
import { CommandParser } from '../utils/commandParser';
import { unpackChannelID } from '../utils/helpers';
import { eNotifyAll, eText } from '../utils/messageElements';

const sendKaiheila = async (content: string, channelKey: string, atAll: boolean) => {
  if (!kaiheila) return;
  if (atAll) await kaiheila.channel(channelKey).elements([eNotifyAll(), eText(content)], true);
  else await kaiheila.channel(channelKey).elements([eText(content)], true);
};

const sendOICQ = async (content: string, channelKey: string, atAll: boolean) => {
  if (!oicq) return;
  const channelInfo = unpackChannelID(channelKey);
  const groupId = parseInt(channelInfo.id);
  const elements: GenericMessageElement[] = [];
  elements.push(eText(`--- 公告`));
  if (atAll) elements.push(eNotifyAll());
  elements.push(eText(` ---\n${content}\n------------`));
  await oicq.channel(channelKey).elements(elements);
  await oicq.instance.sendGroupNotice(groupId, content);
};

const broadcastImpl: (atAll: boolean) => TextHandler = atAll => async msg => {
  const query = new CommandParser(msg.command);

  const sub = query.getString(1);

  const doc = await SubscriptionModel.findOne({ name: sub }).exec();
  if (!doc) {
    await msg.reply.text(`没有频道订阅了${sub}消息`);
    return;
  }

  const content = query.getRest(2);

  // broadcast
  for (const channel of doc.channels) {
    const unpacked = unpackChannelID(channel);
    if (unpacked.platform == 'kaiheila') {
      await sendKaiheila(content, channel, atAll);
    } else if (unpacked.platform == 'oicq') {
      await sendOICQ(content, channel, atAll);
    }
  }
};

export const broadcast: TextHandler = broadcastImpl(false);
export const broadcastAtAll: TextHandler = broadcastImpl(true);
