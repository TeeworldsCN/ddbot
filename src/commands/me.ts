import { TextHandler } from '../bottype';

export const me: TextHandler = async msg => {
  if (msg.sessionType != 'DM') return;

  await msg.reply.text(`Hi! ${msg.author.nickname}\n你的ID: ${msg.userKey}`, null, true);
};
