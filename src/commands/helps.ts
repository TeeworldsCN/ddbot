import { kaiheila } from '../bots/kaiheila';
import { wechat } from '../bots/wechat';
import { TextHandler } from '../bottype';

export const kaiheilaHelp: TextHandler = async msg => {
  const lines = [];
  for (const key in kaiheila.commands) {
    if (kaiheila.commands[key].desc) {
      lines.push(`${key} - ${kaiheila.commands[key].desc}`);
    }
  }
  msg.reply.text(lines.join('\n'));
};

export const wechatHelp: TextHandler = async msg => {
  const lines = ['指令手册：\n'];
  const engHelp = [];

  for (const key in wechat.commands) {
    if (wechat.commands[key].desc === true) {
      engHelp.push(key);
    } else if (wechat.commands[key].desc) {
      lines.push(`${key} - ${wechat.commands[key].desc}`);
    }
  }
  lines.push(`\n * 还可以使用以下等同指令: \n${engHelp.join()}`);
  msg.reply.text(lines.join('\n'));
};
