// import { TextHandler } from '../bottype';
// import { Card, SMD } from '../utils/cardBuilder';
// import { SERVERS } from '../utils/consts';
// import _ from 'lodash';
// import { CommandParser } from '../utils/commandParser';

// const mapLink = (msg: any, label: string, map: string) => {
//   return `[${SMD(label)}](https://ddnet.tw/maps/${msg.tools.ddnetEncode(map)})`;
// };

// const difficulty = (stars: number) => {
//   return _.padStart('', stars, '★') + _.padStart('', 5 - stars, '✰');
// };

// export const maps: TextHandler = async (msg, bot, type, raw) => {
//   const query = new CommandParser(msg.content);
//   const mapQueryString = query.getRest(1).replace(/['"]/g, '');
//   const card = new Card('lg');

//   if (!mapQueryString) {
//     await msg.reply.addReaction(msg.msgId, ['❌']);
//     return;
//   }

//   await msg.reply.addReaction(msg.msgId, ['⌛']);

//   // 查询地图
//   try {
//     // 地图Query
//     const mapQuery = await msg.tools.api.get(
//       `/ddnet/fuzzy/maps/${encodeURIComponent(mapQueryString)}`
//     );
//     const result = mapQuery.data;

//     if (result.length > 0) {
//       const mapName = result[0].name;

//       // 地图详情
//       const mapRes = await msg.tools.api.get(`/ddnet/maps/${encodeURIComponent(mapName)}`);
//       const map = mapRes.data;

//       card.addTitle(mapName);
//       card.addText(`作者: ${map.mapper}`);
//       if (map.tiles.length > 0)
//         card.addContext(
//           map.tiles.map((tile: any) => ({
//             src: `https://teeworlds.cn/assets/tiles/${tile}.png`,
//           }))
//         );
//       card.addTextWithImage(
//         `【${SERVERS[map.server]}】${difficulty(map.difficulty)} (${map.points}分)\n**${
//           map.teesFinished
//         }**名玩家完成了**${map.totalFinishes}**次该图\n平均用时**${msg.tools.secTime(
//           map.medianTime
//         )}**\n${mapLink(msg, '查看详情', mapName)}`,
//         {
//           src: `https://api.teeworlds.cn/ddnet/mapthumbs/${map.safeName}.png?square=true`,
//         },
//         'sm'
//       );
//       card.addButtons([
//         {
//           theme: 'info',
//           text: '预览',
//           value: `https://teeworlds.cn/p/${encodeURIComponent(mapName)}`,
//           click: 'link',
//         },
//         {
//           theme: 'secondary',
//           text: '我的记录',
//           value: `.rank "${map.name.replace(/"/g, '\\"')}"`,
//           click: 'return-val',
//         },
//         {
//           theme: 'secondary',
//           text: '全球排名',
//           value: `.top global ${map.name}`,
//           click: 'return-val',
//         },
//         {
//           theme: 'secondary',
//           text: '国服排名',
//           value: `.top chn ${map.name}`,
//           click: 'return-val',
//         },
//       ]);
//       card.addContext([
//         `发布日期: ${map.releaseDate.replace(/-/g, '/').replace('legacy', '上古老图')} (met)${
//           msg.authorId
//         }(met)`,
//       ]);
//       card.setTheme('success');
//     } else {
//       card.addTitle(`⚠ 未找到和${mapQueryString}相关的地图`);
//       card.addContext([`(met)${msg.authorId}(met)`]);
//       card.setTheme('warning');
//     }
//   } catch (err) {
//     card.slice(0, 0);
//     card.addMarkdown('❌ *查询失败，请稍后重试*');
//     card.addContext([`(met)${msg.authorId}(met)`]);
//     card.setTheme('danger');
//     console.error(err);
//   }

//   try {
//     await msg.reply.create(card);
//   } catch (e) {
//     console.error(e);
//     await msg.reply.create('暂时无法回应，请稍后重试');
//   }

//   await msg.reply.deleteReaction(msg.msgId, ['⌛']);
// };
