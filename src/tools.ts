import { BotInstance } from 'kaiheila-bot-root/dist/BotInstance';
import { TextMessage } from 'kaiheila-bot-root/dist/types/message/TextMessage';
import { MessageType } from 'kaiheila-bot-root/dist/types/MessageType';

export type Tools = ReturnType<typeof getTools>;
const tools = {};

export const initTools = () => {};

export const getTools = (bot: BotInstance, e: TextMessage) => {
  if (e.channelType == 'PERSON') {
    return {
      reply: {
        create: (type: MessageType, content: string, quote?: string, tempTargetId?: string) =>
          bot.API.directMessage.create(type, e.authorId, undefined, content, quote),
        update: (msgId: string, content: string, quote?: string) =>
          bot.API.directMessage.update(msgId, content, quote),
        delete: (msgId: string) => bot.API.directMessage.delete(msgId),
        addReaction: (msgId: string, emoji: string[]) =>
          bot.API.directMessage.addReaction(msgId, emoji.length > 1 ? emoji[1] : emoji[0]),
        deleteReaction: (msgId: string, emoji: string[], userId?: string) =>
          bot.API.directMessage.deleteReaction(
            msgId,
            emoji.length > 1 ? emoji[1] : emoji[0],
            undefined
          ),
      },
      ...tools,
    };
  } else {
    return {
      reply: {
        create: (type: MessageType, content: string, quote?: string, tempTargetId?: string) =>
          bot.API.message.create(type, e.channelId, content, quote, tempTargetId),
        update: (msgId: string, content: string, quote?: string) =>
          bot.API.message.update(msgId, content, quote),
        delete: (msgId: string) => bot.API.message.delete(msgId),
        addReaction: (msgId: string, emoji: string[]) =>
          bot.API.message.addReaction(msgId, emoji[0]),
        deleteReaction: (msgId: string, emoji: string[], userId?: string) =>
          bot.API.message.deleteReaction(msgId, emoji[0], userId),
      },
      ...tools,
    };
  }
};
