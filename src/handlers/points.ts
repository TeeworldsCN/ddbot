import { TextHandler } from './bottype';
import { Card, SMD } from '../utils/cardBuilder';
import { FLAGS, SERVERS_SHORT } from '../utils/consts';
import { AxiosError } from 'axios';
import _ from 'lodash';
import { CommandParser } from '../utils/commandParser';
import { View, parse } from 'vega';
import { compile } from 'vega-lite';
import sharp from 'sharp';
import { Tools } from '../tools';
import { BotInstance } from 'kaiheila-bot-root/dist/BotInstance';
import { DateTime } from 'luxon';

const uploadGraph = async (bot: BotInstance, data: any[]) => {
  const today = DateTime.now().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
  const begin = today.set({ weekday: 0 }).minus({ weeks: 24 });
  const end = today.set({ hour: 23, minute: 59, second: 59, millisecond: 999 });
  const graph = compile({
    data: { values: data },
    transform: [
      {
        filter: `datum.firstFinish >= ${begin.toMillis()}`,
      },
      {
        impute: 'points',
        keyvals: {
          step: 86400000,
          start: begin.toMillis(),
          stop: end.toMillis(),
        },
        key: 'firstFinish',
        value: 0,
      },
    ],
    layer: [
      {
        mark: {
          type: 'rect',
          stroke: '#bbbbbb',
          width: 12,
          height: 12,
          strokeWidth: 1,
          cornerRadius: 3,
        },
        width: { step: 15 },
        height: { step: 15 },
        transform: [{ filter: ` datum.firstFinish < ${today.toMillis()}` }],
        encoding: {
          y: {
            field: 'firstFinish',
            timeUnit: 'day',
            type: 'ordinal',
          },
          x: {
            field: 'firstFinish',
            timeUnit: 'yearweek',
            type: 'ordinal',
          },
          color: {
            aggregate: 'sum',
            field: 'points',
            scale: { domain: [0, 100], scheme: 'darkblue', type: 'pow', exponent: 0.6 },
          },
        },
      },
      {
        mark: {
          type: 'rect',
          stroke: '#ffffff',
          width: 12,
          height: 12,
          strokeWidth: 1.2,
          cornerRadius: 3,
        },
        width: { step: 15 },
        height: { step: 15 },
        transform: [{ filter: `datum.firstFinish >= ${today.toMillis()}` }],
        encoding: {
          y: {
            field: 'firstFinish',
            timeUnit: 'day',
            type: 'ordinal',
            axis: {
              labelExpr:
                "['日', '一', '二', '三', '四', '五', '六'][toNumber(timeFormat(datum.value, '%w'))]",
            },
          },
          x: {
            field: 'firstFinish',
            timeUnit: 'yearweek',
            type: 'ordinal',
            axis: {
              labelExpr:
                "(date(datum.value) < 8) ? toNumber(timeFormat(datum.value, '%m'))+'月' : ''",
            },
          },
          color: {
            aggregate: 'sum',
            field: 'points',
            scale: { domain: [0, 100], scheme: 'darkblue', type: 'pow', exponent: 0.6 },
          },
        },
      },
    ],
    config: {
      scale: {
        bandPaddingOuter: 0.2,
      },
      axis: {
        grid: false,
        tickBand: 'extent',
        labelColor: '#F5F5F5',
        tickColor: '#0000000',
        title: null,
        domainWidth: 0,
        offset: -3,
        labelFont: 'Noto Sans CJK SC',
      },
      legend: {
        title: null,
        gradientStrokeColor: '#bbbbbb',
        gradientStrokeWidth: 1,
        gradientThickness: 12,
        labelColor: '#F5F5F5',
        offset: 5,
        tickCount: 2,
        labelFont: 'Noto Sans CJK SC',
      },
      style: {
        cell: {
          cornerRadius: 3,
          stroke: '#666666',
          strokeOffset: 0,
        },
      },
    },
    background: '#393C41',
  });

  var svg = await new View(parse(graph.spec), { renderer: 'none' }).toSVG(2);
  var png = await sharp(Buffer.from(svg))
    .png({
      compressionLevel: 9,
    })
    .toBuffer();
  var image = await bot.API.asset.create(png, {
    contentType: 'form-data',
    filename: `points.png`,
    knownLength: png.length,
  });
  return image.url;
};

const playerLink = (msg: Tools, label: string, player: string) => {
  return `[${SMD(label)}](https://ddnet.tw/players/${msg.tools.ddnetEncode(player)})`;
};

export const points: TextHandler = async (msg, bot, type, raw) => {
  const query = new CommandParser(msg.content);
  const name = query.getRest(1);

  let searchName = name || msg.tools.db.get(`ddnetBinds.u${msg.authorId}`).value();
  const card = new Card('lg');
  const temporary = type == 'button';
  if (temporary) card.addContext(['该消息只有您可见']);

  if (!searchName) {
    card.addMarkdown('请先使用 `.bind <名字>` 指令绑定DDNet ID再使用快速查询指令');
    card.addContext([`(met)${msg.authorId}(met)`]);
    await msg.reply.create(card, undefined, temporary);
    return;
  }

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

      const allMaps = _.flatMap(player.servers, arr => arr.finishedMaps);

      allMaps.sort((a, b) => (b.firstFinish || 0) - (a.firstFinish || 0));
      if (allMaps.length > 0) {
        let index = 0;
        while ((allMaps[index].points || 0) == 0 && index < allMaps.length) {
          index += 1;
        }
        player.points.delta = allMaps[index].points;
      }

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
              if (rankData.delta) {
                table.push(
                  `**${category[1]}**\n${rankData.points}[+${rankData.delta}] (#${rankData.rank})`
                );
              } else {
                table.push(`**${category[1]}**\n${rankData.points} (#${rankData.rank})`);
              }
            } else {
              table.push(`**${category[1]}**\n*${category[2]}*`);
            }
          } else {
            table.push(`**${category[1]}**\n${playerLink(msg, '点击查看', searchName)}`);
          }
        }
        card.addTable([table]);
      }

      try {
        const url = await uploadGraph(bot, allMaps);
        card.addImages([{ src: url }]);
      } catch (e) {
        console.warn('Image generation failed');
        console.warn(e);
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
      if (err.isAxiosError && err?.response?.status == 404) {
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
            ...top5.map((x: any) => [playerLink(msg, x.name, x.name), x.points.toString()])
          );
          card.addTable(table);
          card.addContext([`(met)${msg.authorId}(met)`]);
          card.setTheme('info');
        } else {
          card.addTitle(`⚠ 未找到DDNet玩家: ${searchName}`);
          card.addContext([`(met)${msg.authorId}(met)`]);
          card.setTheme('danger');
        }
      } else {
        throw e;
      }
    }
  } catch (err) {
    card.slice(0, 0);
    card.addMarkdown('❌ *查询超时，请稍后重试*');
    card.addContext([`(met)${msg.authorId}(met)`]);
    card.setTheme('danger');
    console.error(err);
  }

  try {
    await msg.reply.create(card, undefined, temporary);
  } catch {
    await msg.reply.create('暂时无法回应，请稍后重试');
  }
  await msg.reply.deleteReaction(msg.msgId, ['⌛']);
};
