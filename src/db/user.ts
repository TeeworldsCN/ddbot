import { Document, Schema, model } from 'mongoose';

// Level越高权限越低
export const LEVEL_ADMIN = 1;
export const LEVEL_SUBADMIN = 2;
export const LEVEL_OPERATOR = 3;
export const LEVEL_MODS = 4;
export const LEVEL_MANAGER = 5;
export const LEVEL_TESTER = 9;
export const LEVEL_USER = 10;
export const LEVEL_IGNORE = 11;
export const LEVEL_NORELAY = 12;
export const LEVEL_NAMES: { [key: number]: string } = {
  1: '机器人主人',
  2: '超级管理员',
  3: '机器人管理',
  4: '服务器管理',
  5: '群管理员',
  9: '测试员',
  10: '用户',
  11: '禁用指令用户',
  12: '禁用转发用户',
};

export const LEVEL_KEY: { [key: string]: number } = {
  admin: 1,
  subadmin: 2,
  operator: 3,
  mods: 4,
  manager: 5,
  tester: 9,
  user: 10,
  ignore: 11,
  norelay: 12,
};

export const levelOf = (level: number | string, def?: number): number => {
  if (typeof level === 'string') {
    return LEVEL_KEY[level] || parseInt(level) || def;
  } else if (typeof level === 'number') {
    return level;
  }
  return def;
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
