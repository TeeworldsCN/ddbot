import { Document, Schema, model } from 'mongoose';

interface Relay extends Document {
  gateway: string;
  channels: string[];
}

const schema = new Schema<Relay>({
  gateway: { type: String, required: true },
  channels: { type: [String], default: [] },
});
schema.index({ gateway: 1 });

export const RelayModel = model<Relay>('Relay', schema);

const cache: any = {};
export const getRelay = async (gateway: string) => {
  if (cache[gateway]) {
    return cache[gateway];
  }
  cache[gateway] = await RelayModel.findOne({ gateway }).exec();
  return cache[gateway];
};

export const clearRelayCache = (gateway?: string) => {
  if (gateway) {
    delete cache[gateway];
    return;
  }

  for (const n in cache) {
    delete cache[n];
  }
};
