require('dotenv').config();

import mongoose from 'mongoose';
import { kaiheilaAddCommand, kaiheilaStart } from './bots/kaiheila';
import { wechatAddCommand, wechatStart } from './bots/wechat';
import { initAdmins } from './db/user';
import { assign, nuke } from './handlers/adminTools';

import { bind } from './handlers/bind';
import { find } from './handlers/find';
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
kaiheilaAddCommand('bind', bind);
kaiheilaAddCommand('points', points);
kaiheilaAddCommand('rank', rank);
kaiheilaAddCommand('find', find);
kaiheilaAddCommand('top', top);
kaiheilaAddCommand('pointrank', pointRank);

wechatAddCommand('me', me);
wechatAddCommand('bind', bind);
wechatAddCommand('绑定', bind);
wechatAddCommand('points', points);
wechatAddCommand('点数', points);
wechatAddCommand('rank', pointRank);
wechatAddCommand('排名', pointRank);

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
