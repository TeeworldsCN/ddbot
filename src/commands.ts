import { TextHandler } from './handlers/bottype';
import { points } from './handlers/points';

/*
    简单指令配置
 */

export const COMMANDS: { [key: string]: TextHandler } = {
  points: points,
};
