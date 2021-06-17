import { TextHandler } from '../bottype';
import { Card, SMD } from '../utils/cardBuilder';
import { SERVERS } from '../utils/consts';
import _ from 'lodash';
import { CommandParser } from '../utils/commandParser';
import { ddnetEncode, secTime } from '../utils/helpers';
import { API } from '../utils/axios';

const mapLink = (label: string, map: string) => {
  return `[${SMD(label)}](https://ddnet.tw/maps/${ddnetEncode(map)})`;
};

const difficulty = (stars: number) => {
  return _.padStart('', stars, '★') + _.padStart('', 5 - stars, '✰');
};

const fetchMap = async (mapQueryString: string) => {
  try {
    // 地图Query
    const mapQuery = await API.get(`/ddnet/fuzzy/maps/${encodeURIComponent(mapQueryString)}.json`);
    const result = mapQuery.data;

    if (result.length > 0) {
      const mapName = result[0].name;
      // 地图详情
      const mapRes = await API.get(`/ddnet/maps/${encodeURIComponent(mapName)}.json`);
      const map = mapRes.data;
      return map;
    }
  } catch (e) {
    return null;
  }
};

export const maps: TextHandler = async msg => {
  const query = new CommandParser(msg.text);
  const mapQueryString = query.getRest(1).replace(/['"]/g, '');
  const card = new Card('lg');

  if (!mapQueryString) {
    await msg.reply.addReaction(['❌']);
    return;
  }

  await msg.reply.addReaction(['⌛']);

  const map = await fetchMap(mapQueryString);
  if (map) {
    card.addTitle(map.name);
    card.addText(`作者: ${map.mapper}`);
    if (map.tiles.length > 0)
      card.addContext(
        map.tiles.map((tile: any) => ({
          src: `https://teeworlds.cn/assets/tiles/${tile}.png`,
        }))
      );
    card.addTextWithImage(
      `【${SERVERS[map.server]}】${difficulty(map.difficulty)} (${map.points}分)\n**${
        map.teesFinished
      }**名玩家完成了**${map.totalFinishes}**次该图\n平均用时**${secTime(
        map.medianTime
      )}**\n${mapLink('查看详情', map.name)}`,
      {
        src: `https://api.teeworlds.cn/ddnet/mapthumbs/${map.safeName}.png?square=true`,
      },
      'sm'
    );
    card.addButtons([
      {
        theme: 'info',
        text: '预览',
        value: `https://teeworlds.cn/p/${encodeURIComponent(map.name)}`,
        click: 'link',
      },
      {
        theme: 'secondary',
        text: '我的记录',
        value: `.rank "${map.name.replace(/"/g, '\\"')}"`,
        click: 'return-val',
      },
      {
        theme: 'secondary',
        text: '全球排名',
        value: `.top global ${map.name}`,
        click: 'return-val',
      },
      {
        theme: 'secondary',
        text: '国服排名',
        value: `.top chn ${map.name}`,
        click: 'return-val',
      },
    ]);
    card.addContext([
      `发布日期: ${map.releaseDate.replace(/-/g, '/').replace('legacy', '上古老图')} (met)${
        msg.userId
      }(met)`,
    ]);
    card.setTheme('success');
  } else {
    card.addTitle(`⚠ 未找到和${mapQueryString}相关的地图`);
    card.addContext([`(met)${msg.userId}(met)`]);
    card.setTheme('warning');
  }

  try {
    await msg.reply.card(card);
  } catch (e) {
    console.error(e);
    await msg.reply.text('暂时无法回应，请稍后重试');
  }

  await msg.reply.deleteReaction(['⌛']);
};
