import { Card } from '../utils/cardBuilder';
import { CommandParser } from '../utils/commandParser';
import { TextHandler } from './bottype';

export const find: TextHandler = async (msg, bot, type, raw) => {
  const query = new CommandParser(msg.content);
  const name = query.getRest(1);
  const searchName = name || msg.tools.db.get(`ddnetBinds.u${msg.authorId}`).value();
  const card = new Card('lg');

  if (!searchName) {
    await msg.reply.addReaction(msg.msgId, ['❌']);
    return;
  }

  await msg.reply.addReaction(msg.msgId, ['⌛']);

  try {
    const playerQuery = await msg.tools.api.get(
      `/servers/players?name=${encodeURIComponent(searchName)}&detail=true`
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
            value: `https://teeworlds.cn/browser/${msg.tools.addr2b(
              player.server.ip,
              player.server.port
            )}`,
            click: 'link',
            text: '加入',
          },
          true
        );
        card.addContext([`${player.server.ip}:${player.server.port}`], true);
      }
    } else {
      card.addText(`${searchName} 当前似乎不在线`);
    }
  } catch (err) {
    card.slice(0, 0);
    card.addMarkdown('❌ *查询超时，请稍后重试*');
    card.addContext([`(met)${msg.authorId}(met)`]);
    card.setTheme('danger');
    console.error(err);
  }

  try {
    await msg.reply.create(card);
  } catch (e) {
    console.error(e);
    console.log(card.toString());
    await msg.reply.create('暂时无法回应，请稍后重试');
  }

  await msg.reply.deleteReaction(msg.msgId, ['⌛']);
};
