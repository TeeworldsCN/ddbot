import { TextHandler } from '../bottype';
import { WechatReplyModel } from '../db/wechatReply';

export const wechatAutoReplyCommand: TextHandler = async msg => {
  const content = msg.content.replace('.wxtestkw ', '');
  const autoReply = await WechatReplyModel.findOne({
    keyword: content,
  });

  if (autoReply) {
    if (autoReply.replyType == 'text') {
      await msg.reply.text(autoReply.content);
    } else if (autoReply.replyType == 'image') {
      await msg.reply.image(autoReply.content);
    }
  }
};
