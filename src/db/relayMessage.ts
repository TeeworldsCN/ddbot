// FIXME: 开黑啦不支持监听消息修改和删除的事件

// import { Document, Schema, model } from 'mongoose';

// interface RelayMessage extends Document {
//   messages: {
//     msgId: string;
//     channel: string;
//   }[];
//   timestamp: Date;
// }

// const schema = new Schema<RelayMessage>({
//   messages: {
//     type: [
//       {
//         msgId: { type: String },
//         channel: { type: String },
//       },
//     ],
//     default: [],
//   },
//   timestamp: { type: Date },
// });
// schema.index({ 'messages.msgId': 1 });
// schema.index({ timestamp: 1 }, { expireAfterSeconds: 30 });

// export const RelayMessageModel = model<RelayMessage>('RelayMessage', schema);

// export const createMsg = async (channel: string, msgId: string) => {
//   await RelayMessageModel.create({ messages: [{ msgId, channel }], timestamp: Date.now() });
// };

// export const markMsg = async (baseMessage: string, channel: string, msgId: string) => {
//   await RelayMessageModel.updateOne(
//     { 'messages.msgId': baseMessage },
//     { $addToSet: { messages: { msgId, channel } } }
//   );
// };

// export const getMsg = async (msgId: string) => {
//   return await RelayMessageModel.findOne({ 'messages.msgId': msgId });
// };
