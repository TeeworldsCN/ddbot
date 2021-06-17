import { Card } from '../utils/cardBuilder';
import { CommandParser } from '../utils/commandParser';
import { TextHandler } from '../bottype';
import { API } from '../utils/axios';
import { addr2b } from '../utils/helpers';

export const find: TextHandler = async msg => {
  const query = new CommandParser(msg.text);
  const name = query.getRest(1);
  const searchName = name || msg.user?.ddnetid;
  const card = new Card('lg');

  if (!searchName) {
    await msg.reply.addReaction(['❌']);
    return;
  }

  await msg.reply.addReaction(['⌛']);

  try {
    const playerQuery = await API.get(
      `/servers/players.json?name=${encodeURIComponent(searchName)}&detail=true`
    );

    if (playerQuery.data.players.length > 0) {
      card.addText(`${searchName} 正在玩: `);
      let first = true;
      for (let player of playerQuery.data.players) {
        if (first) {
          first = false;
        } else {
          card.addDivider();
        }
        card.addTextWithButton(
          `${player.server.name}\n[${player.server.num_clients}/${player.server.max_clients}] 模式: ${player.server.game_type}`,
          {
            value: `https://teeworlds.cn/browser/${addr2b(player.server.ip, player.server.port)}`,
            click: 'link',
            text: '加入',
          },
          true
        );
        card.addContext([`(met)${msg.userId}(met)`]);
      }
    } else {
      card.addText(`${searchName} 当前似乎不在线`);
    }
  } catch (err) {
    card.slice(0, 0);
    card.addMarkdown('❌ *查询失败，请稍后重试*');
    card.addContext([`(met)${msg.userId}(met)`]);
    card.setTheme('danger');
    console.error(err);
  }

  try {
    await msg.reply.card(card);
  } catch (e) {
    console.error(e);
    console.log(card.toString());
    await msg.reply.text('暂时无法回应，请稍后重试');
  }

  await msg.reply.deleteReaction(['⌛']);
};
