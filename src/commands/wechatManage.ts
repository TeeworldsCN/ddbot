import { CommandParser } from '../utils/commandParser';
import { TextHandler } from '../bottype';
import { WechatReplyModel } from '../db/wechatReply';
import _ from 'lodash';
import { accessToken } from '../bots/wechat';

// 设置微信自动回复关键字
export const wechatSetKeyword: TextHandler = async msg => {
  const query = new CommandParser(msg.text);
  const keyword = query.getString(1);
  const replyType = query.getString(2);
  const content = query.getRest(3);

  if (!keyword) {
    await msg.reply.text(`.wxsetkw 关键字 类型 内容`);
    return;
  }

  if (replyType != 'text' && replyType != 'image') {
    await msg.reply.text(`类型只能是 text / image`);
    return;
  }

  const result = await WechatReplyModel.updateOne(
    { keyword },
    { $set: { replyType, content } },
    { upsert: true }
  ).exec();

  if (result.ok) {
    await msg.reply.text('设置成功');
  } else {
    await msg.reply.text('未知错误，设置失败');
  }
};

// 列出微信自动回复关键字
export const wechatListKeywords: TextHandler = async msg => {
  const keywords = await WechatReplyModel.find({}, 'keyword').exec();
  await msg.reply.text(
    `微信自动回复关键字有：\n${_.map(keywords, r => `"${r.keyword}"`).join(' ')}`
  );
  return;
};

// 删除微信自动回复关键字
export const wechatRemoveKeyword: TextHandler = async msg => {
  const query = new CommandParser(msg.text);
  const keyword = query.getString(1);

  const result = await WechatReplyModel.deleteOne({ keyword }).exec();
  if (result.ok) {
    if (result.deletedCount) {
      await msg.reply.text('删除成功');
    } else {
      await msg.reply.text('关键字不存在');
    }
  } else {
    await msg.reply.text('未知错误，删除失败');
  }

  return;
};

// 获得微信API实时token
export const wechatGetToken: TextHandler = async msg => {
  msg.reply.text(await accessToken());
};
