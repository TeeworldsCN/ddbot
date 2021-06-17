require('dotenv').config();

import mongoose from 'mongoose';
import { kaiheila, kaiheilaStart } from './bots/kaiheila';
import { wechatAutoReplyCommand, wechatStart, wechat } from './bots/wechat';
import {
  initAdmins,
  LEVEL_ADMIN,
  LEVEL_MANAGER,
  LEVEL_OPERATOR,
  LEVEL_TESTER,
  LEVEL_USER,
} from './db/user';
import { assign, nuke, subscribe, unsubscribe, listSub, revoke } from './commands/adminTools';
import {
  wechatListKeywords,
  wechatSetKeyword,
  wechatRemoveKeyword,
  wechatGetToken,
} from './commands/wechatManage';
import { startWebhook as webhookStart } from './webhook';

import { bind } from './commands/bind';
import { ddnetStatus } from './commands/ddnetStatus';
import { find } from './commands/find';
import { maps } from './commands/maps';
import { me } from './commands/me';
import { pointRank, points } from './commands/points';
import { rank } from './commands/rank';
import { top } from './commands/top';
import { generalHelp, wechatHelp } from './commands/helps';
import { matchSignup } from './conversations/matchSignup';
import { exportRegistration, registrationCheck } from './commands/signupManage';
import { feederStart } from './rss';

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
// 管理指令
kaiheila.addCommand(LEVEL_ADMIN, 'nuke', nuke);
kaiheila.addCommand(LEVEL_ADMIN, 'assign', assign);
kaiheila.addCommand(LEVEL_ADMIN, 'revoke', revoke);
kaiheila.addCommand(LEVEL_OPERATOR, 'wxtoken', wechatGetToken);
kaiheila.addCommand(LEVEL_OPERATOR, 'wxsetkw', wechatSetKeyword);
kaiheila.addCommand(LEVEL_OPERATOR, 'wxlskw', wechatListKeywords);
kaiheila.addCommand(LEVEL_OPERATOR, 'wxrmkw', wechatRemoveKeyword);
kaiheila.addCommand(LEVEL_OPERATOR, 'wxtestkw', wechatAutoReplyCommand);
kaiheila.addCommand(LEVEL_MANAGER, 'sub', subscribe);
kaiheila.addCommand(LEVEL_MANAGER, 'unsub', unsubscribe);
kaiheila.addCommand(LEVEL_MANAGER, 'listsub', listSub);

// 开黑啦指令
kaiheila.addCommand(LEVEL_USER, 'me', me);
kaiheila.addCommand(LEVEL_USER, 'bind', bind, '绑定DDNetID (.bind tee)');
kaiheila.addCommand(LEVEL_USER, 'points', points, '查询DDN点数 (.points [tee])');
kaiheila.addCommand(LEVEL_USER, 'rank', rank, '查询DDN地图排名 (.rank "Yun Gu" [tee])');
kaiheila.addCommand(LEVEL_USER, 'find', find, '查询玩家在线状态 (.find tee)');
kaiheila.addCommand(LEVEL_USER, 'top', top, '查看DDN排行榜首 (.top Yun Gu 或者 .top chn YunGu)');
kaiheila.addCommand(LEVEL_USER, 'status', ddnetStatus, '查询DDN服务器状态');
kaiheila.addCommand(LEVEL_USER, 'map', maps, '查找DDN地图 (.map EscapePrison)');
kaiheila.addCommand(LEVEL_USER, 'help', generalHelp, '显示该帮助消息');

// 通过开黑啦测试简单的微信指令
kaiheila.addCommand(LEVEL_TESTER, 'pointrank', pointRank);
kaiheila.addCommand(LEVEL_TESTER, 'helpwechat', wechatHelp);
kaiheila.addConverse(LEVEL_TESTER, 'testmatch', matchSignup);

// 开黑啦报名管理指令
kaiheila.addCommand(LEVEL_OPERATOR, 'setreg', registrationCheck);
kaiheila.addCommand(LEVEL_OPERATOR, 'exportreg', exportRegistration);

// 微信指令
wechat.addCommand(LEVEL_USER, '.me', me);
wechat.addCommand(LEVEL_USER, 'bind', bind, true);
wechat.addCommand(LEVEL_USER, 'points', points, true);
wechat.addCommand(LEVEL_USER, 'rank', pointRank, true);
wechat.addCommand(LEVEL_USER, 'help', wechatHelp, true);
wechat.addCommand(LEVEL_USER, '?', wechatHelp);
wechat.addCommand(LEVEL_USER, '？', wechatHelp);
wechat.addCommand(LEVEL_USER, '指令', wechatHelp);
wechat.addCommand(LEVEL_USER, 'h', wechatHelp);
wechat.addCommand(LEVEL_USER, '绑定', bind, '绑定DDNetID\n     * 例：绑定 tee');
wechat.addCommand(LEVEL_USER, '点数', points, '查询我的点数\n     * 或加ID查询他人：点数 tee');
wechat.addCommand(LEVEL_USER, '分数', points);
wechat.addCommand(LEVEL_USER, '排名', pointRank, '查询我的点数排名');
wechat.addCommand(LEVEL_USER, '帮助', wechatHelp, '显示该帮助消息');
wechat.addConverse(LEVEL_USER, '报名', matchSignup, '2021暑期赛FNG报名');

/*
  启动机器人
*/
kaiheilaStart();
wechatStart();
/*
  启动WebHook
*/
webhookStart();
/*
  启动订阅
*/
feederStart();

console.log('Bot Started');
