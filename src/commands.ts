import { ButtonHandler, TextHandler } from './handlers/bottype';
import { ddnetStatus } from './handlers/ddnetStatus';
import { points } from './handlers/points';
import { subscribe } from './handlers/adminTools';
import { testButton, testText } from './handlers/test';
import { maps } from './handlers/maps';
import { bind } from './handlers/bind';
import { rank } from './handlers/rank';
import { top } from './handlers/top';

/*
    简单指令配置
 */

export const COMMANDS: { [key: string]: TextHandler } = {
  查分: points,
  查图: maps,
  绑定: bind,
  查记录: rank,
  查榜: top,
  points: points,
  map: maps,
  bind: bind,
  rank: rank,
  status: ddnetStatus,
  subscribe: subscribe,
  top: top,
};

export const BUTTONS: { [key: string]: ButtonHandler } = {};
