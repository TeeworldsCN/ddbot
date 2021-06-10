require('dotenv').config();

import mongoose from 'mongoose';
import { kaiheihaHelp, kaiheilaAddCommand, kaiheilaStart } from './bots/kaiheila';
import { wechatAddCommand, wechatHelp, wechatStart } from './bots/wechat';
import { initAdmins } from './db/user';
import { assign, nuke } from './handlers/adminTools';

import { bind } from './handlers/bind';
import { ddnetStatus } from './handlers/ddnetStatus';
import { find } from './handlers/find';
import { maps } from './handlers/maps';
import { me } from './handlers/me';
import { pointRank, points } from './handlers/points';
import { rank } from './handlers/rank';
import { top } from './handlers/top';
import { startWebhook as webhookStart } from './webhook';

/*
  连接数据库
*/
(async () => {
  await mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  });

  // 生成定义的管理员账户
  await initAdmins();
})();

/*
    机器人指令绑定
*/
kaiheilaAddCommand('nuke', nuke);
kaiheilaAddCommand('assign', assign);
kaiheilaAddCommand('me', me);
kaiheilaAddCommand('bind', bind, '绑定DDNetID (.bind tee)');
kaiheilaAddCommand('points', points, '查询DDN点数 (.points [tee])');
kaiheilaAddCommand('rank', rank, '查询DDN地图排名 (.rank "Yun Gu" [tee])');
kaiheilaAddCommand('find', find, '查询玩家在线状态 (.find tee)');
kaiheilaAddCommand('top', top, '查看DDN排行榜首 (.top Yun Gu 或者 .top chn YunGu)');
kaiheilaAddCommand('status', ddnetStatus, '查询DDN服务器状态');
kaiheilaAddCommand('map', maps, '查找DDN地图 (.map EscapePrison)');
kaiheilaAddCommand('help', kaiheihaHelp, '显示该帮助消息');

// 通过开黑啦测试简单的微信指令
kaiheilaAddCommand('pointrank', pointRank);
kaiheilaAddCommand('helpwechat', wechatHelp);

wechatAddCommand('me', me);
wechatAddCommand('bind', bind, true);
wechatAddCommand('points', points, true);
wechatAddCommand('rank', pointRank, true);
// wechatAddCommand('record', pointRank, true);
wechatAddCommand('help', wechatHelp, true);
wechatAddCommand('?', wechatHelp);
wechatAddCommand('？', wechatHelp);
wechatAddCommand('指令', wechatHelp);
wechatAddCommand('h', wechatHelp);
wechatAddCommand('绑定', bind, '绑定DDNetID\n     * 例：绑定 tee');
wechatAddCommand('点数', points, '查询我的点数\n     * 或加ID查询他人：点数 tee');
wechatAddCommand('分数', points);
wechatAddCommand('排名', pointRank, '查询我的点数排名');
// wechatAddCommand('纪录', pointRank, '查询我的地图记录\n     * 例: 纪录 YunGu');
// wechatAddCommand('记录', pointRank);
wechatAddCommand('帮助', wechatHelp, '显示该帮助消息');

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
