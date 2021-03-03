import { TextHandler } from './bottype';
import { Card } from '../utils/cardBuilder';

const playerLink = (player: string) => {
  return `[${player}](${encodeURI(`https://ddnet.tw/players/${player}`)})`;
};

export const points: TextHandler = async (tools, bot, e) => {
  const query = e.content.slice('.points '.length);

  let searchName = query || e.author.nickname || e.author.username;

  const card = new Card('lg', 'DDNet分数查询');

  await tools.reply.addReaction(e.msgId, ['⌛']);
  try {
    const response = await bot.axios.get(
      encodeURI(`https://ddnet.tw/players/?query=${searchName}`),
      { timeout: 5000 }
    );
    if ((response.data as []).length > 0) {
      const table = [['**ID**', '**分数**']];
      if (response.data[0].name == searchName) {
        table.push([playerLink(response.data[0].name), response.data[0].points]);
      } else {
        card.addMarkdown(`*未找到玩家:* **${searchName}**, 以下为近似结果：`);
        const top5 = response.data.slice(0, 5);
        table.push(...top5.map((x: any) => [playerLink(x.name), x.points]));
      }

      card.addTable(table);
    } else {
      card.addMarkdown(`*未找到玩家:* **${searchName}**`);
    }
  } catch (err) {
    card.addMarkdown('❌ *查询超时，请稍后重试*');
    console.error(err);
  }

  await tools.reply.create(10, card.data);
  await tools.reply.deleteReaction(e.msgId, ['⌛']);
};
