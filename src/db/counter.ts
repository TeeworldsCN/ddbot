import { Document, Schema, model } from 'mongoose';

interface Counter extends Document {
  key: string;
  count: number;
}

const schema = new Schema<Counter>({
  key: { type: String, required: true },
  count: { type: Number, required: true },
});

schema.index({ key: 1 });

export const CounterModel = model<Counter>('Counter', schema);

export const getCounter = async (key: string) => {
  const doc = await CounterModel.findOne({ key }).exec();
  if (doc) return doc.count;
  return 0;
};

export const incCounter = async (key: string) => {
  const result = await CounterModel.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
    },
    { upsert: true }
  ).exec();

  if (result) return result.count;
  return 0;
};
