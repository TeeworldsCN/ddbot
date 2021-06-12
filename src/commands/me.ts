import { TextHandler } from '../bottype';

export const me: TextHandler = async msg => {
  await msg.fetchUserInfo();
  await msg.reply.text(`Hi! ${msg.author.nickname}\n你的ID: ${msg.userKey}`, null, true);
  await msg.reply.delete();
};
