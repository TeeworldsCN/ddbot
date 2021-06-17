import { Document, Schema, model } from 'mongoose';

// Level越高权限越低
export const LEVEL_ADMIN = 1;
export const LEVEL_OPERATOR = 2;
export const LEVEL_MANAGER = 3;
export const LEVEL_TESTER = 9;
export const LEVEL_USER = 10;
export const LEVEL_NAMES: { [key: number]: string } = {
  1: '超级管理员',
  2: '机器人管理',
  3: '管理员',
  9: '测试员',
  10: '用户',
};

export interface User extends Document {
  userKey: string;
  ddnetid: string;
  level?: number;
  token?: string;
  converseKey?: string;
  converseProgress?: number;
  converseContext?: string;
}

const schema = new Schema<User>({
  userKey: { type: String, required: true },
  level: { type: Number, default: 10 },
  token: { type: String },
  ddnetid: { type: String },
  converseKey: { type: String },
  converseProgress: { type: Number },
  converseContext: { type: String },
});

schema.index({ userKey: 1 });
schema.index({ ddnetid: 1 });

export const UserModel = model<User>('User', schema);

export const initAdmins = async () => {
  if (!process.env.BOT_ADMIN_USERS) return;

  const ADMIN_USERS = process.env.BOT_ADMIN_USERS.split(',');
  for (const userKey of ADMIN_USERS) {
    await UserModel.updateOne({ userKey }, { $set: { level: LEVEL_ADMIN } }, { upsert: true });
  }
};

export const getUser = async (userKey: string) => {
  const user = await UserModel.findOne({ userKey }).exec();
  if (!user) return null;
  if (!user.level) user.level = LEVEL_USER;
  return user;
};
