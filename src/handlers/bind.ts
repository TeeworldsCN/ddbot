import { TextHandler } from './bottype';
import { Card } from '../utils/cardBuilder';
import _ from 'lodash';
import { CommandParser } from '../utils/commandParser';

export const bind: TextHandler = async (msg, bot, type, raw) => {
  const query = new CommandParser(msg.content);
  const searchName = query.getRest(1);
  const card = new Card('sm');

  await msg.reply.addReaction(msg.msgId, ['⌛']);
  card.addContext(['该消息只有您可见']);

  try {
    // 查找该人是否存在
    const response = await msg.tools.axios.get(
      `/ddnet/fuzzy/players/${encodeURIComponent(searchName)}`
    );
    if ((response.data as []).length > 0 && response.data[0].name == searchName) {
      console.log(msg.authorId);
      msg.tools.db.set(`ddnetBinds.u${msg.authorId}`, searchName).write();
      card.addTitle(`已绑定DDNet ID ${searchName}`);
      card.setTheme('info');
    } else {
      card.addTitle(`未找到DDNet玩家: ${searchName}`);
      card.addText('请检查名字是否正确');
      card.setTheme('danger');
    }
    card.addContext([`(met)${msg.authorId}(met)`]);
  } catch (err) {
    card.slice(0, 0);
    card.addMarkdown('❌ *请求超时，请稍后重试*');
    card.addContext([`(met)${msg.authorId}(met)`]);
    card.setTheme('danger');
    console.error(err);
  }

  try {
    await msg.reply.delete(msg.msgId);
  } catch {}

  await msg.reply.create(card, undefined, true);
};
