require('dotenv').config();

import mongoose from 'mongoose';
import { wechatAutoReplyCommand } from './bots/wechat';
import {
  initAdmins,
  LEVEL_ADMIN,
  LEVEL_MANAGER,
  LEVEL_SUBADMIN,
  LEVEL_TESTER,
  LEVEL_USER,
} from './db/user';
import {
  assign,
  nuke,
  subscribe,
  unsubscribe,
  listSub,
  revoke,
  relay,
  listRelay,
  unrelay,
  channelLevel,
  channelKey,
} from './commands/adminTools';
import {
  wechatListKeywords,
  wechatSetKeyword,
  wechatRemoveKeyword,
  wechatGetToken,
} from './commands/wechatManage';
import { startWebhook as webhookStart, webhook } from './webhook';

import { bind } from './commands/bind';
import { ddnetStatus } from './commands/ddnetStatus';
import { find } from './commands/find';
import { here, me } from './commands/me';
import { rank } from './commands/rank';
import { top } from './commands/top';
import { generalHelp, generalHelpEng, wechatHelp } from './commands/helps';
import { feederStart } from './rss';
import { bridges, qqguild, wechat } from './bots';
import { hookMsg } from './hookMsg';
import { GLOBAL_COMMAND } from './bots/base';
import { dice, roll, uuid } from './commands/fun';
import { fanyi, translate } from './commands/tencent';
import { CONFIG } from './config';
import { msgTest } from './commands/qqguildTools';

/*
  连接数据库
*/
(async () => {
  await mongoose.connect(CONFIG.mongodb);

  // 生成定义的管理员账户
  await initAdmins();
})();

/*
    机器人指令绑定
*/

const MANAGER_BOTS = [qqguild, ...Object.values(bridges)];
for (const bot of MANAGER_BOTS) {
  if (bot) {
    // 管理指令
    bot.addCommand(LEVEL_ADMIN, 'nuke', nuke);
    bot.addCommand(LEVEL_ADMIN, 'assign', assign);
    bot.addCommand(LEVEL_ADMIN, 'revoke', revoke);
    bot.addCommand(LEVEL_SUBADMIN, 'chkey', channelKey);
    bot.addCommand(LEVEL_SUBADMIN, 'chreq', channelLevel);
    bot.addCommand(LEVEL_SUBADMIN, 'chunlock', channelLevel);
    bot.addCommand(LEVEL_SUBADMIN, 'wxtoken', wechatGetToken);
    bot.addCommand(LEVEL_SUBADMIN, 'wxsetkw', wechatSetKeyword);
    bot.addCommand(LEVEL_SUBADMIN, 'wxlskw', wechatListKeywords);
    bot.addCommand(LEVEL_SUBADMIN, 'wxrmkw', wechatRemoveKeyword);
    bot.addCommand(LEVEL_SUBADMIN, 'wxtestkw', wechatAutoReplyCommand);
    bot.addCommand(LEVEL_MANAGER, 'sub', subscribe);
    bot.addCommand(LEVEL_MANAGER, 'unsub', unsubscribe);
    bot.addCommand(LEVEL_MANAGER, 'listsub', listSub);
    bot.addCommand(LEVEL_ADMIN, 'relay', relay);
    bot.addCommand(LEVEL_ADMIN, 'listrelay', listRelay);
    bot.addCommand(LEVEL_ADMIN, 'unrelay', unrelay);
  }
}

if (wechat) {
  // 微信指令
  wechat.addCommand(LEVEL_USER, 'bind', bind, true);
  // wechat.addCommand(LEVEL_USER, 'points', sp, true);
  // wechat.addCommand(LEVEL_USER, 'heatmap', points, true);
  wechat.addCommand(LEVEL_USER, 'help', wechatHelp, true);
  wechat.addCommand(LEVEL_USER, '?', wechatHelp);
  wechat.addCommand(LEVEL_USER, '？', wechatHelp);
  wechat.addCommand(LEVEL_USER, '指令', wechatHelp);
  wechat.addCommand(LEVEL_USER, 'h', wechatHelp);
  wechat.addCommand(LEVEL_USER, '绑定', bind, '绑定DDNetID\n    * 例：绑定 tee');
  // wechat.addCommand(LEVEL_USER, '点数', sp, '查询我的点数\n    * 或加ID查询他人：点数 tee');
  // wechat.addCommand(LEVEL_USER, '分数', sp);
  // wechat.addCommand(LEVEL_USER, '活跃度', points, '查询我的近期活跃度');
  wechat.addCommand(LEVEL_USER, '帮助', wechatHelp, '显示该帮助消息');

  // wechat.addConverse(LEVEL_USER, '报名', matchSignup, '2021暑期赛FNG报名');
}

if (qqguild) {
  qqguild.addCommand(LEVEL_USER, 'help', generalHelp('/'));
  qqguild.addCommand(LEVEL_USER, '指令', generalHelp('/'), '查看所有指令');
  qqguild.addCommand(LEVEL_ADMIN, 'msgtest', msgTest);
}

for (const name in bridges) {
  bridges[name].addCommand(LEVEL_USER, 'help', generalHelpEng('.'));
  bridges[name].addCommand(LEVEL_MANAGER, 'sub', subscribe);
  bridges[name].addCommand(LEVEL_MANAGER, 'unsub', unsubscribe);
  bridges[name].addCommand(LEVEL_MANAGER, 'listsub', listSub);
}

GLOBAL_COMMAND(LEVEL_USER, 'me', me);
GLOBAL_COMMAND(LEVEL_MANAGER, 'here', here);
GLOBAL_COMMAND(LEVEL_USER, 'roll', roll, '生成随机数', 'roll a number (1-100)');
GLOBAL_COMMAND(LEVEL_USER, 'dice', dice, '掷骰子', 'roll dice');
GLOBAL_COMMAND(LEVEL_USER, 'uuid', uuid, '生成UUID', 'generate a uuid v4');

if (CONFIG.tencentSdk) {
  GLOBAL_COMMAND(LEVEL_USER, 'translate', translate, null, 'translate to chinese');
  GLOBAL_COMMAND(LEVEL_USER, 'fanyi', fanyi, '翻译句子成英语', null);
}

/*
  启动机器人
*/
if (wechat) wechat.connect();
if (qqguild) qqguild.connect();
for (const name in bridges) {
  bridges[name].connect();
}

/*
  挂载订阅消息Webhook
*/
webhook.use('/wh', hookMsg);

/*
  启动Webhook
*/
webhookStart();
/*
  启动订阅
*/
feederStart();

console.log('Bot Started');
