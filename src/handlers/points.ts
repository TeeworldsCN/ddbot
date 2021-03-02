import { TextHandler } from './bottype';
import { Card } from '../utils/cardBuilder';

export const points: TextHandler = async (tools, bot, e) => {
  const query = e.content.slice('.points '.length);

  let searchName = query || e.author.nickname;

  const card = new Card('分数查询');

  await bot.API.message.addReaction(e.msgId, '⌛');
  try {
    const response = await bot.axios.get(
      encodeURI(`https://ddnet.tw/players/?query=${searchName}`),
      { timeout: 5000 }
    );
    if ((response.data as []).length > 0) {
      const table = [['**ID**', '**分数**']];
      if (response.data[0].name == searchName) {
        table.push([response.data[0].name, response.data[0].points]);
      } else {
        card.add_markdown(`*未找到玩家:* **${searchName}**, 以下为近似结果：`);
        const top5 = response.data.slice(0, 5);
        table.push(...top5.map((x: any) => [x.name, x.points]));
      }

      card.add_table(table);
    } else {
      card.add_markdown(`*未找到玩家:* **${searchName}**`);
    }
  } catch (err) {
    card.add_markdown('❌ *查询出错*');
    console.error(err);
  }

  await bot.API.message.create(10, e.channelId, card.data);
  await bot.API.message.deleteReaction(e.msgId, '⌛', null);
};
