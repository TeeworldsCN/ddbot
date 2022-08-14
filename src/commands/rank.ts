import { TextHandler } from '../bottype';
import { AxiosError } from 'axios';
import _ from 'lodash';
import { CommandParser } from '../utils/commandParser';
import { FLAGS } from '../utils/consts';
import { API } from '../utils/axios';
import { dateTime, secTime } from '../utils/helpers';

export const rank: TextHandler = async msg => {
  // const query = new CommandParser(msg.command);
  // const mapQueryString = query.getString(1).replace(/['"]/g, '');
  // if (!mapQueryString) {
  //   await msg.reply.addReaction(['❌']);
  //   return;
  // }

  // const playerName = query.getRest(2) || msg.user?.ddnetid;
  // const card = new Card('lg');
  // const isButton = msg.type == 'button';

  // if (isButton) card.addContext(['该消息只有您可见']);

  // if (!playerName) {
  //   card.addMarkdown('请先使用 `.bind 名字` 指令绑定DDNet ID再使用快速查询指令');
  //   card.addContext([`(met)${msg.userId}(met)`]);
  //   await msg.reply.card(card, undefined, isButton);
  //   return;
  // }

  // await msg.reply.addReaction(['⌛']);

  // try {
  //   let mapName: string = null;
  //   if (isButton) {
  //     mapName = mapQueryString;
  //   } else {
  //     const mapQuery = await API.get(
  //       `/ddnet/fuzzy/maps/${encodeURIComponent(mapQueryString)}.json`
  //     );
  //     mapName = mapQuery.data?.[0]?.name;
  //   }

  //   if (mapName) {
  //     // 查询玩家
  //     let map = null;
  //     let flag = '';
  //     try {
  //       const playerRes = await API.get(`/ddnet/players/${encodeURIComponent(playerName)}.json`);
  //       const player = playerRes.data;

  //       const allMaps = _.flatMap(player.types, arr =>
  //         _.map(
  //           _.filter(_.toPairs(arr.maps) as any, p => p?.[1]?.finishes !== 0),
  //           p => {
  //             return { ...p[1], name: p[0] };
  //           }
  //         )
  //       );
  //       map = allMaps.find(m => m.name.trim() == mapName.trim());

  //       // 查询Top
  //       try {
  //         const favServer =
  //           _.maxBy(_.toPairs(_.groupBy(player.last_finishes, 'country')), '1.length')?.[0] ||
  //           'default';

  //         let url = '';
  //         const server = favServer.toLowerCase();
  //         const hasRegion = server in FLAGS && server != 'default';
  //         if (hasRegion) {
  //           flag = FLAGS[server];
  //           url = `/ddnet/maps/${encodeURIComponent(mapName)}.json?server=${server}`;
  //         } else {
  //           url = `/ddnet/maps/${encodeURIComponent(mapName)}.json`;
  //         }
  //         const mapRank = await API.get(url);
  //         const teamRecord = mapRank.data.teamRecords.find(
  //           (r: any) => r.players.indexOf(player.player) >= 0
  //         );
  //         const record = mapRank.data.records.find((r: any) => r.player == player.player);

  //         if (teamRecord) {
  //           if (!map) map = { name: mapName, points: map.points };
  //           if (teamRecord.time <= (map.time || Infinity)) {
  //             map.time = teamRecord.time;
  //             if (hasRegion) {
  //               map.region_team_rank = teamRecord.rank;
  //             } else {
  //               map.team_rank = teamRecord.rank;
  //             }
  //           }
  //         }

  //         if (record) {
  //           if (!map) map = { name: mapName, points: map.points };
  //           if (record.time <= (map.time || Infinity)) {
  //             map.time = record.time;
  //             if (hasRegion) {
  //               map.region_rank = record.rank;
  //             } else {
  //               map.rank = record.rank;
  //             }
  //           }
  //         }
  //       } catch (e) {
  //         console.warn(e);
  //       }
  //     } catch (e) {
  //       const err = e as AxiosError;
  //       if (err.isAxiosError && err?.response?.status == 404) {
  //         map = null;
  //       } else {
  //         throw e;
  //       }
  //     }

  //     if (map) {
  //       card.addText(`${playerName} 的 ${map.name} 记录 (${map.points}分)`);
  //       const text = [`最快用时: ${secTime(map.time)}`];
  //       if (map.rank) {
  //         text.push(`🌐 个人排名: #${map.rank}`);
  //       }
  //       if (map.team_rank) {
  //         text.push(`🌐 团队排名: #${map.team_rank}`);
  //       }
  //       if (map.region_rank) {
  //         text.push(`${flag} 个人排名: #${map.region_rank}`);
  //       }
  //       if (map.region_team_rank) {
  //         text.push(`${flag} 团队排名: #${map.region_team_rank}`);
  //       }

  //       if (map.finishes && map.first_finish) {
  //         text.push(
  //           '',
  //           `完成次数: ${map.finishes}次`,
  //           `首次完成: ${dateTime(map.first_finish * 1000)}`
  //         );
  //       }

  //       card.addText(text.join('\n'));
  //       card.addContext([`(met)${msg.userId}(met)`]);
  //       card.setTheme('success');
  //     } else {
  //       card.addText(
  //         `⚠ 未找到玩家"${playerName}"与地图"${mapName}"相关的记录\n个人记录可能需要一天的时间统计，请明天再查询。`
  //       );

  //       if (isButton) {
  //         card.addContext([`(met)${msg.userId}(met)`]);
  //       } else {
  //         card.addContext([`提示: 如果地图名中有空格，请用引号括起来。 (met)${msg.userId}(met)`]);
  //       }

  //       card.setTheme('warning');
  //     }
  //   } else {
  //     card.addTitle(`⚠ 未找到和${mapQueryString}相关的地图`);
  //     card.addContext([`(met)${msg.userId}(met)`]);
  //     card.setTheme('warning');
  //   }
  // } catch (err) {
  //   card.slice(0, 0);
  //   card.addMarkdown('❌ *查询失败，请稍后重试*');
  //   card.addContext([`(met)${msg.userId}(met)`]);
  //   card.setTheme('danger');
  //   console.error(err);
  // }

  // await msg.reply.card(card, undefined, isButton);
  // await msg.reply.deleteReaction(['⌛']);
};
