import { BotInstance } from 'kaiheila-bot-root/dist/BotInstance';
import { ButtonClickEvent, TextMessage } from 'kaiheila-bot-root';
import { Tools } from '../tools';

type HandlerMessageType = 'text' | 'button' | 'system';

type TextHandler = (
  msg: Tools,
  bot: BotInstance,
  type: HandlerMessageType,
  raw: TextMessage | ButtonClickEvent
) => Promise<void>;

type ButtonHandler = (msg: Tools, bot: BotInstance, raw: ButtonClickEvent) => Promise<void>;
