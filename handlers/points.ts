import { SendReply } from '../handler.ts';

export const handlePoints = async (reply: SendReply, _command: string, args: string) => {
  if (!args) {
    reply.text('请在指令中提供玩家名称。例如："分数 nameless tee"');
    return;
  }

  const res = await fetch(`https://ddnet.org/players/?json2=${encodeURIComponent(args)}`);
  if (!res.ok) {
    reply.text('获取用户信息失败');
    return;
  }

  const data = await res.json();
  if (!data.player) {
    reply.text('未找到玩家信息');
    return;
  }

  reply.text(`${data.player} - ${data.points.points} Points`);
  return;
};
