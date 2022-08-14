import { QQGuildBot } from '../bots/qqguild';
import { TextHandler } from '../bottype';
import { CommandParser } from '../utils/commandParser';

export const msgTest: TextHandler = async msg => {
  if (msg.platform != 'qqguild') return;

  const query = new CommandParser(msg.command);
  const data = query.getRest(1);
  try {
    const message = JSON.parse(data);

    const instance = msg.bot.instance as QQGuildBot;
    console.log(JSON.stringify({
      channelId: msg.channelId,
      message,
    }));
    await instance.client.messageApi.postMessage(msg.channelId, message);
  } catch (e) {
    msg.reply.text(e?.message || e?.toString());
  }
};
