import { GlobalCommandHandler, TextHandler } from '../bottype';

export const me: GlobalCommandHandler = async msg => {
  await msg.reply.text(`Hi! ${msg.base.author.nickname}\n这个是你的用户键: ${msg.base.userKey}`);
};
