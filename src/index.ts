import { ButtonClickEvent, KaiheilaBot, TextMessage } from 'kaiheila-bot-root';
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import { BUTTONS, COMMANDS } from './commands';
import { Tools, initTools } from './tools';

require('dotenv').config();

/*
    机器人初始化
 */

const bot = new KaiheilaBot({
  mode: 'websocket',
  token: process.env.KAIHEILA_BOT_TOKEN,
  ignoreDecryptError: false,
});

initTools();

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

console.log('Connect bot');
bot.connect();
