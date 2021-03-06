import { TextHandler } from './bottype';
import { Card, SMD } from '../utils/cardBuilder';

const playerLink = (player: string) => {
  return `[${SMD(player)}](${encodeURI(`https://ddnet.tw/players/${player}`)})`;
};

export const points: TextHandler = async (msg, bot, type, raw) => {
  const query = msg.content.slice('.points '.length);

  let searchName = query || msg.author.nickname;

  const card = new Card('lg', 'DDNet分数查询');

  await msg.reply.addReaction(msg.msgId, ['⌛']);
  try {
    const response = await msg.axios.get(
      encodeURI(`https://ddnet.tw/players/?query=${searchName}`)
    );
    if ((response.data as []).length > 0) {
      const table = [];
      if (response.data[0].name == searchName) {
        table.push([playerLink(response.data[0].name), response.data[0].points.toString()]);
      } else {
        card.addMarkdown(`*未找到玩家:* **${searchName}**, 以下为近似结果：`);
        const top5 = response.data.slice(0, 5);
        table.push(...top5.map((x: any) => [playerLink(x.name), x.points.toString()]));
      }

      card.addTable(table);
    } else {
      card.addMarkdown(`*未找到玩家:* **${SMD(searchName)}**`);
    }
  } catch (err) {
    card.addMarkdown('❌ *查询超时，请稍后重试*');
    console.error(err);
  }

  if (type == 'button') {
    card.addContext(['*该消息只有你可以看到*']);
    await msg.reply.create(card, undefined, true);
  } else {
    await msg.reply.create(card, undefined);
  }
  await msg.reply.deleteReaction(msg.msgId, ['⌛']);
};
