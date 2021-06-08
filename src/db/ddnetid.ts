import { Document, Schema, model } from 'mongoose';

interface DDNetID extends Document {
  chatid: string;
  ddnetid: string;
}

const schema = new Schema<DDNetID>({
  chatid: { type: String, required: true },
  ddnetid: { type: String, required: true },
});

schema.index({ chatid: 1 });
schema.index({ ddnetid: 1 });

export const DDNetIDModel = model<DDNetID>('DDNetID', schema);
