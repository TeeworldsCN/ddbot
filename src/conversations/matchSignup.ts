import { ConverseHandler } from '../bottype';

interface Context {
  name?: string;
}

export const matchSignup: ConverseHandler = async (msg, progress, context: Context) => {
  const isPositiveReply = () => {
    return msg.content.match(
      /([^不]|^)(是([^个吗]|$)|要([^不么麽个]|$)|恩|嗯|好|可([^别个|$])|行|ye)([^个]|$)/i
    );
  };

  const isNegativeReply = () => {
    return msg.content.match(/(不|别|否|no|na)/i);
  };

  const isCancelReply = () => {
    return msg.content.match(/(算了|取消)/i);
  };

  if (isCancelReply()) {
    msg.reply.text('知道了，那就先帮你取消报名了。若要再次开始报名。再次回复“报名”即可。');
    return -1;
  }

  switch (progress) {
    // 初始状态
    case 0:
      msg.reply.text(
        '欢迎参加「TWCN “重获新生” 2021年夏季比赛」的报名。\n\n只有团队冰冻献祭模式需要报名，合作竞速(DDrace)模式的参与方式请查看比赛通知的订阅号文章。\n\n请问是要继续报名FNG比赛吗？'
      );
      return 1;

    // 是否要继续报名
    case 1:
      if (isPositiveReply()) {
        if (msg.user?.ddnetid) {
          msg.reply.text(
            `了解！那现在开始帮您报名，若要取消报名流程，随时回复“取消”即可。\n请问你是要用"${msg.user.ddnetid}"这个ID报名吗？`
          );
          return 2;
        }
        msg.reply.text(
          `了解！那现在开始帮您报名，若要取消报名流程，随时回复“取消”即可。\n那能提供下你的游戏ID吗？`
        );
        return 3;
      }
      if (isNegativeReply()) {
        msg.reply.text(`好的，那就先不报名了。又想报名了的话，再次回复“报名”即可。`);
        return -1;
      }
      msg.reply.text(
        `额。。豆豆没明白，那我就先当作您不需要报名了。还是想报名的话，再次回复“报名”即可。`
      );
      return -1;

    // 确定要用ID报名吗
    case 2:
      if (isPositiveReply()) {
        msg.reply.text(`OK，那就帮你用"${msg.user.ddnetid}"这个ID报名了 [TS:目前只做到这里]`);
        return -1;
      }
      if (isNegativeReply()) {
        msg.reply.text(`不是的话，那请提供下你要报名的游戏ID。`);
        return 3;
      }
      msg.reply.text(`抱歉，豆豆没明白您的意思，是要用"${msg.user.ddnetid}"这个ID报名吗？`);
      return 2;

    // 请提供您的ID
    case 3:
      msg.reply.text(`好，以防您打错，再确认下是用"${msg.content}"这个名字报名吗？`);
      context.name = msg.content;
      return 4;

    // 确定要用你输入的ID报名吗
    case 4:
      if (!context.name) {
        msg.reply.text(
          `豆豆不太清楚发生了什么，为了防止报名出问题，暂时先取消了报名流程。想重新尝试报名的话，再次回复“报名”即可。`
        );
        return -1;
      }
      if (isPositiveReply()) {
        msg.reply.text(`OK，那就帮你用"${context.name}"这个ID报名了。[TS:目前只做到这里]`);
        return -1;
      }
      if (isNegativeReply()) {
        msg.reply.text(`不是的话，那重新告诉下我您的ID吧。`);
        return 3;
      }
      msg.reply.text(
        `豆豆没明白你的意思。请问你是要用"${context.name}"这个ID报名吗？是的话回复“是”，不是的话回复“不是”。`
      );
      return 4;
  }
  return -1;
};
