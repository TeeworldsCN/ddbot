import { TextHandler } from './bottype';
import { Card, SMD } from '../utils/cardBuilder';
import { FLAGS, SERVERS_SHORT } from '../utils/consts';
import { AxiosError } from 'axios';
import _ from 'lodash';

const playerLink = (label: string, player: string) => {
  return `[${SMD(label)}](https://ddnet.tw/players/${player})`;
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
      const playerRes = await msg.tools.api.get(`/ddnet/players/${encodeURIComponent(searchName)}`);
      const player = playerRes.data;
      const server = player.server.toLowerCase();
      const flag = FLAGS[server];
      card.addTitle(`${flag} DDNet玩家: ${searchName}`);

      const rankRes = await msg.tools.api.get(`/ddnet/players/?server=${server}`);
      const rank = rankRes.data;
      player.regionPoints = _.find(rank.points, { name: player.name });
      player.regionTeamRank = _.find(rank.teamRank, { name: player.name });
      player.regionRank = _.find(rank.rank, { name: player.name });

      const categories = [
        [
          ['points', '🌐 全球总点数', '无排名'],
          ['teamRank', '🌐 团队排名分', '无排名'],
          ['rank', '🌐 个人排名分', '无排名'],
        ],
        [
          ['regionPoints', `${flag} 区域服点数`, '未进前五百'],
          ['regionTeamRank', `${flag} 区域团队分`, '未进前五百'],
          ['regionRank', `${flag} 区域个人分`, '未进前五百'],
        ],
        [
          ['monthlyPoints', `📅 月增长`, '无排名'],
          ['weeklyPoints', `📅 周增长`, '无排名'],
          ['detail', '🔗 玩家详情'],
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
              table.push(`**${category[1]}**\n*${category[2]}*`);
            }
          } else {
            table.push(
              `**${category[1]}**\n${playerLink('点击查看', msg.tools.ddnetEncode(searchName))}`
            );
          }
        }
        card.addTable([table]);
      }

      card.addDivider();

      const lastFinish = player?.lastFinishes?.[0];
      card.addContext([
        `最新完成 [${SERVERS_SHORT[lastFinish.type.toLowerCase()]}] ${SMD(
          lastFinish.map
        )} (${msg.tools.secTime(lastFinish.time)}) - ${msg.tools.dateTime(
          lastFinish.timestamp
        )} (met)${msg.authorId}(met)`,
      ]);

      card.setTheme('success');
    } catch (e) {
      const err = e as AxiosError;
      if (err.isAxiosError && err.response.status == 404) {
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
          table.push(
            ...top5.map((x: any) => [
              playerLink(x.name, msg.tools.ddnetEncode(x.name)),
              x.points.toString(),
            ])
          );
          card.addTable(table);
          card.setTheme('info');
        } else {
          card.addTitle(`未找到DDNet玩家: ${searchName}`);
          card.setTheme('danger');
        }
      } else {
        throw e;
      }
    }
  } catch (err) {
    card.slice(0, 0);
    card.addMarkdown('❌ *查询超时，请稍后重试*');
    console.error(err);
  }

  await msg.reply.create(card, undefined);
  await msg.reply.deleteReaction(msg.msgId, ['⌛']);
};
