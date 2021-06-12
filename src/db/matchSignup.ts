import { Document, Schema, model } from 'mongoose';
import crn from 'chinese-random-name';

interface MatchSignUp extends Document {
  userKey: string;
  ddnetid: string;
  teamName?: string;
  teamToken?: string;
  createdTeamToken?: string;
}

const schema = new Schema<MatchSignUp>({
  userKey: { type: String, required: true },
  ddnetid: { type: String, required: true },
  teamName: { type: String },
  teamToken: { type: String },
  createdTeamToken: { type: String },
});

schema.index({ userKey: 1 });
schema.index({ teamToken: 1 });
export const MatchSignUpModel = model<MatchSignUp>('MatchSignUp', schema);

// export const counterToToken = (count: number) => {
//   const first = count % 20;
//   const second = (first + Math.floor(count / 20)) % 20;

//   return `${TOKENS_PARTS[first][0]}${TOKENS_PARTS[second][1]}`;
// };

export const randomToken = async () => {
  const name = crn.names.get2();
  let tokenExists = await MatchSignUpModel.findOne({ teamToken: name }).exec();
  while (tokenExists) {
    tokenExists = await MatchSignUpModel.findOne({ teamToken: name }).exec();
  }
  return name;
};
