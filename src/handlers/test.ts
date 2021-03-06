import { Card } from '../utils/cardBuilder';
import { ButtonHandler, TextHandler } from './bottype';

export const testText: TextHandler = async (msg, bot, type, raw) => {
  const card = new Card('sm', '测试');

  card.addButtons([
    {
      theme: 'info',
      value: '.points',
      click: 'return-val',
      text: '点我查询分数',
    },
  ]);
  await msg.reply.create(card);
};

export const testButton: ButtonHandler = async (msg, bot, raw) => {
  const card = new Card('sm', '测试');

  card.addText('你点击了按钮！');
  await msg.reply.create(card);
};
