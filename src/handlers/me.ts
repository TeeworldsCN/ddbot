import { TextHandler } from '../bottype';

export const me: TextHandler = async msg => {
  msg.reply.delete(msg.msgId);
  msg.reply.text(`你的ID: ${msg.chatid}`, null, true);
};
