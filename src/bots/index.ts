import { KaiheilaBot } from 'kaiheila-bot-root';
import { createClient } from 'oicq';
import { KaiheilaBotAdapter } from './kaiheila';
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
      )
    )
  : null;

export const wechat: WechatBotAdapter = process.env.WECHAT_APPID
  ? new WechatBotAdapter(wechatAPI)
  : null;

export const oicq: OICQBotAdapter = process.env.OICQ_ACCOUNT
  ? new OICQBotAdapter(createClient(parseInt(process.env.OICQ_ACCOUNT), { log_level: 'mark' }))
  : null;
