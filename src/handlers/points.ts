import { TextHandler } from './bottype';
import { Card, SMD } from '../utils/cardBuilder';
import { FLAGS, SERVERS, SERVERS_SHORT } from '../utils/consts';

const playerLink = (label: string, player: string) => {
  return `[${SMD(label)}](https://ddnet.tw/players/${encodeURIComponent(
    player.replace(/-/g, '-45-')
  )})`;
};

export const points: TextHandler = async (msg, bot, type, raw) => {
  const query = msg.content.slice('.points '.length);

  let searchName = query || msg.author.nickname;

  const card = new Card('lg');

  await msg.reply.addReaction(msg.msgId, ['⌛']);
  try {
    // 查询玩家
    try {
      // 玩家详情
      const playerRes = await msg.tools.axios.get(
        `https://api.teeworlds.cn/ddnet/players/${encodeURIComponent(searchName)}`
      );
      const player = playerRes.data;
      const flag = FLAGS[player.server.toLowerCase()];
      card.addTitle(`${flag} DDNet玩家: ${searchName}`);

      const categories = [
        [
          ['points', '地图完成分'],
          ['teamRank', '团队排名分'],
          ['rank', '个人排名分'],
        ],
        [
          ['monthlyPoints', '月增长'],
          ['weeklyPoints', '周增长'],
          ['detail', '详情'],
        ],
      ];

      for (let row of categories) {
        const table = [];
        for (let category of row) {
          if (category[0] != 'detail') {
            const rankData = player[category[0]];
            if (rankData) {
              table.push(`**${category[1]}**\n${rankData.points} (#${rankData.rank})`);
            } else {
              table.push(`**${category[1]}**\n*无排名*`);
            }
          } else {
            table.push(`**玩家详情**\n${playerLink('点击查看', searchName)}`);
          }
        }
        card.addTable([table]);
      }

      card.addDivider();

      const lastFinish = player?.lastFinishes?.[0];
      card.addContext(
        [
          `最新完成 [${SERVERS_SHORT[lastFinish.type.toLowerCase()]}] ${
            lastFinish.map
          } (${msg.tools.secTime(lastFinish.time)}) - ${msg.tools.dateTime(lastFinish.timestamp)}`,
        ],
        true
      );

      card.setTheme('success');
    } catch {
      card.slice(0, 0);
      // 尝试查找近似名
      const response = await msg.tools.axios.get(
        `https://ddnet.tw/players/?query=${encodeURIComponent(searchName)}`
      );
      const table = [];
      if ((response.data as []).length > 0) {
        card.addTitle(`未找到DDNet玩家: ${searchName}`);
        card.addMarkdown('*以下为近似结果：*');
        const top5 = response.data.slice(0, 5);
        table.push(...top5.map((x: any) => [playerLink(x.name, x.name), x.points.toString()]));
        card.addTable(table);
        card.setTheme('info');
      } else {
        card.addTitle(`未找到DDNet玩家: ${searchName}`);
        card.setTheme('danger');
      }
    }
  } catch (err) {
    card.slice(0, 0);
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
