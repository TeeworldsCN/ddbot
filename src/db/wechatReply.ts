import { Document, Schema, model } from 'mongoose';

interface WechatReply extends Document {
  keyword: string;
  replyType: string;
  content: string;
}

const schema = new Schema<WechatReply>({
  keyword: { type: String, required: true },
  replyType: { type: String, required: true },
  content: { type: String, required: true },
});
schema.index({ keyword: 1 });

export const WechatReplyModel = model<WechatReply>('WechatReply', schema);
