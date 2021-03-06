import { TextHandler } from './bottype';
import { Card } from '../utils/cardBuilder';

export const subscribe: TextHandler = async (msg, bot, type, raw) => {
  if (msg.channelType == 'PERSON') return;
  if (!msg.author.isAdmin) return;

  const itemType = msg.content.split(' ')[1];

  if (itemType == 'map') {
    msg.db.set('map_channel', msg.channelId).write();
    msg.reply.create('该频道将收到地图更新');
  } else if (itemType == 'record') {
    msg.db.set('record_channel', msg.channelId).write();
    msg.reply.create('该频道将收到记录更新');
  }
};
