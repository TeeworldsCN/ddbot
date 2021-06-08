require('dotenv').config();

import mongoose from 'mongoose';
import { kaiheilaAddCommand, kaiheilaStart } from './bots/kaiheila';
import { wechatAddCommand, wechatStart } from './bots/wechat';
import { initAdmins } from './db/user';

import { bind } from './handlers/bind';
import { me } from './handlers/me';
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
kaiheilaAddCommand('bind', bind);
kaiheilaAddCommand('me', me);

wechatAddCommand('bind', bind);
wechatAddCommand('me', me);

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
