import axios from 'axios';
import { ConverseHandler } from '../bottype';

export const messageDumper: ConverseHandler = async (msg, progress) => {
  switch (progress) {
    case 0:
      msg.reply.text('请发送要解析的消息');
      return 1;
    case 1:
      try {
        const result = await axios.post('http://paste.pr0.tips/', JSON.stringify(msg.raw));
        msg.reply.text(result.data);
      } catch (e) {
        msg.reply.text('消息paste失败，可能是消息太大了');
      }
      return -1;
  }
};
