import { Document, Schema, model } from 'mongoose';
import _ from 'lodash';

interface Relay extends Document {
  gateway: string;
  channels: string[];
}

const schema = new Schema<Relay>({
  gateway: { type: String, required: true },
  channels: { type: [String], default: [] },
});
schema.index({ gateway: 1 });
schema.index({ channels: 1 });

export const RelayModel = model<Relay>('Relay', schema);

const cacheG2C: { [key: string]: Relay } = {};
const cacheC2G: { [key: string]: Relay } = {};

export const getGateway = async (gateway: string) => {
  if (cacheG2C[gateway]) {
    return cacheG2C[gateway];
  }
  const relay = await RelayModel.findOne({ gateway }).exec();
  if (relay == null) cacheG2C[gateway] = null;
  else {
    for (const channel of relay.channels) {
      cacheC2G[channel] = relay;
    }
    cacheG2C[gateway] = relay;
  }
  return cacheG2C[gateway];
};

export const getRelay = async (channelKey: string) => {
  if (cacheC2G[channelKey]) {
    return cacheC2G[channelKey];
  }
  const relay = await RelayModel.findOne({ channels: { $elemMatch: { $eq: channelKey } } }).exec();
  if (relay == null) cacheC2G[channelKey] = null;
  else {
    for (const channel of relay.channels) {
      cacheC2G[channel] = relay;
    }
    cacheG2C[relay.gateway] = relay;
  }
  return cacheC2G[channelKey];
};

export const clearRelayCache = () => {
  for (const n in cacheG2C) {
    delete cacheG2C[n];
  }

  for (const n in cacheC2G) {
    delete cacheC2G[n];
  }
};
