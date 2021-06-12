import { BotInstance } from 'kaiheila-bot-root/dist/BotInstance';
import { ButtonClickEvent, TextMessage } from 'kaiheila-bot-root';
import { GenericMessage } from './bots/base';

type HandlerMessageType = 'text' | 'button' | 'system';

type TextHandler = (msg: GenericMessage<any>) => Promise<void>;
type ButtonHandler = (msg: GenericMessage<any>) => Promise<void>;
type ConverseHandler = <T>(
  msg: GenericMessage<any>,
  progress: number,
  context: T
) => Promise<number>;
