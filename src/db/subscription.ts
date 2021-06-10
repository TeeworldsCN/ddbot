import { Document, Schema, model } from 'mongoose';

interface Subscription extends Document {
  name: string;
  channels: string[];
  last: number;
}

const schema = new Schema<Subscription>({
  name: { type: String, required: true },
  channels: { type: [String], default: [] },
});
schema.index({ name: 1 });

export const SubscriptionModel = model<Subscription>('Subscription', schema);
