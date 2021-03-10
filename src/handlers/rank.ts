import { TextHandler } from './bottype';
import { Card } from '../utils/cardBuilder';
import { AxiosError } from 'axios';
import _ from 'lodash';
import { CommandParser } from '../utils/commandParser';

export const rank: TextHandler = async (msg, bot, type, raw) => {
  const query = new CommandParser(msg.content);
  const mapQueryString = query.getString(1);
  if (!mapQueryString) return;

  const playerName = query.getRest(2) || msg.tools.db.get(`ddnetBinds.u${msg.authorId}`).value();
  const card = new Card('lg');
  const isButton = type == 'button';
  if (isButton) card.addContext(['该消息只有您可见']);

  if (!playerName) {
    card.addMarkdown('请先使用 `.bind <名字>` 指令绑定DDNet ID再使用快速查询指令');
    card.addContext([`(met)${msg.authorId}(met)`]);
    await msg.reply.create(card, undefined, isButton);
    return;
  }

  await msg.reply.addReaction(msg.msgId, ['⌛']);

  try {
    let mapName: string = null;
    if (isButton) {
      mapName = mapQueryString;
    } else {
      const mapQuery = await msg.tools.api.get(
        `https://ddnet.tw/maps/?query=${encodeURIComponent(mapQueryString)}`
      );
      mapName = mapQuery.data?.[0]?.name;
    }

    if (mapName) {
      // 查询玩家
      let map = null;
      try {
        const playerRes = await msg.tools.api.get(
          `/ddnet/players/${encodeURIComponent(playerName)}`
        );
        const player = playerRes.data;

        const allMaps = _.flatMap(player.servers, arr => arr.finishedMaps);
        map = allMaps.find(m => m.name.trim() == mapName.trim());
      } catch (e) {
        const err = e as AxiosError;
        if (err.isAxiosError && err.response.status == 404) {
          map = null;
        } else {
          throw e;
        }
      }

      if (map) {
        card.addText(`${playerName} 的 ${map.name} 记录 (${map.points}分)`);
        const text = [`最快用时: ${msg.tools.secTime(map.time)}`, `排名: ${map.rank}`];
        if (map.teamRank) {
          text.push(`团队排名: ${map.teamRank}`);
        }
        text.push(
          '',
          `完成次数: ${map.finishes}次`,
          `首次完成: ${msg.tools.dateTime(map.firstFinish)}`
        );
        card.addText(text.join('\n'));
        card.addContext([`(met)${msg.authorId}(met)`]);
        card.setTheme('success');
      } else {
        card.addText(`⚠ 玩家 "${playerName}"\n未完成地图 "${mapName}"`);

        if (isButton) {
          card.addContext([`(met)${msg.authorId}(met)`]);
        } else {
          card.addContext([`提示: 如果地图名中有空格，请用引号括起来。 (met)${msg.authorId}(met)`]);
        }

        card.setTheme('warning');
      }
    } else {
      card.addTitle(`⚠ 未找到和${mapQueryString}相关的地图`);
      card.addContext([`(met)${msg.authorId}(met)`]);
      card.setTheme('warning');
    }
  } catch (err) {
    card.slice(0, 0);
    card.addMarkdown('❌ *查询超时，请稍后重试*');
    card.addContext([`(met)${msg.authorId}(met)`]);
    card.setTheme('danger');
    console.error(err);
  }

  try {
    await msg.reply.create(card, undefined, isButton);
  } catch {
    await msg.reply.create('暂时无法回应，请稍后重试');
  }
  await msg.reply.deleteReaction(msg.msgId, ['⌛']);
};
