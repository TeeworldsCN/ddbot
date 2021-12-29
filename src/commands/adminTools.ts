import { CommandParser } from '../utils/commandParser';
import { TextHandler } from '../bottype';
import {
  levelOf,
  LEVEL_ADMIN,
  LEVEL_NAMES,
  LEVEL_SUBADMIN,
  LEVEL_USER,
  UserModel,
} from '../db/user';
import _ from 'lodash';
import { SubscriptionModel } from '../db/subscription';
import { clearRelayCache, getGateway, RelayModel } from '../db/relay';
import { unpackID } from '../utils/helpers';
import { OICQBotAdapter } from '../bots/oicq';
import { ChannelModel } from '../db/channel';

export const subscribe: TextHandler = async msg => {
  if (msg.sessionType == 'DM') return;

  const query = new CommandParser(msg.command);
  const name = query.getString(1);
  const channel = query.getString(2) || msg.channelKey;

  if (name == null) return;

  const result = await SubscriptionModel.updateOne(
    { name },
    { $addToSet: { channels: channel } },
    { upsert: msg.effectiveUserLevel <= LEVEL_SUBADMIN }
  ).exec();
  if (result.acknowledged) {
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
  const destroy = msg.effectiveUserLevel > LEVEL_SUBADMIN ? '' : query.getString(2);

  if (name == null) return;

  if (destroy == 'all') {
    const result = await SubscriptionModel.deleteOne({ name }).exec();
    if (result.acknowledged) {
      await msg.reply.text(`成功清空了"${name}"消息的所有订阅`);
    } else {
      await msg.reply.text(`操作失败`);
    }
  } else if (destroy) {
    const result = await SubscriptionModel.updateOne(
      { name },
      { $pull: { channels: destroy } }
    ).exec();
    if (result.acknowledged) {
      await msg.reply.text(`成功取消订阅了"${destroy}"的"${name}"消息`);
    } else {
      await msg.reply.text(`未知错误，取消订阅"${name}"失败`);
    }
  } else {
    const result = await SubscriptionModel.updateOne(
      { name },
      { $pull: { channels: msg.channelKey } }
    ).exec();
    if (result.acknowledged) {
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

  if (gateway == null) return;

  const result = await RelayModel.updateOne(
    { gateway },
    { $addToSet: { channels: channel } },
    { upsert: msg.effectiveUserLevel <= LEVEL_SUBADMIN }
  ).exec();
  if (result.acknowledged) {
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
    const docs = (await RelayModel.find({}, 'gateway').exec()) || [];
    await msg.reply.text(`可订阅的消息类型：\n${docs.map(s => s.gateway).join()}`);
  }
};

export const unrelay: TextHandler = async msg => {
  if (msg.sessionType == 'DM') return;

  const query = new CommandParser(msg.command);
  const gateway = query.getString(1);
  const destroy = msg.effectiveUserLevel > LEVEL_SUBADMIN ? '' : query.getString(2);

  if (gateway == null) return;

  if (destroy == 'all') {
    const result = await RelayModel.deleteOne({ gateway }).exec();
    if (result.acknowledged) {
      await msg.reply.text(`成功取消了"${gateway}"消息的所有桥接`);
    } else {
      await msg.reply.text(`操作失败`);
    }
  } else if (destroy) {
    const result = await RelayModel.updateOne({ gateway }, { $pull: { channels: destroy } }).exec();
    if (result.acknowledged) {
      await msg.reply.text(`成功取消桥接了"${destroy}"的"${gateway}"消息`);
    } else {
      await msg.reply.text(`未知错误，取消桥接"${gateway}"失败`);
    }
  } else {
    const result = await RelayModel.updateOne(
      { gateway },
      { $pull: { channels: msg.channelKey } }
    ).exec();
    if (result.acknowledged) {
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
  const level = levelOf(query.getString(1));
  const userKey = query.getRest(2);

  if (level == null) {
    await msg.reply.text(`level参数无效`);
    return;
  }

  if (userKey == msg.userKey) {
    await msg.reply.text(`不能修改自己的权限`);
    return;
  }

  if (level >= LEVEL_ADMIN) {
    await UserModel.updateOne({ userKey }, { $set: { level } }, { upsert: true });
  }

  await msg.reply.text(
    `已将 ${userKey} 设为 ${LEVEL_NAMES[level] ? LEVEL_NAMES[level] : `${level}级用户`}`
  );
};

// 设置频道指令使用权限 .channelLevel level [channelKey]
export const channelLevel: TextHandler = async msg => {
  const query = new CommandParser(msg.command);
  const level = levelOf(query.getString(1));
  const channelKey = query.getRest(2) || msg.channelKey;

  if (level == null) {
    await msg.reply.text(`level参数无效`);
    return;
  }

  if (level >= LEVEL_ADMIN) {
    await ChannelModel.updateOne(
      { channelKey },
      { $set: { minCommandLevel: level } },
      { upsert: true }
    );
  }

  await msg.reply.text(
    `已将 ${channelKey} 指令使用权设置为 ${
      LEVEL_NAMES[level] ? LEVEL_NAMES[level] : `${level}级用户`
    } 以上`
  );
};

// 列举一个权限的用户
export const listUser: TextHandler = async msg => {
  const query = new CommandParser(msg.command);
  const level = levelOf(query.getString(1));

  if (level == LEVEL_USER) {
    await msg.reply.text(`怕是人太多，还是不要查询普通用户了`);
    return;
  }

  const result = await UserModel.find({ level }).exec();
  await msg.reply.text(result.map(user => user.userKey).join(', '));
};

// 撤回一个权限 .revoke level
export const revoke: TextHandler = async msg => {
  const query = new CommandParser(msg.command);
  const level = levelOf(query.getString(1));

  if (level == LEVEL_ADMIN) {
    await msg.reply.text(`不能撤回超级管理权限`);
    return;
  }

  if (level > LEVEL_ADMIN) {
    const result = await UserModel.updateMany({ level }, { $set: { level: LEVEL_USER } });
    await msg.reply.text(
      `已撤回 ${result.modifiedCount} 名${
        LEVEL_NAMES[level] ? LEVEL_NAMES[level] : `${level}级用户`
      }`
    );
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

// QQ：退群
export const begone: TextHandler = async msg => {
  if (msg.content?.[0].type != 'mention') return;
  if (msg.platform != 'oicq') return;
  if (unpackID(msg.content[0].userKey).id != process.env.OICQ_ACCOUNT) return;

  const bot: OICQBotAdapter = msg.bot;
  await bot.instance.setGroupLeave(parseInt(msg.channelId));
};
