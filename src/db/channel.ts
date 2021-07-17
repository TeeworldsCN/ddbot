import { Document, Schema, model } from 'mongoose';
import { LEVEL_ADMIN, LEVEL_SUBADMIN, LEVEL_USER } from './user';

export interface Channel extends Document {
  channelKey: string;
  minCommandLevel?: number;
}

const schema = new Schema<Channel>({
  channelKey: { type: String, required: true },
  minCommandLevel: { type: Number, default: LEVEL_USER },
});

schema.index({ channelKey: 1 });

export const ChannelModel = model<Channel>('Channel', schema);

export const getChannel = async (channelKey: string) => {
  const channelType = await ChannelModel.findOne({ channelKey }).exec();
  if (!channelType) return null;
  if (!channelType.minCommandLevel) channelType.minCommandLevel = LEVEL_USER;
  // 保证管理可以执行指令
  if (channelType.minCommandLevel < LEVEL_SUBADMIN) channelType.minCommandLevel = LEVEL_ADMIN;
  return channelType;
};
