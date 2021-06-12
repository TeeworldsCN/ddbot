require('dotenv').config();

import mongoose from 'mongoose';
import { kaiheila, kaiheilaStart } from './bots/kaiheila';
import { wechatAutoReplyCommand, wechatStart, wechat } from './bots/wechat';
import { initAdmins } from './db/user';
import {
  assign,
  wechatListKeywords,
  nuke,
  wechatSetKeyword,
  wechatRemoveKeyword,
  wechatGetToken,
} from './commands/adminTools';
import { startWebhook as webhookStart } from './webhook';

import { bind } from './commands/bind';
import { ddnetStatus } from './commands/ddnetStatus';
import { find } from './commands/find';
import { maps } from './commands/maps';
import { me } from './commands/me';
import { pointRank, points } from './commands/points';
import { rank } from './commands/rank';
import { top } from './commands/top';
import { kaiheilaHelp, wechatHelp } from './commands/helps';
import { matchSignup } from './conversations/matchSignup';

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
kaiheila.addCommand('nuke', nuke);
kaiheila.addCommand('assign', assign);
kaiheila.addCommand('wxtoken', wechatGetToken);
kaiheila.addCommand('wxsetkw', wechatSetKeyword);
kaiheila.addCommand('wxlskw', wechatListKeywords);
kaiheila.addCommand('wxrmkw', wechatRemoveKeyword);
kaiheila.addCommand('wxtestkw', wechatAutoReplyCommand);

// 开黑啦指令
kaiheila.addCommand('me', me);
kaiheila.addCommand('bind', bind, '绑定DDNetID (.bind tee)');
kaiheila.addCommand('points', points, '查询DDN点数 (.points [tee])');
kaiheila.addCommand('rank', rank, '查询DDN地图排名 (.rank "Yun Gu" [tee])');
kaiheila.addCommand('find', find, '查询玩家在线状态 (.find tee)');
kaiheila.addCommand('top', top, '查看DDN排行榜首 (.top Yun Gu 或者 .top chn YunGu)');
kaiheila.addCommand('status', ddnetStatus, '查询DDN服务器状态');
kaiheila.addCommand('map', maps, '查找DDN地图 (.map EscapePrison)');
kaiheila.addCommand('help', kaiheilaHelp, '显示该帮助消息');

// 通过开黑啦测试简单的微信指令
kaiheila.addCommand('pointrank', pointRank);
kaiheila.addCommand('helpwechat', wechatHelp);
kaiheila.addConverse('testmatch', matchSignup);

// 微信指令
wechat.addCommand('me', me);
wechat.addCommand('bind', bind, true);
wechat.addCommand('points', points, true);
wechat.addCommand('rank', pointRank, true);
// wechat.addCommand('record', pointRank, true);
wechat.addCommand('help', wechatHelp, true);
wechat.addCommand('?', wechatHelp);
wechat.addCommand('？', wechatHelp);
wechat.addCommand('指令', wechatHelp);
wechat.addCommand('h', wechatHelp);
wechat.addCommand('绑定', bind, '绑定DDNetID\n     * 例：绑定 tee');
wechat.addCommand('点数', points, '查询我的点数\n     * 或加ID查询他人：点数 tee');
wechat.addCommand('分数', points);
wechat.addCommand('排名', pointRank, '查询我的点数排名');
// wechat.addCommand('纪录', pointRank, '查询我的地图记录\n     * 例: 纪录 YunGu');
// wechat.addCommand('记录', pointRank);
wechat.addCommand('帮助', wechatHelp, '显示该帮助消息');

/*
    启动机器人
*/
kaiheilaStart();
wechatStart();

/*
    启动WebHook
*/
webhookStart();
console.log('Bot Started');
