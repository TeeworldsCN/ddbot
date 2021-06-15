import { Document, Schema, model } from 'mongoose';

interface MatchSignUp extends Document {
  userKey: string;
  ddnetid: string;
  entryToken: string;
  registered: boolean;
  teamToken?: string;
  createdTeamName?: string;
  createdTeamToken?: string;
  teamCreator?: Partial<MatchSignUp>;
}

const schema = new Schema<MatchSignUp>({
  userKey: { type: String, required: true },
  ddnetid: { type: String, required: true },
  entryToken: { type: String, required: true },
  registered: { type: Boolean, required: true },
  teamToken: { type: String },
  createdTeamName: { type: String },
  createdTeamToken: { type: String },
});

schema.index({ userKey: 1 });
schema.index({ entryToken: 1 });
schema.index({ createdTeamToken: 1 });
schema.virtual('teamCreator', {
  ref: 'MatchSignUp',
  localField: 'teamToken',
  foreignField: 'createdTeamToken',
  justOne: true,
});

export const MatchSignUpModel = model<MatchSignUp>('MatchSignUp', schema);
