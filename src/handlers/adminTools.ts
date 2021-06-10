import { CommandParser } from '../utils/commandParser';
import { TextHandler } from '../bottype';
import {
  getUser,
  LEVEL_ADMIN,
  LEVEL_OPERATOR,
  LEVEL_TESTER,
  LEVEL_USER,
  UserModel,
} from '../db/user';
import { WechatReplyModel } from '../db/wechatReply';
import _ from 'lodash';
import { accessToken } from '../bots/wechat';

// export const subscribe: TextHandler = async msg => {
//   if (msg.sessionType == 'PERSON') return;
//   if (!msg.author.isAdmin) return;

//   const query = new CommandParser(msg.content);
//   const itemType = query.getRest(1);

//   if (itemType == 'map') {
//     msg.tools.db.set('map_channel', msg.channelId).write();
//     msg.reply.create('该频道将收到地图更新');
//   } else if (itemType == 'record') {
//     msg.tools.db.set('record_channel', msg.channelId).write();
//     msg.reply.create('该频道将收到记录更新');
//   }
// };

export const assign: TextHandler = async msg => {
  const user = await getUser(msg.userKey);
  if (user.level != 1) return;

  const query = new CommandParser(msg.content);
  const level = query.getNumber(1);
  const userKey = query.getRest(2);

  if (userKey == msg.userKey) {
    await msg.reply.text(`不能修改自己的权限`);
    return;
  }

  if (level >= LEVEL_ADMIN && level <= LEVEL_USER) {
    await UserModel.updateOne({ userKey }, { $set: { level } }, { upsert: true });
  }

  if (level == LEVEL_ADMIN) {
    await msg.reply.text(`已将 ${userKey} 设为超级管理员`);
  } else if (level == LEVEL_OPERATOR) {
    await msg.reply.text(`已将 ${userKey} 设为管理员`);
  } else if (level == LEVEL_TESTER) {
    await msg.reply.text(`已将 ${userKey} 设为测试员`);
  } else if (level == LEVEL_USER) {
    await msg.reply.text(`已将 ${userKey} 设为普通用户`);
  } else {
    await msg.reply.text(`${level} 不是个有效的等级`);
  }

  await msg.reply.delete();
};

export const nuke: TextHandler = async msg => {
  const user = await getUser(msg.userKey);
  if (user.level > LEVEL_ADMIN) return;

  const query = new CommandParser(msg.content);
  const userKey = query.getRest(1);

  if (userKey == msg.userKey) {
    await msg.reply.text(`不能删除自己的数据`);
    return;
  }

  const result = await UserModel.deleteMany({ userKey });

  if (result.deletedCount > 0) {
    await msg.reply.text(`成功删除该 ${userKey} 的绑定数据`);
  } else {
    await msg.reply.text(`未找到相关用户`);
  }

  await msg.reply.delete();
};

export const wechatSetKeyword: TextHandler = async msg => {
  const user = await getUser(msg.userKey);
  if (user.level > LEVEL_OPERATOR) return;

  const query = new CommandParser(msg.content);
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

export const wechatListKeywords: TextHandler = async msg => {
  const user = await getUser(msg.userKey);
  if (user.level > 2) return;

  const keywords = await WechatReplyModel.find({}, 'keyword').exec();
  await msg.reply.text(
    `微信自动回复关键字有：\n${_.map(keywords, r => `"${r.keyword}"`).join(' ')}`
  );
  return;
};

export const wechatRemoveKeyword: TextHandler = async msg => {
  const user = await getUser(msg.userKey);
  if (user.level > LEVEL_OPERATOR) return;

  const query = new CommandParser(msg.content);
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

export const wechatGetToken: TextHandler = async msg => {
  const user = await getUser(msg.userKey);
  if (user.level > LEVEL_ADMIN) return;

  msg.reply.text(await accessToken());
};
