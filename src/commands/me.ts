import { ReplyCommandHandler, TextHandler } from '../bottype';

export const me: ReplyCommandHandler = async msg => {
  await msg.reply.text(`Hi! ${msg.base.author.nickname}\n这个是你的用户键: ${msg.base.userKey}`);
};

export const here: ReplyCommandHandler = async msg => {
  await msg.reply.text(`该频道的键: ${msg.base.channelKey}`);
};
