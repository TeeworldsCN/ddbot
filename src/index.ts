require('dotenv').config();

import mongoose from 'mongoose';
import { kaiheilaAddCommand, kaiheilaStart } from './bots/kaiheila';
import { wechatAddCommand, wechatStart } from './bots/wechat';

import { bind } from './handlers/bind';
import { startWebhook as webhookStart } from './webhook';

/*
  连接数据库
*/
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

/*
    机器人指令绑定
*/
kaiheilaAddCommand('bind', bind);
wechatAddCommand('bind', bind);

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
