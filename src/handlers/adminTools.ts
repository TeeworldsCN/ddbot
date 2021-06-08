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

  await msg.reply.delete();

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
};

export const nuke: TextHandler = async msg => {
  const user = await getUser(msg.userKey);
  if (user.level != 1) return;

  await msg.reply.delete();

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
};
