import { Document, Schema, model } from 'mongoose';

// Level越高权限越低
export const LEVEL_ADMIN = 1;
export const LEVEL_OPERATOR = 2;
export const LEVEL_TESTER = 3;
export const LEVEL_USER = 4;

interface User extends Document {
  userKey: string;
  ddnetid: string;
  level?: number;
  token?: string;
  converseKey?: string;
  converseProgress?: number;
}

const schema = new Schema<User>({
  userKey: { type: String, required: true },
  level: { type: Number, default: 4 },
  token: { type: String },
  ddnetid: { type: String, required: true },
  converseKey: { type: String },
  converseProgress: { type: Number },
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
  const user = await UserModel.findOne({ userKey });
  if (!user) return null;
  if (!user.level) user.level = LEVEL_USER;
  return user;
};
