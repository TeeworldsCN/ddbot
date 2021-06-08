// import { RssFeeder } from '../utils/rssFeeder';
// import cheerio from 'cheerio';

// const feeder = new RssFeeder(10000);
// feeder.startFeed('https://ddnet.tw/status/records/feed/', 'record', 30000, 10000);
// feeder.startFeed('https://ddnet.tw/releases/feed/', 'map', 60000, 0);

// feeder.register('record', async item => {
//   if (!item || !item.title) {
//     console.warn('Record: no item');
//     return false;
//   }

//   const channelId = tools.db.get('record_channel').value();
//   if (!channelId) {
//     console.warn('Record: not subscribed, skipping');
//     return false;
//   }

//   const card = new Card('lg');
//   const data = (item.title as string).match(
//     /\[([A-Z]*)\] (.* rank).*on \[([A-Za-z]*)\] ([^:]*): ([0-9:.]*) (.*) \(([^-)]*)(?: - (.*%).*)?\)/
//   );

//   if (data) {
//     const server = SERVERS[data[3].toLowerCase()] || data[3];
//     const map = data[4];
//     const flag = FLAGS[data[1].toLowerCase()] || data[1];
//     const types: { [key: string]: [string, string, string, string] } = {
//       'top 1 team rank': ['队伍', '最高团队记录', '提升率', 'success'],
//       'top 1 rank': ['玩家', '最高个人记录', '提升率', 'success'],
//       'worst rank': ['玩家', '最差个人记录', '降低率', 'danger'],
//       'worst team rank': ['队伍', '最差团队记录', '降低率', 'danger'],
//     };
//     const type = types[data[2].toLowerCase()] || ['', '新记录', '变化', 'secondary'];
//     const old = data[7].slice(16) || data[5];

//     card.addMarkdown(
//       `**【${server}】${SMD(map)}**\n${flag} ${type[0]} **${SMD(data[6])}** 创下${type[1]}！`
//     );
//     if (data[8]) {
//       card.addTable([
//         [
//           `**新记录**\n${SMD(data[5])}`,
//           `**原记录**\n~~${SMD(old)}~~`,
//           `**${type[2]}**\n${data[8]}`,
//         ],
//       ]);
//       card.setTheme(type[3] as any);
//     } else {
//       card.addTable([[`**首杀记录！**\n${SMD(data[5])}`]]);
//       card.setTheme('warning');
//     }
//   } else {
//     card.slice(0, 0);
//     card.addText(item.title);
//   }
//   card.addContext([`${tools.dateTime(item.updated)}`]);
//   await bot.API.message.create(10, channelId, card.toString());
//   return true;
// });

// feeder.register('map', async item => {
//   if (!item || !item.title) {
//     console.warn('Map: no item');
//     return false;
//   }

//   const channelId = tools.db.get('map_channel').value();
//   if (!channelId) {
//     console.warn('Map: not subscribed, skipping');
//     return false;
//   }

//   const card = new Card('lg');

//   try {
//     const $ = cheerio.load(item.content);
//     let name = null;
//     let author = null;
//     let server = null;
//     let size = null;
//     let desc = null;

//     $('div a').each((i, e) => {
//       const link = $(e);
//       const href = link.attr('href');
//       if (href.startsWith('/maps/')) {
//         name = link.text();
//       } else if (href.startsWith('/mappers/')) {
//         author = link.text();
//       } else if (href.startsWith('/ranks/')) {
//         server =
//           SERVERS[
//             link
//               .text()
//               .replace(/ [Ss]erver/, '')
//               .toLowerCase()
//           ];
//       }
//     });

//     if (!name || !author) throw new Error("Can't parse essential map detail");

//     $('div span').each((i, e) => {
//       const title = $(e).attr('title');
//       const sizeMatch = title.match(/([0-9]*x[0-9]*)/);
//       if (sizeMatch) {
//         size = sizeMatch[1];
//       }
//     });

//     $('div p').each((i, e) => {
//       const text = $(e).text().trim();
//       if (text.startsWith('Difficulty')) {
//         desc = text.replace('Difficulty', '星级').replace(', Points', '\n分数');
//       }
//     });

//     const imageName = $('.screenshot')
//       .attr('src')
//       .match(/\/ranks\/maps\/(.*).png/)?.[1];

//     const tiles = $('div p')
//       .eq(3)
//       .find('img')
//       .toArray()
//       .map(e => {
//         const tile = $(e)
//           .attr('src')
//           .match(/\/([^\/]*).png/)[1];
//         return {
//           src: `https://teeworlds.cn/assets/tiles/${tile}.png`,
//         };
//       });

//     card.addTitle(`DDNet 新地图发布`);
//     card.addTextWithButton(`地图: ${name}\n作者: ${author}`, {
//       theme: 'info',
//       text: '预览',
//       value: `https://teeworlds.cn/p/${encodeURIComponent(name)}`,
//       click: 'link',
//     });

//     if (tiles.length > 0) card.addContext(tiles);

//     if (!size || !server || !desc) {
//       const retried = tools.db.get(`map_wait_cycle`).value() || 0;
//       if (retried < 10) {
//         tools.db.set(`map_wait_cycle`, retried + 1).write();
//         return false;
//       }
//     }

//     const text = [];
//     if (size) text.push(`地图大小: ${size}`);
//     if (server) text.push(`类型: ${server}`);
//     if (desc) text.push(desc);
//     const descText = `${text.join('\n')}\n\n发布时间: ${tools.dateTime(item.updated)}`;

//     if (imageName) {
//       card.addTextWithImage(
//         descText,
//         { src: `https://api.teeworlds.cn/ddnet/mapthumbs/${imageName}.png?square=true` },
//         'lg',
//         true
//       );
//     } else {
//       card.addText(descText);
//     }

//     card.setTheme('success');
//     tools.db.set(`map_wait_cycle`, 0).write();
//   } catch (e) {
//     console.error('Map card error:');
//     console.error(e);
//     card.slice(0, 0);
//     card.addText(item.title);
//   }

//   await bot.API.message.create(10, channelId, card.toString());
//   return true;
// });