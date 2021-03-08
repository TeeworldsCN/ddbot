require('dotenv').config();

import { ButtonClickEvent, KaiheilaBot, TextMessage } from 'kaiheila-bot-root';
import { BUTTONS, COMMANDS } from './commands';
import { Tools, initTools } from './tools';
import { RssFeeder } from './utils/rssFeeder';
import { Card, SMD } from './utils/cardBuilder';
import { FLAGS, SERVERS } from './utils/consts';
import cheerio from 'cheerio';

const tools = initTools();

/*
    机器人初始化
 */

const bot = new KaiheilaBot({
  mode: 'websocket',
  token: process.env.KAIHEILA_BOT_TOKEN,
  ignoreDecryptError: false,
});

bot.on('textMessage', (e: TextMessage) => {
  // no bot message
  if (e.author.bot) return;

  if (!e.content.startsWith('.') && !e.content.startsWith('。')) {
    return;
  }

  const text = e.content.replace(/^\. /, '.');
  const command = text.split(' ')[0].slice(1);

  for (let key in COMMANDS) {
    if (key == command) {
      COMMANDS[key](new Tools(bot, e, 'text'), bot, 'text', e).catch(reason => {
        console.error(`Error proccessing command '${e.content}'`);
        console.error(reason);
      });
    }
  }
});

bot.on('buttonClick', (e: ButtonClickEvent) => {
  if (e.value.startsWith('.')) {
    const command = e.value.split(' ')[0].slice(1);
    for (let key in COMMANDS) {
      if (key == command) {
        COMMANDS[key](new Tools(bot, e, 'button'), bot, 'button', e).catch(reason => {
          console.error(`Error proccessing command button'${e.value}'`);
          console.error(reason);
        });
      }
    }
  } else {
    for (let key in BUTTONS) {
      if (e.value == key) {
        BUTTONS[key](new Tools(bot, e, 'button'), bot, e).catch(reason => {
          console.error(`Error proccessing event button '${e.value}'`);
          console.error(reason);
        });
      }
    }
  }
});

/*
  RSS 订阅
 */

const feeder = new RssFeeder(10000, tools.db);
feeder.startFeed('https://ddnet.tw/status/records/feed/', 'record', 30000, 10000);
feeder.startFeed('https://ddnet.tw/releases/feed/', 'map', 60000, 20000);

feeder.register('record', async item => {
  if (!item || !item.title) {
    console.warn('Record: no item');
    return false;
  }

  const channelId = tools.db.get('record_channel').value();
  if (!channelId) {
    console.warn('Record: not subscribed, skipping');
    return false;
  }

  const card = new Card('lg');
  const data = (item.title as string).match(
    /\[([A-Z]*)\] (.* rank).*on \[([A-Za-z]*)\] ([^:]*): ([0-9:.]*) (.*) \(([^-)]*)(?: - (.*%).*)?\)/
  );

  if (data) {
    const server = SERVERS[data[3].toLowerCase()] || data[3];
    const map = data[4];
    const flag = FLAGS[data[1].toLowerCase()] || data[1];
    const types: { [key: string]: [string, string, string, string] } = {
      'top 1 team rank': ['队伍', '最高团队记录', '提升率', 'success'],
      'top 1 rank': ['玩家', '最高个人记录', '提升率', 'success'],
      'worst rank': ['玩家', '最差个人记录', '降低率', 'danger'],
      'worst team rank': ['队伍', '最差团队记录', '降低率', 'danger'],
    };
    const type = types[data[2].toLowerCase()] || ['', '新记录', '变化', 'secondary'];
    const old = data[7].slice(16) || data[5];

    card.addMarkdown(
      `**【${server}】${SMD(map)}**\n${flag} ${type[0]} **${SMD(data[6])}** 创下${type[1]}！`
    );
    if (data[8]) {
      card.addTable([
        [`**新记录**\n${data[5]}`, `**原记录**\n~~${old}~~`, `**${type[2]}**\n${data[8]}`],
      ]);
      card.setTheme(type[3] as any);
    } else {
      card.addTable([[`**首杀记录！**\n${data[5]}`]]);
      card.setTheme('warning');
    }
  } else {
    card.slice(0, 0);
    card.addText(item.title);
  }
  card.addContext([`${tools.dateTime(item.updated)} (met)all(met)`]);
  await bot.API.message.create(10, channelId, card.toString());
  return true;
});

feeder.register('map', async item => {
  if (!item || !item.title) {
    console.warn('Map: no item');
    return false;
  }

  const channelId = tools.db.get('map_channel').value();
  if (!channelId) {
    console.warn('Map: not subscribed, skipping');
    return false;
  }

  const card = new Card('lg');

  try {
    const $ = cheerio.load(item.content);
    const name = $('div p span').eq(0).text();
    const author = item.author;
    const server = SERVERS[item.title.match(/\[(.*)\]/)[1].toLowerCase()];
    const desc = $('div p').eq(1);
    const descText = desc.text().replace('Difficulty', '星级').replace(', Points', ' 分数');
    const imageLink = $('.screenshot').attr('src');

    card.addTitle(`[${server}] ${name}`);
    card.addTextWithButton(`作者: ${author}\n${descText}`, {
      theme: 'info',
      text: '预览',
      value: `https://teeworlds.cn/mappreview/?map=https://api.teeworlds.cn/ddnet/mapdata/${encodeURIComponent(
        name
      )}`,
      click: 'link',
    });

    if (imageLink) {
      card.addImages([
        {
          src: `https://ddnet.tw${imageLink}`,
          alt: name,
        },
      ]);
    }

    card.setTheme('success');
  } catch (e) {
    console.error('Map card error:');
    console.error(e);
    card.slice(0, 0);
    card.addText(item.title);
  }

  card.addContext([`${tools.dateTime(item.updated)} (met)all(met)`]);
  console.log(card.toString());
  await bot.API.message.create(10, channelId, card.toString());
  return true;
});

console.log('Connect bot');
bot.connect();
