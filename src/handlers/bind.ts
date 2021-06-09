import { TextHandler } from '../bottype';
import { Card } from '../utils/cardBuilder';
import _ from 'lodash';
import { CommandParser } from '../utils/commandParser';
import { UserModel } from '../db/user';

export const bind: TextHandler = async msg => {
  const query = new CommandParser(msg.content);
  const searchName = query.getRest(1);

  if (!searchName) {
    if (msg.bot.platform == 'kaiheila') {
      const card = new Card('sm');
      card.addContext(['该消息只有您可见']);

      card.addTitle(`请提供DDNet昵称参数`);
      card.setTheme('danger');
      card.addContext([`(met)${msg.userId}(met)`]);

      await msg.reply.delete();

      await msg.reply.card(card, undefined, true);
    } else if (msg.bot.platform == 'wechat') {
      await msg.reply.text(`请提供您的DDNet昵称，例如：\n绑定 TsFreddie`);
    }
    return;
  }

  await UserModel.updateOne(
    { userKey: msg.userKey },
    { $set: { ddnetid: searchName } },
    { upsert: true }
  );

  if (msg.bot.platform == 'kaiheila') {
    const card = new Card('sm');
    card.addContext(['该消息只有您可见']);

    card.addTitle(`成功绑定DDNet ID ${searchName}`);
    card.setTheme('info');
    card.addContext([`(met)${msg.userId}(met)`]);

    await msg.reply.delete();
    await msg.reply.card(card, undefined, true);
  } else if (msg.bot.platform == 'wechat') {
    await msg.reply.text(`成功绑定DDNet ID: ${searchName}`);
  }
};
