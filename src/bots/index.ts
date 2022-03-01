import { KaiheilaBot } from 'kaiheila-bot-root';
import { createClient } from 'oicq';
import { KaiheilaBotAdapter } from './kaiheila';
import { MatterbridgeBotAdapter, StableWebSocket } from './matterbridge';
import { OICQBotAdapter } from './oicq';
import { wechatAPI, WechatBotAdapter } from './wechat';

export const kaiheila: KaiheilaBotAdapter = process.env.KAIHEILA_BOT_TOKEN
  ? new KaiheilaBotAdapter(
      new KaiheilaBot(
        process.env.KAIHEILA_BOT_MODE == 'webhook'
          ? {
              mode: 'webhook',
              token: process.env.KAIHEILA_BOT_TOKEN,
              port: parseInt(process.env.KAIHEILA_BOT_PORT),
              verifyToken: process.env.KAIHEILA_BOT_VERIFYTOKEN,
              key: process.env.KAIHEILA_BOT_KEY,
              ignoreDecryptError: false,
            }
          : {
              mode: 'websocket',
              token: process.env.KAIHEILA_BOT_TOKEN,
              ignoreDecryptError: false,
            }
      ),
      'kaiheila',
      'main'
    )
  : null;

export const wechat: WechatBotAdapter = process.env.WECHAT_APPID
  ? new WechatBotAdapter(wechatAPI, 'wechat', 'gzh')
  : null;

export const oicq: OICQBotAdapter = process.env.OICQ_ACCOUNT
  ? new OICQBotAdapter(
      createClient(parseInt(process.env.OICQ_ACCOUNT), { log_level: 'warn' }),
      'oicq',
      'main'
    )
  : null;

export const bridges = (() => {
  const info = process.env.MATTERBRIDGE_API
    ? process.env.MATTERBRIDGE_API.split('|').map(b => {
        const data = b.split('#');
        return {
          name: data[0],
          url: data.slice(1).join(''),
        };
      })
    : [];
  const tokens = process.env.MATTERBRIDGE_TOKEN ? process.env.MATTERBRIDGE_TOKEN.split('|') : [];
  const result: {
    [name: string]: MatterbridgeBotAdapter;
  } = {};
  for (let i = 0; i < info.length; ++i) {
    const b = info[i];
    const t = tokens[i];

    const ws = new StableWebSocket(b.url, { headers: { Authorization: `Bearer ${t}` } });
    result[b.name] = new MatterbridgeBotAdapter(ws, 'gateway', b.name);
  }

  return result;
})();
