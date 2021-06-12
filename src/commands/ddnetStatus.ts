import { TextHandler } from '../bottype';
import { Request } from '../utils/axios';
import { Card } from '../utils/cardBuilder';
import { FLAGS } from '../utils/consts';

export const ddnetStatus: TextHandler = async msg => {
  const card = new Card('lg', 'DDNet服务器状态');
  card.addContext(['[详情 (ddnet.tw)](https://ddnet.tw/status)']);

  await msg.reply.addReaction(['⌛']);
  try {
    const response = await Request.get(encodeURI(`https://ddnet.tw/status/json/stats.json`));

    const servers = [];
    for (let s of response.data.servers) {
      const country: string = s.type.split('.')[0].slice(0, 3);
      if (country == 'chn') {
        servers.push(s);
      }
    }

    for (let s of response.data.servers) {
      const country: string = s.type.split('.')[0].slice(0, 3);
      if (country != 'chn') {
        servers.push(s);
      }
    }

    const table = [
      ['**服务器**', '**状态**', '**流量**'],
      ...servers.map((s: any) => {
        const server: string = s.type.split('.')[0];
        const country: string = server.slice(0, 3);
        const online: boolean = s.online4 || s.online6;
        const packets: string = online
          ? `▼${(s.packets_rx / 1000).toFixed(1)}k ▲${(s.packets_tx / 1000).toFixed(1)}k`
          : '❌ 不可用';
        return [
          `${country in FLAGS ? FLAGS[country] : FLAGS['default']}${server.toUpperCase()}`,
          online ? '🟢 在线' : '❌ 离线',
          packets,
        ];
      }),
    ];
    card.addTable(table);
  } catch (err) {
    card.addMarkdown('❌ *查询出错*');
    console.error(err);
  }

  await msg.reply.card(card);
  await msg.reply.deleteReaction(['⌛']);
};
