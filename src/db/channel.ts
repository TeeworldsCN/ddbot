import { Document, Schema, model } from 'mongoose';
import { LEVEL_ADMIN, LEVEL_MANAGER, LEVEL_SUBADMIN, LEVEL_TESTER, LEVEL_USER } from './user';

export interface Channel extends Document {
  channelKey: string;

  /** 用户在频道激活指令至少需要拥有的权限 */
  minCommandLevel?: number;

  /** 用户在频道使用指令时给予的最低权限 */
  unlockedCommandLevel?: number;
}

const schema = new Schema<Channel>({
  channelKey: { type: String, required: true },
  minCommandLevel: { type: Number, default: LEVEL_USER },
  unlockedCommandLevel: { type: Number, default: LEVEL_USER },
});

schema.index({ channelKey: 1 });

export const ChannelModel = model<Channel>('Channel', schema);

export const getChannel = async (channelKey: string) => {
  const channelType = await ChannelModel.findOne({ channelKey }).exec();
  if (!channelType) return null;
  if (!channelType.minCommandLevel) channelType.minCommandLevel = LEVEL_USER;
  // 保证管理可以执行指令
  if (channelType.minCommandLevel < LEVEL_SUBADMIN) channelType.minCommandLevel = LEVEL_ADMIN;

  if (!channelType.unlockedCommandLevel) channelType.unlockedCommandLevel = LEVEL_USER;
  // 保证普通用户没有管理权限
  if (channelType.unlockedCommandLevel >= LEVEL_MANAGER) channelType.minCommandLevel = LEVEL_TESTER;
  return channelType;
};
