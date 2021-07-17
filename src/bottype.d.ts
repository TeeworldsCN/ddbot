import { BotInstance } from 'kaiheila-bot-root/dist/BotInstance';
import { ButtonClickEvent, TextMessage } from 'kaiheila-bot-root';
import { GenericMessage } from './bots/base';
import { RelayMessage } from './relay';

export type HandlerMessageType = 'text' | 'button' | 'system';

export type GlobalCommandHandler = (msg: RelayMessage) => Promise<void>;
export type TextHandler = (msg: GenericMessage<any>) => Promise<void>;
export type ButtonHandler = (msg: GenericMessage<any>) => Promise<void>;
export type ConverseHandler = <T>(
  msg: GenericMessage<any>,
  progress: number,
  context: T
) => Promise<number>;
