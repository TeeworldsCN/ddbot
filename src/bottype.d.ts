import { BotInstance } from 'kaiheila-bot-root/dist/BotInstance';
import { ButtonClickEvent, TextMessage } from 'kaiheila-bot-root';
import { GenericMessage } from './bots/reply';

type HandlerMessageType = 'text' | 'button' | 'system';

type TextHandler = (msg: GenericMessage, type: HandlerMessageType) => Promise<void>;
type ButtonHandler = (msg: GenericMessage) => Promise<void>;
