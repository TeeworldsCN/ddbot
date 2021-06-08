import { Document, Schema, model } from 'mongoose';

// Level越高权限越低
export const LEVEL_ADMIN = 1;
export const LEVEL_OPERATOR = 2;
export const LEVEL_TESTER = 3;

interface User extends Document {
  chatid: string;
  level: number;
  token: string;
  ddnetid: string;
}

const schema = new Schema<User>({
  chatid: { type: String, required: true },
  level: { type: Number },
  token: { type: String },
  ddnetid: { type: String, required: true },
});

schema.index({ chatid: 1 });
schema.index({ ddnetid: 1 });

export const UserModel = model<User>('User', schema);

export const initAdmins = async () => {
  if (!process.env.BOT_ADMIN_USERS) return;

  const ADMIN_USERS = process.env.BOT_ADMIN_USERS.split(',');
  for (const chatid of ADMIN_USERS) {
    await UserModel.updateOne({ chatid }, { $set: { level: LEVEL_ADMIN } }, { upsert: true });
  }
};
