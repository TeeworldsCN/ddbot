import { KaiheilaBot } from 'kaiheila-bot-root';
import { createClient } from 'oicq';
import { KaiheilaBotAdapter } from './kaiheila';
import { MatterbridgeBotAdapter } from './matterbridge';
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
      'kaiheila'
    )
  : null;

export const wechat: WechatBotAdapter = process.env.WECHAT_APPID
  ? new WechatBotAdapter(wechatAPI, 'wechat')
  : null;

export const oicq: OICQBotAdapter = process.env.OICQ_ACCOUNT
  ? new OICQBotAdapter(
      createClient(parseInt(process.env.OICQ_ACCOUNT), { log_level: 'mark' }),
      'oicq'
    )
  : null;

const BRIDGES = (() => {
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
    [name: string]: AxiosInstance;
  } = {};
  for (let i = 0; i < info.length; ++i) {
    const b = info[i];
    const t = tokens[i];
    result[b.name] = axios.create({
      baseURL: b.url,
      headers: t ? { Authorization: `Bearer ${t}` } : undefined,
    });
  }

  return result;
})();

export const matterbridge: MatterbridgeBotAdapter = process.env.MATTERBRIDGE_API
  ? new MatterbridgeBotAdapter(process.env.MATTERBRIDGE_API, 'bridge')
  : null;
