import { CommandParser } from '../utils/commandParser';
import { TextHandler } from '../bottype';
import {
  LEVEL_ADMIN,
  LEVEL_NAMES,
  LEVEL_OPERATOR,
  LEVEL_TESTER,
  LEVEL_USER,
  UserModel,
} from '../db/user';
import _ from 'lodash';
import { SubscriptionModel } from '../db/subscription';
import { clearRelayCache, getGateway, RelayModel } from '../db/relay';

export const subscribe: TextHandler = async msg => {
  if (msg.sessionType == 'DM') return;

  const query = new CommandParser(msg.command);
  const name = query.getString(1);
  const channel = query.getString(2) || msg.channelKey;
  const result = await SubscriptionModel.updateOne(
    { name },
    { $addToSet: { channels: channel } },
    { upsert: msg.userLevel <= LEVEL_OPERATOR }
  ).exec();
  if (result.ok) {
    if (channel == msg.channelKey) {
      await msg.reply.text(`成功在这里订阅"${name}"消息`);
    } else {
      await msg.reply.text(`成功在"${channel}"订阅"${name}"消息`);
    }
  } else {
    await msg.reply.text(`未知错误，订阅"${name}"失败`);
  }
};

export const listSub: TextHandler = async msg => {
  if (msg.sessionType == 'DM') return;

  const query = new CommandParser(msg.command);
  const name = query.getString(1);

  if (name) {
    const doc = await SubscriptionModel.findOne({ name }).exec();
    if (doc) {
      await msg.reply.text(`这些频道订阅了"${name}"：\n${doc.channels.join()}`);
    } else {
      await msg.reply.text(`"${name}"消息类型不存在`);
    }
  } else {
    const docs = (await SubscriptionModel.find({}, 'name').exec()) || [];
    await msg.reply.text(`可订阅的消息类型：\n${docs.map(s => s.name).join()}`);
  }
};

export const unsubscribe: TextHandler = async msg => {
  if (msg.sessionType == 'DM') return;

  const query = new CommandParser(msg.command);
  const name = query.getString(1);
  const destroy = msg.userLevel > LEVEL_OPERATOR ? '' : query.getString(2);

  if (destroy == 'all') {
    const result = await SubscriptionModel.deleteOne({ name }).exec();
    if (result.ok) {
      await msg.reply.text(`成功清空了"${name}"消息的所有订阅`);
    } else {
      await msg.reply.text(`操作失败`);
    }
  } else if (destroy) {
    const result = await SubscriptionModel.updateOne(
      { name },
      { $pull: { channels: destroy } }
    ).exec();
    if (result.ok) {
      await msg.reply.text(`成功取消订阅了"${destroy}"的"${name}"消息`);
    } else {
      await msg.reply.text(`未知错误，取消订阅"${name}"失败`);
    }
  } else {
    const result = await SubscriptionModel.updateOne(
      { name },
      { $pull: { channels: msg.channelKey } }
    ).exec();
    if (result.ok) {
      await msg.reply.text(`成功取消订阅了这里的"${name}"消息`);
    } else {
      await msg.reply.text(`未知错误，取消订阅"${name}"失败`);
    }
  }
};

// 订阅 Matterbridge Gateway
export const relay: TextHandler = async msg => {
  if (msg.sessionType == 'DM') return;

  const query = new CommandParser(msg.command);
  const gateway = query.getString(1);
  const channel = query.getString(2) || msg.channelKey;
  const result = await RelayModel.updateOne(
    { gateway },
    { $addToSet: { channels: channel } },
    { upsert: msg.userLevel <= LEVEL_OPERATOR }
  ).exec();
  if (result.ok) {
    if (channel == msg.channelKey) {
      await msg.reply.text(`成功将本频道桥接"${gateway}"的消息`);
    } else {
      await msg.reply.text(`成功将频道"${channel}"桥接"${gateway}"的消息`);
    }
  } else {
    await msg.reply.text(`未知错误，桥接"${gateway}"失败`);
  }

  clearRelayCache();
};

export const listRelay: TextHandler = async msg => {
  if (msg.sessionType == 'DM') return;

  const query = new CommandParser(msg.command);
  const gateway = query.getString(1);

  if (gateway) {
    clearRelayCache();
    const doc = await getGateway(gateway);
    if (doc) {
      await msg.reply.text(`这些频道桥接了"${gateway}"：\n${doc.channels.join()}`);
    } else {
      await msg.reply.text(`"${gateway}"桥接出口不存在`);
    }
  } else {
    const docs = (await RelayModel.find({}, 'name').exec()) || [];
    await msg.reply.text(`可订阅的消息类型：\n${docs.map(s => s.gateway).join()}`);
  }
};

export const unrelay: TextHandler = async msg => {
  if (msg.sessionType == 'DM') return;

  const query = new CommandParser(msg.command);
  const gateway = query.getString(1);
  const destroy = msg.userLevel > LEVEL_OPERATOR ? '' : query.getString(2);

  if (destroy == 'all') {
    const result = await RelayModel.deleteOne({ gateway }).exec();
    if (result.ok) {
      await msg.reply.text(`成功取消了"${gateway}"消息的所有桥接`);
    } else {
      await msg.reply.text(`操作失败`);
    }
  } else if (destroy) {
    const result = await RelayModel.updateOne({ gateway }, { $pull: { channels: destroy } }).exec();
    if (result.ok) {
      await msg.reply.text(`成功取消桥接了"${destroy}"的"${gateway}"消息`);
    } else {
      await msg.reply.text(`未知错误，取消桥接"${gateway}"失败`);
    }
  } else {
    const result = await RelayModel.updateOne(
      { name },
      { $pull: { channels: msg.channelKey } }
    ).exec();
    if (result.ok) {
      await msg.reply.text(`成功取消桥接了这里的"${gateway}"消息`);
    } else {
      await msg.reply.text(`未知错误，取消桥接"${gateway}"失败`);
    }
  }

  clearRelayCache();
};

// 设定管理权限 .assign level userKey
// userKey 使用 .me 获取
export const assign: TextHandler = async msg => {
  const query = new CommandParser(msg.command);
  const level = query.getNumber(1);
  const userKey = query.getRest(2);

  if (level == null) {
    await msg.reply.text(`level参数无效`);
    return;
  }

  if (userKey == msg.userKey) {
    await msg.reply.text(`不能修改自己的权限`);
    return;
  }

  if (level >= LEVEL_ADMIN && level <= LEVEL_USER) {
    await UserModel.updateOne({ userKey }, { $set: { level } }, { upsert: true });
  }

  await msg.reply.text(`已将 ${userKey} 设为 ${LEVEL_NAMES[level]}`);
};

// 撤回一个权限 .revoke level
export const revoke: TextHandler = async msg => {
  const query = new CommandParser(msg.command);
  const level = query.getNumber(1);

  if (level == LEVEL_ADMIN) {
    await msg.reply.text(`不能撤回超级管理权限`);
    return;
  }

  if (level > LEVEL_ADMIN && level <= LEVEL_TESTER) {
    const result = await UserModel.updateMany({ level }, { $set: { level: LEVEL_USER } });
    await msg.reply.text(`已撤回 ${result.nModified} 名 ${LEVEL_NAMES[level]}`);
    return;
  }

  await msg.reply.text(`${level} 不是个有效的等级`);
};

// 删除一个用户
export const nuke: TextHandler = async msg => {
  const query = new CommandParser(msg.command);
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
};
