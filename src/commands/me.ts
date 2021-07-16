import { TextHandler } from '../bottype';

export const me: TextHandler = async msg => {
  await msg.reply.text(`Hi! ${msg.author.nickname}\n这个是你的用户键: ${msg.userKey}`, null, true);
};
