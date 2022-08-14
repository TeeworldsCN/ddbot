import { TextHandler } from '../bottype';
import _ from 'lodash';
import { CommandParser } from '../utils/commandParser';
import { UserModel } from '../db/user';

export const bind: TextHandler = async msg => {
  const query = new CommandParser(msg.command);
  const searchName = query.getRest(1);

  if (!searchName) {
    await msg.reply.text(`请提供您的DDNet昵称，例如：\n绑定 nameless tee`);
    return;
  }

  const result = await UserModel.updateOne(
    { userKey: msg.userKey },
    { $set: { ddnetid: searchName } },
    { upsert: true }
  ).exec();

  if (result.acknowledged) {
    await msg.reply.text(`"${msg.author.nickname}"成功绑定DDNet ID: ${searchName}`);
  } else {
    await msg.reply.text(`未知错误，绑定失败`);
  }
};
