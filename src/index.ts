require('dotenv').config();

import { ButtonClickEvent, KaiheilaBot, TextMessage } from 'kaiheila-bot-root';
import { BUTTONS, COMMANDS } from './commands';
import { Tools, initTools } from './tools';
import rss from 'rss-feed-emitter';
import { Card, SMD } from './utils/cardBuilder';
import { FLAGS, SERVERS } from './utils/consts';

/*
  RSS 订阅
 */

const feeder = new rss();
(feeder.add as any)(
  {
    url: 'https://ddnet.tw/status/records/feed/',
    refresh: 30000,
    eventName: 'record',
  }
  // {
  //   url: 'https://ddnet.tw/releases/feed/',
  //   refresh: 60,
  //   eventName: 'map',
  // }
);

/*
    机器人初始化
 */

const bot = new KaiheilaBot({
  mode: 'websocket',
  token: process.env.KAIHEILA_BOT_TOKEN,
  ignoreDecryptError: false,
});

const tools = initTools();

bot.on('textMessage', (e: TextMessage) => {
  // no bot message
  if (e.author.bot) return;

  if (!e.content.startsWith('.') && !e.content.startsWith('。')) {
    return;
  }

  const command = e.content.split(' ')[0].slice(1);

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

feeder.on('record', item => {
  if (!item || !item.title) return;

  const channelId = tools.db.get('record_channel').value();
  if (!channelId) return;

  const lastTime = tools.db.get('record_last').value() || 0;

  const time = item.pubDate.getTime();
  if (!time || typeof time != 'number') return;

  if (time > lastTime) {
    tools.db.set('record_last', time).write();
  } else {
    // skip already processed
    return;
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
        [`**新记录**\n${data[5]}`, `**原记录**\n${old}`, `**${type[2]}**\n${data[8]}`],
      ]);
      card.setTheme(type[3]);
    } else {
      card.addTable([[`**首杀记录！**\n${data[5]}`]]);
      card.setTheme('warning');
    }
  } else {
    card.addText(item.title);
  }

  bot.API.message.create(10, channelId, card.toString());
});

// feeder.on('map', item => {
//   console.log(item.pubdate);
// });

feeder.on('error', console.error);

console.log('Connect bot');
bot.connect();
