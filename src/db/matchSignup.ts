import { Document, Schema, model } from 'mongoose';

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

const TOKENS_PARTS = [
  ['BAN', 'JO'],
  ['KA', 'ZOO'],
  ['KI', 'WI'],
  ['DIN', 'BO'],
  ['PO', 'WA'],
  ['TO', 'TO'],
  ['LA', 'VA'],
  ['SA', 'KE'],
  ['SU', 'MO'],
  ['KO', 'ZAN'],
  ['GE', 'MI'],
  ['YA', 'TA'],
  ['LO', 'FI'],
  ['PA', 'LA'],
  ['MEE', 'SEE'],
  ['PI', 'KA'],
  ['YO', 'DA'],
  ['MO', 'CA'],
  ['MA', 'YA'],
  ['HON', 'ZA'],
];
export const counterToToken = (count: number) => {
  const first = count % 20;
  const second = (first + Math.floor(count / 20)) % 20;

  return `${TOKENS_PARTS[first][0]}${TOKENS_PARTS[second][1]}`;
};
