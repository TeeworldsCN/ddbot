import { TextHandler } from '../bottype';
import { Card } from '../utils/cardBuilder';
import _ from 'lodash';
import { CommandParser } from '../utils/commandParser';
import { UserModel } from '../db/user';

export const bind: TextHandler = async msg => {
  if (msg.platform == 'oicq' && msg.sessionType == 'CHANNEL') return;

  const query = new CommandParser(msg.command);
  const searchName = query.getRest(1);

  if (!searchName) {
    if (msg.platform == 'kaiheila') {
      const card = new Card('sm');
      card.addContext(['该消息只有您可见']);

      card.addTitle(`请提供DDNet昵称参数`);
      card.setTheme('danger');
      card.addContext([`(met)${msg.userId}(met)`]);

      await msg.reply.card(card, undefined, true);
      await msg.reply.delete();
    } else {
      await msg.reply.text(`请提供您的DDNet昵称，例如：\n绑定 nameless tee`);
    }
    return;
  }

  const result = await UserModel.updateOne(
    { userKey: msg.userKey },
    { $set: { ddnetid: searchName } },
    { upsert: true }
  ).exec();

  if (result.acknowledged) {
    if (msg.platform == 'kaiheila') {
      const card = new Card('sm');
      card.addContext(['该消息只有您可见']);

      card.addTitle(`成功绑定DDNet ID ${searchName}`);
      card.setTheme('info');
      card.addContext([`(met)${msg.userId}(met)`]);

      await msg.reply.card(card, undefined, true);
      await msg.reply.delete();
    } else {
      await msg.reply.text(`"${msg.author.nickname}"成功绑定DDNet ID: ${searchName}`);
    }
  } else {
    if (msg.platform == 'kaiheila') {
      const card = new Card('sm');
      card.addContext(['该消息只有您可见']);

      card.addTitle(`未知错误，绑定失败`);
      card.setTheme('danger');
      card.addContext([`(met)${msg.userId}(met)`]);

      await msg.reply.card(card, undefined, true);
      await msg.reply.delete();
    } else {
      await msg.reply.text(`未知错误，绑定失败`);
    }
  }
};
