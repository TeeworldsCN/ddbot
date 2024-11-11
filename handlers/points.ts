import { SendReply } from '../handler.ts';

export const handlePoints = async (reply: SendReply, _command: string, args: string) => {
  const res = await fetch(`https://ddnet.org/players/?json2=${encodeURIComponent(args)}`);
  if (!res.ok) {
    reply.text('获取用户信息失败');
    return;
  }

  const data = await res.json();
  reply.text(`${data.player} - ${data.points.total} Points`);
  return;
};
