const m = module;
const r = require;

const path = r('path');

m.exports = () => ({
  // MongoDB 连接
  mongodb: 'mongodb://192.168.3.86:27017/ddbotDev',

  qqguild: {
    appID: '102019100',
    token: '6V948NMAHOWMgTcUs5uVhW8sSRDToQOj',
    intents: [
      'GUILD_MESSAGES',
      'FORUMS_EVENT',
      'MESSAGE_AUDIT',
      'INTERACTION',
      'DIRECT_MESSAGE',
      'GUILD_MESSAGE_REACTIONS',
      'GUILDS',
      'GUILD_MEMBERS',
    ],
    sandbox: false,
  },

  // Bot的HTTP服务接口
  webhookPort: 4000,

  // 验证入消息的 Token
  auth: {
    token: '<token>',
  },

  twcnApi: {
    url: 'https://api.teeworlds.cn',
    token: '<token>',
  },

  admins: ['qqguild|12146439043520380019'],

  // imageProxy: 'http://localhost:8080',
});
