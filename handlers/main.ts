// Main handler.
import type { Handler } from '../handler.ts';

export const mainHandler: Handler = async (reply, msg, user) => {
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

  reply.text('Hi, 豆豆还在建设中。建设完成后会在群里通知。');
};
