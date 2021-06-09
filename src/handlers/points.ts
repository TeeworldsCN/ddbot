import { DateTime } from 'luxon';
import { GenericBot } from '../bots/base';
import { compile } from 'vega-lite';
import sharp from 'sharp';
import { View, parse } from 'vega';
import { dateTime, ddnetEncode, secTime } from '../utils/helpers';
import { Card, SMD } from '../utils/cardBuilder';
import { TextHandler } from '../bottype';
import { CommandParser } from '../utils/commandParser';
import { getUser } from '../db/user';
import { API } from '../utils/axios';
import { FLAGS, SERVERS_SHORT } from '../utils/consts';
import _ from 'lodash';

const uploadGraph = async (
  bot: GenericBot<any>,
  data: any[],
  name: string,
  points: number,
  size: 'lg' | 'sm'
) => {
  const today = DateTime.now().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
  const begin = today.set({ weekday: 0 }).minus({ weeks: size == 'lg' ? 24 : 8 });
  const end = today.set({ hour: 23, minute: 59, second: 59, millisecond: 999 });
  const fontSize = size == 'lg' ? 12 : 9;
  const title: any =
    size == 'lg'
      ? {
          text: `点数: ${points}pts`,
          anchor: 'start',
          color: '#F5F5F5',
          font: 'Noto Sans CJK SC',
          fontSize: 12,
        }
      : {
          text: `点数: ${points}pts`,
          anchor: 'start',
          color: '#F5F5F5',
          font: 'Noto Sans CJK SC',
          fontSize: 16,
          subtitle: name,
          subtitleColor: '#F5F5F5',
          subtitleFont: 'Noto Sans CJK SC',
          subtitleFontSize: 12,
        };

  const graph = compile({
    data: { values: data },
    transform: [
      {
        impute: 'points',
        keyvals: { step: 86400000, start: begin.toMillis(), stop: end.toMillis() },
        key: 'first_finish',
        value: 0,
      },
      { filter: `datum.first_finish >= ${begin.toMillis()}` },
    ],
    encoding: {
      x: {
        field: 'first_finish',
        timeUnit: 'yearweek',
        type: 'ordinal',
        axis: {
          labelExpr: "(date(datum.value) < 8) ? toNumber(timeFormat(datum.value, '%m'))+'月' : ''",
        },
      },
    },
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
        transform: [{ filter: `datum.first_finish < ${today.toMillis()}` }],
        width: { step: 15 },
        height: { step: 15 },
        encoding: {
          y: { field: 'first_finish', timeUnit: 'day', type: 'ordinal' },
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
        transform: [{ filter: `datum.first_finish >= ${today.toMillis()}` }],
        encoding: {
          y: {
            field: 'first_finish',
            timeUnit: 'day',
            type: 'ordinal',
            axis: {
              labelExpr:
                "['日', '一', '二', '三', '四', '五', '六'][toNumber(timeFormat(datum.value, '%w'))]",
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
      scale: { bandPaddingOuter: 0.2 },
      axis: {
        grid: false,
        tickBand: 'extent',
        labelColor: '#F5F5F5',
        tickColor: '#0000000',
        title: null,
        domainWidth: 0,
        offset: -3,
        labelFontSize: fontSize,
        labelFont: 'Noto Sans CJK SC',
      },
      legend: {
        title: null,
        gradientStrokeColor: '#bbbbbb',
        gradientStrokeWidth: 1,
        gradientThickness: fontSize,
        labelColor: '#F5F5F5',
        offset: 5,
        tickCount: 2,
        labelFontSize: size == 'sm' ? 6 : 12,
        labelFont: 'Noto Sans CJK SC',
      },
      style: {
        cell: { cornerRadius: 3, stroke: '#666666', strokeOffset: 0 },
      },
    },
    background: '#393C41',
    title,
  });

  var svg = await new View(parse(graph.spec), { renderer: 'none' }).toSVG(2);
  var png = await sharp(Buffer.from(svg))
    .png({
      compressionLevel: 9,
    })
    .toBuffer();
  var image = await bot.uploadImage('points.png', png);
  return image;
};

const playerLink = (label: string, player: string) => {
  return `[${SMD(label)}](https://ddnet.tw/players/${ddnetEncode(player)})`;
};

const fetchPlayer = async (player: string, server?: string | false) => {
  const result: any = {};

  try {
    // 玩家详情
    const { data } = await API.get(`/ddnet/players/${encodeURIComponent(player)}.json`);
    const favServer = _.maxBy(_.toPairs(_.groupBy(data.last_finishes, 'country')), '1.length')?.[0];
    const flag = FLAGS[favServer.toLowerCase()] || '❓';

    data.flag = flag;

    result.type = 'points';
    result.data = data;

    if (server !== false) {
      const fetchServer = server || favServer;
      const rankRes = await API.get(`/ddnet/players.json?server=${fetchServer.toLowerCase()}`);
      const rank = rankRes.data;

      data.region_points = _.find(rank.points, { name: data.player });
      data.region_team_rank = _.find(rank.teamRank, { name: data.player });
      data.region_rank = _.find(rank.rank, { name: data.player });
      data.fetchedRegionalData = true;
    }
  } catch (e) {
    try {
      const { data } = await API.get(`/ddnet/fuzzy/players/${encodeURIComponent(player)}.json`);
      result.type = 'fuzzy';
      result.data = data;
    } catch (e) {
      return null;
    }
  }

  return result;
};

export const points: TextHandler = async msg => {
  const query = new CommandParser(msg.content);
  const name = query.getRest(1);

  const searchName = name || (await getUser(msg.userKey))?.ddnetid;

  const temporary = msg.type == 'button';
  const card = new Card('lg');

  const isKaiheila = msg.bot.platform == 'kaiheila';

  if (temporary) card.addContext(['该消息只有您可见']);

  if (!searchName) {
    if (isKaiheila) {
      card.addMarkdown('请先使用 `.bind 名字` 指令绑定DDNet ID再使用快速查询指令');
      card.addContext([`(met)${msg.userId}(met)`]);
      await msg.reply.card(card, undefined, temporary);
    } else {
      await msg.reply.text(
        '请先使用 “绑定” 指令绑定DDNet ID再使用快速查询指令。\n\n例：若要绑定“TsFreddie”，输入：\n绑定 TsFreddie'
      );
    }
    return;
  }

  await msg.reply.addReaction(['⌛']);

  const result = isKaiheila ? await fetchPlayer(searchName) : await fetchPlayer(searchName, false);

  if (!result || (result.type != 'fuzzy' && result.type != 'points')) {
    if (isKaiheila) {
      card.slice(0, 0);
      card.addMarkdown('❌ *查询失败，请稍后重试*');
      card.addContext([`(met)${msg.userId}(met)`]);
      await msg.reply.card(card, undefined, temporary);
    } else {
      await msg.reply.text('查询失败，请稍后重试');
    }
    await msg.reply.deleteReaction(['⌛']);
    return;
  }

  if (result.type == 'fuzzy') {
    if ((result.data as any[]).length > 0) {
      const top5: any[] = result.data.slice(0, 5);
      if (isKaiheila) {
        card.addTitle(`未找到DDNet玩家: ${searchName}`);
        card.addMarkdown('*以下为近似结果：*');
        card.addTable(top5.map((x: any) => [playerLink(x.name, x.name), `${x.points}pts`]));
        card.addContext([`(met)${msg.userId}(met)`]);
        card.setTheme('info');
        await msg.reply.card(card, undefined, temporary);
      } else {
        await msg.reply.text(
          `未找到玩家，以下为近似结果\n${top5
            .map((x: any) => `${x.name}: ${x.points}pts`)
            .join('\n')}`
        );
      }
    } else {
      if (isKaiheila) {
        card.addTitle(`⚠ 未找到DDNet玩家: ${searchName}`);
        card.addContext([`(met)${msg.userId}(met)`]);
        card.setTheme('danger');
        await msg.reply.card(card, undefined, temporary);
      } else {
        await msg.reply.text(`未找到玩家`);
      }
    }
    await msg.reply.deleteReaction(['⌛']);
    return;
  }

  const player = result.data;
  const allMaps = _.map(
    _.flatten(
      _.map(_.toPairs(player.types), p => _.filter((p?.[1] as any)?.maps, m => m.finishes != 0))
    ),
    m => {
      return { ...m, first_finish: (m.first_finish || 0) * 1000 };
    }
  );
  allMaps.sort((a, b) => (b.first_finish || 0) - (a.first_finish || 0));
  let imageID = null;
  const size: 'lg' | 'sm' = msg.bot.platform == 'wechat' ? 'sm' : 'lg';

  try {
    imageID = await uploadGraph(msg.bot, allMaps, player.player, player.points.points, size);
  } catch (e) {
    console.warn('Image generation failed');
    console.warn(e);
  }

  if (isKaiheila) {
    card.addTitle(`${player.flag} DDNet玩家: ${searchName}`);

    const regional = [];
    if (player.fetchedRegionalData) {
      regional.push([
        ['region_points', `**${player.flag} 区域服点数**`, '未进前五百'],
        ['region_team_rank', `**${player.flag} 区域团队分**`, '未进前五百'],
        ['region_rank', `**${player.flag} 区域个人分**`, '未进前五百'],
      ]);
    }

    if (allMaps.length > 0) {
      let index = 0;
      while ((allMaps[index].points || 0) == 0 && index < allMaps.length) {
        index += 1;
      }
      player.points.delta = allMaps[index].points;
    }

    const categories = [
      [
        ['detail', '🔗 玩家详情'],
        ['team_rank', '**🌐 团队排名分**', '无排名'],
        ['rank', '**🌐 个人排名分**', '无排名'],
      ],
      ...regional,
    ];

    for (let row of categories) {
      const table = [];
      for (let category of row) {
        if (category[0] != 'detail') {
          const rankData = player[category[0]];
          if (rankData && rankData.points) {
            if (rankData.delta) {
              table.push(
                `${category[1]}[+${rankData.delta}]\n${rankData.points} (#${rankData.rank})`
              );
            } else {
              table.push(`${category[1]}\n${rankData.points} (#${rankData.rank})`);
            }
          } else {
            table.push(`${category[1]}\n*${category[2]}*`);
          }
        } else {
          table.push(`${category[1]}\n${playerLink('点击查看', searchName)}`);
        }
      }
      card.addTable([table]);
    }

    if (imageID) {
      card.addImages([{ src: imageID }]);
    }

    card.addDivider();

    const lastFinish = player?.last_finishes?.[0];
    card.addContext([
      `最新完成 [${SERVERS_SHORT[lastFinish.type.toLowerCase()]}] ${SMD(lastFinish.map)} (${secTime(
        lastFinish.time
      )}) - ${dateTime(lastFinish.timestamp * 1000)} (met)${msg.userId}(met)`,
    ]);

    await msg.reply.card(card, undefined, temporary);
    card.setTheme('success');
  } else {
    await msg.reply.image(imageID);
  }

  await msg.reply.deleteReaction(['⌛']);
};
