import { ConverseHandler } from '../bottype';

interface Context {
  name?: string;
}

export const matchSignup: ConverseHandler = async (msg, progress, context: Context) => {
  const isPositiveReply = () => {
    return msg.content.match(
      /([^不]|^)(是([^个吗]|$)|要([^不么麽个]|$)|恩([^?？]|$)|嗯([^?？]|$)|好|可([^别个]|$)|行|ye)([^个]|$)/i
    );
  };

  const isNegativeReply = () => {
    return msg.content.match(/(没|不|别|否|no|na)/i);
  };

  const isCancelReply = () => {
    return msg.content.match(/(算了|取消|等会|待会|一会|再说)/i);
  };

  const isConfusionReply = () => {
    return msg.content.match(/(恩[?？]|嗯[?？]|额|什|啥|没[懂明]|哈[?？])/i);
  };

  const isTeamedReply = () => {
    return msg.content.match(/[^没]有/i);
  };

  const isPersonalReply = () => {
    return msg.content.match(/没|个|人|随|机|帮|自|己/i);
  };

  if (isCancelReply()) {
    msg.reply.text('知道了，那就先帮你取消报名了。若要再次开始报名。再次回复“报名”即可。');
    return -1;
  }

  switch (progress) {
    // 初始状态
    case 0:
      msg.reply.text(
        '欢迎参加「TWCN “重获新生” 2021年夏季比赛」的报名。\n\n只有团队冰冻献祭模式需要报名，合作竞速(DDrace)模式的参与方式请查看比赛通知的订阅号文章。\n\nFNG比赛会在7月24日下午2点开始，为了方便管理和通知，比赛要求所有参赛玩家在2点钟进入比赛服务器就位，并全程观战。所有对局大约会在四个小时内完成。请问是要继续报名FNG比赛吗？'
      );
      return 1;

    // 是否要继续报名
    case 1:
      if (isPositiveReply()) {
        if (msg.user?.ddnetid) {
          msg.reply.text(
            `了解！那现在开始帮你报名，若要取消报名流程，随时回复“取消”即可。\n请问你是要用"${msg.user.ddnetid}"这个ID报名吗？`
          );
          return 2;
        }
        msg.reply.text(
          `了解！那现在开始帮你报名，若要取消报名流程，随时回复“取消”即可。\n那能提供下你的游戏ID吗？`
        );
        return 3;
      }
      if (isNegativeReply()) {
        msg.reply.text(`好的，那就先不报名了。又想报名了的话，再次回复“报名”即可。`);
        return -1;
      }
      if (isConfusionReply()) {
        msg.reply.text(
          `[发呆]豆豆想知道你是不是要报名FNG比赛，是的话回复“是”，不是的话回复“不是”。`
        );
        return 1;
      }
      msg.reply.text(
        `额。。豆豆没明白，那我就先当作你不需要报名了。还是想报名的话，再次回复“报名”即可。`
      );
      return -1;

    // 确定要用ID报名吗
    case 2:
      if (isPositiveReply()) {
        msg.reply.text(
          `OK，那就帮你用"${msg.user.ddnetid}"这个ID报名。\n请问你已经有队友了吗？还是想要以个人名义报名让我们来随机帮你找队伍？`
        );
        return 5;
      }
      if (isNegativeReply()) {
        msg.reply.text(`不是的话，那请提供下你要报名的游戏ID。`);
        return 3;
      }
      msg.reply.text(
        `抱歉，豆豆没明白你的意思，是要用"${msg.user.ddnetid}"这个ID报名吗？是的话回复“是”，不是的话回复“不是”。`
      );
      return 2;

    // 请提供你的ID
    case 3:
      msg.reply.text(`好，以防你打错，再确认下是用"${msg.content}"这个名字报名吗？`);
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
        msg.reply.text(
          `OK，那就帮你用"${context.name}"这个ID报名了。\n那请问你已经有队友了吗？还是想要以个人名义报名让我们来随机帮你找队伍？`
        );
        return 5;
      }
      if (isNegativeReply()) {
        msg.reply.text(`不是的话，那重新告诉下我你的ID吧。`);
        return 3;
      }
      msg.reply.text(
        `豆豆没明白你的意思。请问你是要用"${context.name}"这个ID报名吗？是的话回复“是”，不是的话回复“不是”。`
      );
      return 4;

    // 有队友吗
    case 5:
      if (isTeamedReply()) {
        msg.reply.text(
          `好的[机智]，你是队长吗？如果不是队长的话，你的队长应该有发给你一个队伍代号。不太确定的话建议先跟队友确认下。`
        );
        return 6;
      }
      if (isPersonalReply()) {
        // TODO: 生成验证代码。
        msg.reply.text(
          `[好的] OK了，那就已经帮你报上名了，最后的分组和比赛服务器会在7月19日通过微信订阅号的文章公布。\n你的参赛码是: MV23MCI\n\n比赛会在7月24日下午2点开始，请到时准备好参赛码进入比赛服务器就位。迟到10分钟将视为弃赛。`
        );
        return -1;
      }
      msg.reply.text(
        `[天啊]豆豆没明白你的意思。如果有队友的话请回复“有”，个人名义报名的话请回复“没有”`
      );
      return 5;

    // 是队长吗
    case 6:
      if (isPositiveReply()) {
        msg.reply.text(`了解了，那能不能提供下你的队伍名？`);
        return 7;
      }
  }
  return -1;
};
