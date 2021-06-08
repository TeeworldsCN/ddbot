// import { CommandParser } from '../utils/commandParser';
// import { TextHandler } from '../bottype';

// export const subscribe: TextHandler = async (msg, bot, type, raw) => {
//   if (msg.channelType == 'PERSON') return;
//   if (!msg.author.isAdmin) return;

//   const query = new CommandParser(msg.content);
//   const itemType = query.getRest(1);

//   if (itemType == 'map') {
//     msg.tools.db.set('map_channel', msg.channelId).write();
//     msg.reply.create('该频道将收到地图更新');
//   } else if (itemType == 'record') {
//     msg.tools.db.set('record_channel', msg.channelId).write();
//     msg.reply.create('该频道将收到记录更新');
//   }
// };
