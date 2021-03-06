import { ButtonHandler, TextHandler } from './handlers/bottype';
import { ddnetStatus } from './handlers/ddnetStatus';
import { points } from './handlers/points';
import { testButton, testText } from './handlers/test';

/*
    简单指令配置
 */

export const COMMANDS: { [key: string]: TextHandler } = {
  points: points,
  status: ddnetStatus,
  test: testText,
};

export const BUTTONS: { [key: string]: ButtonHandler } = {
  test: testButton,
};
