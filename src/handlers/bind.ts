import { TextHandler } from '../bottype';
import { Card } from '../utils/cardBuilder';
import _ from 'lodash';
import { CommandParser } from '../utils/commandParser';
import { DDNetIDModel } from '../db/ddnetid';

export const bind: TextHandler = async (msg, type) => {
  const query = new CommandParser(msg.content);
  const searchName = query.getRest(1);

  if (!searchName) {
    if (msg.platform == 'kaiheila') {
      const card = new Card('sm');
      card.addContext(['该消息只有您可见']);

      card.addTitle(`请提供您的DDNet昵称`);
      card.setTheme('danger');
      card.addContext([`(met)${msg.author.id}(met)`]);

      try {
        await msg.reply.delete(msg.msgId);
      } catch {}

      await msg.reply.replyCard(card, undefined, true);
    } else if (msg.platform == 'wechat') {
      msg.reply.reply(`请提供您的DDNet昵称`);
    }
    return;
  }

  if (msg.platform == 'kaiheila') {
    await msg.reply.addReaction(msg.msgId, ['⌛']);
  }

  await DDNetIDModel.updateOne(
    { chatid: msg.autherKey },
    { $set: { ddnetid: searchName } },
    { upsert: true }
  );

  if (msg.platform == 'kaiheila') {
    const card = new Card('sm');
    card.addContext(['该消息只有您可见']);

    card.addTitle(`成功绑定DDNet ID ${searchName}`);
    card.setTheme('info');
    card.addContext([`(met)${msg.author.id}(met)`]);

    try {
      await msg.reply.delete(msg.msgId);
    } catch {}

    await msg.reply.replyCard(card, undefined, true);
  } else if (msg.platform == 'wechat') {
    msg.reply.reply(`成功绑定DDNet ID: ${searchName}`);
  }
};
