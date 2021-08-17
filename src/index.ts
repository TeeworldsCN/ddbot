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
  begone,
  channelLevel,
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
import { maps } from './commands/maps';
import { here, me } from './commands/me';
import { simplePoints as sp, points, simplerPoints as ssp } from './commands/points';
import { rank } from './commands/rank';
import { top } from './commands/top';
import { generalHelp, generalHelpEng, wechatHelp } from './commands/helps';
import { feederStart } from './rss';
import { bridges, kaiheila, oicq, wechat } from './bots';
import { hookMsg } from './hookMsg';
import { GLOBAL_COMMAND } from './bots/base';
import { dice, gpt2, gpt2xl, roll, uuid } from './commands/fun';
import { messageDumper } from './conversations/messageDumper';
import { fanyi, translate } from './commands/tencent';
import { checkface, oicqCheckMembers, oicqClearCache } from './commands/oicqAdminTools';

/*
  连接数据库
*/
(async () => {
  await mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  });

  // 生成定义的管理员账户
  await initAdmins();
})();

/*
    机器人指令绑定
*/

const MANAGER_BOTS = [kaiheila, oicq, ...Object.values(bridges)];
for (const bot of MANAGER_BOTS) {
  if (bot) {
    // 管理指令
    bot.addCommand(LEVEL_ADMIN, 'nuke', nuke);
    bot.addCommand(LEVEL_ADMIN, 'assign', assign);
    bot.addCommand(LEVEL_ADMIN, 'revoke', revoke);
    bot.addCommand(LEVEL_SUBADMIN, 'channelcmd', channelLevel);
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

    if (oicq) {
      bot.addCommand(LEVEL_SUBADMIN, 'oicqcheckmembers', oicqCheckMembers);
      bot.addCommand(LEVEL_SUBADMIN, 'oicqclearcache', oicqClearCache);
    }
  }
}

if (kaiheila) {
  // 开黑啦指令
  kaiheila.addCommand(LEVEL_USER, 'bind', bind, '绑定DDNetID (.bind tee)');
  kaiheila.addCommand(LEVEL_USER, 'points', points, '查询DDN点数 (.points [tee])');
  kaiheila.addCommand(LEVEL_USER, 'rank', rank, '查询DDN地图排名 (.rank "Yun Gu" [tee])');
  kaiheila.addCommand(LEVEL_USER, 'find', find, '查询玩家在线状态 (.find tee)');
  kaiheila.addCommand(LEVEL_USER, 'top', top, '查看DDN排行榜首 (.top Yun Gu 或者 .top chn YunGu)');
  kaiheila.addCommand(LEVEL_USER, 'status', ddnetStatus, '查询DDN服务器状态');
  kaiheila.addCommand(LEVEL_USER, 'map', maps, '查找DDN地图 (.map EscapePrison)');
  kaiheila.addCommand(LEVEL_USER, 'help', generalHelp, '显示该帮助消息');

  // 通过开黑啦测试简单的微信指令
  kaiheila.addCommand(LEVEL_TESTER, 'sp', sp);
  kaiheila.addCommand(LEVEL_TESTER, 'ssp', ssp);
  kaiheila.addCommand(LEVEL_TESTER, 'helpwechat', wechatHelp);

  // kaiheila.addConverse(LEVEL_TESTER, 'testmatch', matchSignup);

  // // 开黑啦报名管理指令
  // kaiheila.addCommand(LEVEL_SUBADMIN, 'setreg', registrationCheck);
  // kaiheila.addCommand(LEVEL_SUBADMIN, 'exportreg', exportRegistration);
}

if (wechat) {
  // 微信指令
  wechat.addCommand(LEVEL_USER, 'bind', bind, true);
  wechat.addCommand(LEVEL_USER, 'points', sp, true);
  wechat.addCommand(LEVEL_USER, 'heatmap', points, true);
  wechat.addCommand(LEVEL_USER, 'help', wechatHelp, true);
  wechat.addCommand(LEVEL_USER, '?', wechatHelp);
  wechat.addCommand(LEVEL_USER, '？', wechatHelp);
  wechat.addCommand(LEVEL_USER, '指令', wechatHelp);
  wechat.addCommand(LEVEL_USER, 'h', wechatHelp);
  wechat.addCommand(LEVEL_USER, '绑定', bind, '绑定DDNetID\n    * 例：绑定 tee');
  wechat.addCommand(LEVEL_USER, '点数', sp, '查询我的点数\n    * 或加ID查询他人：点数 tee');
  wechat.addCommand(LEVEL_USER, '分数', sp);
  wechat.addCommand(LEVEL_USER, '活跃度', points, '查询我的近期活跃度');
  wechat.addCommand(LEVEL_USER, '帮助', wechatHelp, '显示该帮助消息');

  // wechat.addConverse(LEVEL_USER, '报名', matchSignup, '2021暑期赛FNG报名');
}

if (oicq) {
  // OICQ指令
  oicq.addCommand(LEVEL_USER, 'help', generalHelp, '显示该帮助消息');
  oicq.addCommand(LEVEL_SUBADMIN, 'gun', begone);
  oicq.addCommand(LEVEL_SUBADMIN, '滚', begone);
  oicq.addCommand(LEVEL_SUBADMIN, 'checkface', checkface);
  oicq.addConverse(LEVEL_ADMIN, 'dumpmsg', messageDumper);
}

for (const name in bridges) {
  bridges[name].addCommand(LEVEL_USER, 'help', generalHelpEng);
  bridges[name].addCommand(LEVEL_MANAGER, 'sub', subscribe);
  bridges[name].addCommand(LEVEL_MANAGER, 'unsub', unsubscribe);
  bridges[name].addCommand(LEVEL_MANAGER, 'listsub', listSub);
}

GLOBAL_COMMAND(LEVEL_USER, 'me', me);
GLOBAL_COMMAND(LEVEL_MANAGER, 'here', here);
GLOBAL_COMMAND(LEVEL_USER, 'roll', roll, '生成随机数 (.roll [min] [max])', 'roll a number (1-100)');
GLOBAL_COMMAND(LEVEL_USER, 'dice', dice, '掷骰子 (.dice [n])', 'roll dice (.dice [n])');
GLOBAL_COMMAND(LEVEL_USER, 'uuid', uuid, '生成UUID', 'generate a uuid v4');
if (process.env.BOOSTE_TOKEN) {
  GLOBAL_COMMAND(
    LEVEL_USER,
    'gpt2',
    gpt2,
    '用GPT2模型生成10个词 (.gpt2 <英文文本>)',
    'generate text using gpt2 (10 words)'
  );
  GLOBAL_COMMAND(
    LEVEL_USER,
    'gpt2xl',
    gpt2xl,
    '用GPT2XL模型生成5个词 (.gpt2xl <英文文本>)',
    'generate text using gpt2 (5 words)'
  );
}

if (process.env.TENCENT_SDK_SECRETID) {
  GLOBAL_COMMAND(LEVEL_USER, 'translate', translate, null, 'translate to chinese');
  GLOBAL_COMMAND(LEVEL_USER, 'fanyi', fanyi, '翻译句子成英语', null);
}

/*
  启动机器人
*/
if (kaiheila) kaiheila.connect();
if (wechat) wechat.connect();
if (oicq) oicq.connect();
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
