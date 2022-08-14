import { CONFIG } from '../config';
import { MatterbridgeBotAdapter, StableWebSocket } from './matterbridge';
import { QQGuildBotAdapter } from './qqguild';
import { wechatAPI, WechatBotAdapter } from './wechat';
import { createOpenAPI, createWebsocket } from 'qq-guild-bot';
import _ from 'lodash';
import { GenericBotAdapter } from './base';

export const qqguild: QQGuildBotAdapter = CONFIG.qqguild
  ? new QQGuildBotAdapter(
      {
        client: createOpenAPI(CONFIG.qqguild),
        ws: createWebsocket(CONFIG.qqguild),
      },
      'qqguild',
      'guild'
    )
  : null;

export const wechat: WechatBotAdapter = CONFIG.wechat
  ? new WechatBotAdapter(wechatAPI, 'wechat', 'gzh')
  : null;

export const bridges = (() => {
  const bridges = CONFIG.matterbridge || [];
  const result: {
    [name: string]: MatterbridgeBotAdapter;
  } = {};
  for (const bridge of bridges) {
    const ws = new StableWebSocket(bridge.url, {
      headers: { Authorization: `Bearer ${bridge.token}` },
    });
    result[bridge.name] = new MatterbridgeBotAdapter(ws, 'gateway', bridge.name);
  }
  return result;
})();

export const bots = [qqguild, wechat, ...Object.values(bridges)].filter(b => b != null);
export const botsByName: { [name: string]: GenericBotAdapter<any> } = {};

for (const bot of bots) {
  botsByName[bot.botName] = bot;
}
