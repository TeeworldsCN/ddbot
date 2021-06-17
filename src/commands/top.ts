import { FLAGS } from '../utils/consts';
import { CommandParser } from '../utils/commandParser';
import { TextHandler } from '../bottype';
import { Card } from '../utils/cardBuilder';
import _ from 'lodash';
import { AxiosError } from 'axios';
import { API } from '../utils/axios';
import { secTime } from '../utils/helpers';

const topGlobalRoutine = async (server: string) => {
  let response = null;
  if (server != 'default') {
    response = await API.get(`/ddnet/players.json?server=${server}`);
  } else {
    response = await API.get(`/ddnet/players.json`);
  }

  return _.mapValues(response.data, data =>
    data
      .slice(0, 5)
      .map(
        (p: any) =>
          `${p.rank}. ${p.server ? `${FLAGS[p.server.toLowerCase()]} ` : ''}${p.name} (${
            p.points
          }分)`
      )
  );
};
const topMapRoutine = async (isButton: boolean, map: string, server: string) => {
  let mapName = null;
  if (isButton) {
    mapName = map;
  } else {
    const mapQuery = await API.get(`/ddnet/fuzzy/maps/${encodeURIComponent(map)}`);
    mapName = mapQuery.data?.[0]?.name;
  }
  let result = null;
  if (mapName) {
    // 查询地图
    if (server != 'default') {
      result = (await API.get(`/ddnet/maps/${encodeURIComponent(mapName)}?server=${server}`)).data;
    } else {
      result = (await API.get(`/ddnet/maps/${encodeURIComponent(mapName)}`)).data;
    }
  }

  const playerInfo = (r: any) => {
    if (r.players) {
      if (r.players.length > 2)
        return r.players.slice(0, 2).join(' 与 ') + ` 等${r.players.length}人`;
      return r.players.join(' 与 ');
    }
    return r.player;
  };

  const listProcess = (r: any) =>
    `${r.rank}. ${r.server ? `${FLAGS[r.server.toLowerCase()]} ` : ''}${playerInfo(r)} (${secTime(
      r.time
    )})`;

  return {
    mapName: result.name,
    teamRecords: result.teamRecords ? result.teamRecords.map(listProcess) : undefined,
    records: result.records ? result.records.map(listProcess) : undefined,
  };
};

export const top: TextHandler = async msg => {
  const query = new CommandParser(msg.text);
  let region = (query.getString(1) || '').toLowerCase();
  let mapQueryString = null;
  const card = new Card('lg');
  const isButton = msg.type == 'button';
  if (isButton) card.addContext(['该消息只有您可见']);

  let flag = '';
  if (region == 'global') region = 'default';

  if (region in FLAGS) {
    if (region == 'default') flag = '🌐';
    else flag = FLAGS[region];
    mapQueryString = query.getRest(2).replace(/['"]/g, '');
  } else {
    mapQueryString = query.getRest(1).replace(/['"]/g, '');
    region = 'default';
    flag = '🌐';
  }

  let data = null;

  const categories: any = {
    points: [`${flag} **点数排名**`, 3],
    teamRank: [`${flag} **团队排位**`, 3],
    rank: [`${flag} **个人排位**`, 3],
    teamRecords: [`${flag} **团队排名**`, 5],
    records: [`${flag} **个人排名**`, 5],
  };

  await msg.reply.addReaction(['⌛']);

  try {
    if (!mapQueryString) {
      // 查询全服记录
      card.addTitle(`DDNet 点数排名`);
      data = await topGlobalRoutine(region);
    } else {
      // 查询地图记录
      data = await topMapRoutine(isButton, mapQueryString, region);
      card.addTitle(`DDNet 地图排名: ${data.mapName}`);
    }
  } catch (e) {
    const err = e as AxiosError;
    if (err.isAxiosError && err?.response?.status == 404) {
      card.slice(0, 0);
      card.addTitle(`⚠ 未找到相关记录`);
      card.addContext([`(met)${msg.userId}(met)`]);
      card.setTheme('danger');
    } else {
      throw e;
    }
  }

  if (data) {
    for (let key in data) {
      const category = categories[key];
      if (category) {
        card.addMarkdown(category[0]);
        card.addText(data[key].slice(0, category[1]).join('\n'));
      }
    }
  }

  try {
    await msg.reply.card(card, undefined, isButton);
  } catch (e) {
    console.error(e);
    await msg.reply.text('暂时无法回应，请稍后重试');
  }

  await msg.reply.deleteReaction(['⌛']);
};
