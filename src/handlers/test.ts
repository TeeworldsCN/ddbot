import { Card, SMD } from '../utils/cardBuilder';
import { ButtonHandler, TextHandler } from './bottype';

export const testText: TextHandler = async (msg, bot, type, raw) => {
  const card = new Card('sm', '测试');

  card.addMarkdown(SMD('*>[]()\\~---`'));
  await msg.reply.create(card);
};

export const testButton: ButtonHandler = async (msg, bot, raw) => {
  const card = new Card('sm', '测试');

  card.addText('你点击了按钮！');
  await msg.reply.create(card);
};
