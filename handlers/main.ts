// Main handler.
import type { Handler } from '../handler.ts';
import { handlePoints } from './points.ts';

export const mainHandler: Handler = async (reply, msg, mode) => {
  msg = msg.trim();
  let command = msg;

  const firstSpace = msg.indexOf(' ');
  if (firstSpace >= 0) {
    if (command.startsWith('/')) {
      command = command.slice(1, firstSpace);
    } else {
      command = command.slice(0, firstSpace);
    }
  }

  const args = msg.slice(firstSpace + 1);

  // TODO: Design a better handler for this
  if (command === '分数' || command === 'points') {
    await handlePoints(reply, command, args);
  } else if (command === '地图') {
    reply.text('抱歉，地图查询功能正在维护中，请关注群公告了解维护状态。');
  } else if (mode === 'DIRECT') {
    reply.text(
      'Hi, 目前豆豆可以提供以下查询功能：\n - 分数 <玩家名> - 查询分数\n - 地图 <地图名> - 查询地图'
    );
  }
};
