import { BotInstance } from 'kaiheila-bot-root/dist/BotInstance';
import { TextMessage } from 'kaiheila-bot-root/dist/types/message/TextMessage';
import { Tools } from '../tools';

type TextHandler = (tools: Tools, bot: BotInstance, e: TextMessage) => Promise<void>;
