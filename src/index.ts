import { KaiheilaBot } from 'kaiheila-bot-root';
import { TextMessage } from 'kaiheila-bot-root/dist/types/message/TextMessage';
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import { COMMANDS } from './commands';
import { getTools, initTools } from './tools';

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
  if (!e.content.startsWith('.') && !e.content.startsWith('。')) {
    return;
  }

  const command = e.content.split(' ')[0].slice(1);

  for (let key in COMMANDS) {
    if (key == command) {
      COMMANDS[key](getTools(bot, e), bot, e).catch(reason => {
        console.error(`Error proccessing command '${e.content}'`);
        console.error(reason);
      });
    }
  }
});

bot.connect();
