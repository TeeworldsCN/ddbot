import { ConverseHandler } from '../bottype';
import Hashids from 'hashids/cjs';
import { incCounter } from '../db/counter';
import { MatchSignUpModel } from '../db/matchSignup';
import truncate from 'truncate-utf8-bytes';
import { DateTime } from 'luxon';
import { LEVEL_TESTER } from '../db/user';

interface Context {
  name?: string;
  teamName?: string;
  teamToken?: string;
}

export const generateEntryToken = async () => {
  const hashids = new Hashids(
    process.env.WECHAT_TOKEN + 'matchid',
    4,
    'ABCDEFGHJKLMNPQRSTUVWXYZ1234567890'
  );
  const id = await incCounter('matchid');
  return hashids.encode(id);
};

export const generateTeamToken = async () => {
  const hashids = new Hashids(
    process.env.WECHAT_TOKEN + 'matchteamid',
    3,
    '涛昌进林有坚和彪博诚先敬震振壮会群豪心邦承乐绍功松善厚庆磊民友裕河哲江超浩亮政谦亨奇固之轮翰朗伯宏言若鸣朋斌梁栋维启克伦翔旭鹏泽晨辰士以建家致树炎德行时泰盛雄冠策腾伟刚勇毅俊峰强军平保东文辉力明永健世广志义兴良海山仁波宁贵福生龙元全国胜学祥才发成康星光天达安岩中茂武新利清飞彬富顺信子杰楠榕风航弘嘉琼桂叶璧璐娅琦晶妍茜秋珊莎锦黛青倩婷婉娴瑾颖露瑶怡婵雁仪荷丹蓉眉君琴蕊薇菁梦岚苑婕馨瑗韵融园艺咏卿聪澜纯毓悦昭冰爽羽希宁欣飘育滢柔竹凝晓欢霄枫芸菲寒伊亚宜可姬舒影荔枝思丽秀娟英华慧巧美娜静淑惠珠翠雅芝玉萍红娥玲芬芳燕彩春菊勤珍贞莉兰凤洁梅琳素云莲真环雪荣爱妹霞香月莺媛艳瑞凡佳'
  );
  const id = await incCounter('matchteamid');
  return hashids.encode(id);
};

export const findTeamCreator = async (teamToken: string) => {
  return await MatchSignUpModel.findOne({ createdTeamToken: teamToken }).exec();
};

export const findTeam = async (teamToken: string) => {
  return await MatchSignUpModel.find({ teamToken: teamToken, registered: true }).exec();
};

export const matchSignup: ConverseHandler = async (msg, progress, context: Context) => {
  if (
    DateTime.now() < DateTime.fromISO('2021-06-20T00:00:00+0800') &&
    msg.userLevel > LEVEL_TESTER
  ) {
    msg.reply.text('报名还没有开始，请在6月20号0点之后再次尝试[擦汗]');
    return -1;
  }

  if (
    DateTime.now() < DateTime.fromISO('2021-06-20T00:00:00+0800') &&
    msg.userLevel > LEVEL_TESTER
  ) {
    msg.reply.text('报名还没有开始，请在6月20号之后重试【报名取消】');
  }
  const isPositiveReply = () => {
    return msg.content.match(
      /([^不]|^)(是([^个吗]|$)|要([^不么麽个]|$)|恩([^?？]|$)|嗯([^?？]|$)|好|可([^别个]|$)|行|ye|^y$)([^个]|$)/i
    );
  };

  const isSignupReply = () => {
    return msg.content.match(/([^不]|^)报/i);
  };

  const isNegativeReply = () => {
    return msg.content.match(/(没|不|别|否|no|na|^n$)/i);
  };

  const isCancelReply = () => {
    return msg.content.match(/(算了|取消|等会|待会|一会|再说)/i);
  };

  const isConfusionReply = () => {
    return msg.content.match(/(恩|嗯|额|什|啥|没[懂明]|\?|？)/i);
  };

  const isTeamedReply = () => {
    return msg.content.match(/([^没]|^)有/i);
  };

  const isPersonalReply = () => {
    return msg.content.match(/没|个|人|随|机|帮|自|己/i);
  };

  const isRegretReply = () => {
    return msg.content.match(/错|改|不对|换/i);
  };

  const MATCHINFO =
    '请保留好参赛码，不要泄露给他人！\n比赛会在7月24日下午1点30分开始，请到时准备好参赛码进入比赛服务器就位。迟到20分钟将视为弃赛。\n再次发送“报名”可查看你的报名信息。\n若要修改你的报名信息或取消报名，请发邮件联系event@teeworlds.cn【报名完成】';

  const signedUp = await MatchSignUpModel.findOne({ userKey: msg.userKey })
    .populate('teamCreator')
    .exec();

  if (isCancelReply()) {
    if (signedUp) {
      msg.reply.text('好的，豆豆祝你比赛顺利。');
    } else {
      msg.reply.text(
        '知道了，那就先帮你取消报名了。若要再次开始报名。再次回复“报名”即可。【报名取消】'
      );
    }
    return -1;
  }

  switch (progress) {
    // 初始状态
    case 0:
      if (signedUp) {
        if (!signedUp.registered) {
          if (signedUp.teamCreator) {
            msg.reply.text(
              `你的报名被取消了。这是你之前的报名信息：\n==========\n报名ID：${signedUp.ddnetid}\n队伍：${signedUp.teamCreator.createdTeamName}\n参赛码：${signedUp.entryToken}\n==========\n\n想要恢复报名的话可以邮件联系event@teeworlds.cn`
            );
          } else {
            msg.reply.text(
              `你的报名被取消了。这是你之前的报名信息：\n==========\n报名ID：${signedUp.ddnetid}\n参赛码：${signedUp.entryToken}\n==========\n\n想要恢复报名的话可以邮件联系event@teeworlds.cn`
            );
          }
        } else if (signedUp.teamCreator) {
          msg.reply.text(
            `欢迎回来，你的FNG报名信息如下：\n==========\n报名ID：${signedUp.ddnetid}\n队伍：${signedUp.teamCreator.createdTeamName}\n参赛码：${signedUp.entryToken}\n==========\n\n想要修改报名信息的话请用邮件联系event@teeworlds.cn`
          );
        } else {
          msg.reply.text(
            `欢迎回来，你的FNG报名信息如下：\n==========\n报名ID：${signedUp.ddnetid}\n参赛码：${signedUp.entryToken}\n==========\n\n想要修改报名信息的话请用邮件联系event@teeworlds.cn`
          );
        }
        return -1;
      }

      msg.reply.text(
        '欢迎参加「TWCN “重获新生” 2021年夏季比赛」的报名。\n\n只有团队冰冻献祭模式需要报名，合作竞速(DDrace)模式的参与方式请查看比赛通知的订阅号文章。\n\nFNG比赛会在7月24日下午1点30分开始，为了方便管理和通知，比赛要求所有参赛玩家按时进入比赛服务器就位，并全程观战。所有对局将在三到四个小时内完成。\n\n请问是要继续报名FNG比赛吗？'
      );
      return 1;

    // 是否要继续报名
    case 1:
      if (isPositiveReply() || isSignupReply()) {
        if (msg.user?.ddnetid) {
          const bindReadID = truncate(msg.user.ddnetid, 16);
          if (msg.user.ddnetid != bindReadID) {
            msg.reply.text(
              `你绑定的游戏名"${msg.user.ddnetid}"过长，在游戏里不能显示（会显示为"${bindReadID}")，请告诉豆豆一个短一点的ID。`
            );
            return 2;
          }

          msg.reply.text(
            `了解！那现在开始帮你报名，若要取消报名流程，随时回复“取消”即可。\n\n请问你是要用"${msg.user.ddnetid}"这个ID报名吗？`
          );
          context.name = msg.user.ddnetid;
          return 3;
        }
        msg.reply.text(
          `了解！那现在开始帮你报名，若要取消报名流程，随时回复“取消”即可。\n\n那能提供下你的游戏ID吗？`
        );
        return 2;
      }
      if (isNegativeReply()) {
        msg.reply.text(`好的，那就先不报名了。又想报名了的话，再次回复“报名”即可。【报名取消】`);
        return -1;
      }
      if (isConfusionReply()) {
        msg.reply.text(
          `[发呆]豆豆想知道你是不是要报名FNG比赛，是的话回复“是”，不是的话回复“不是”。`
        );
        return 1;
      }
      msg.reply.text(
        `额。。豆豆没明白[疑问]，那我就先当作你不需要报名了。还是想报名的话，再次回复“报名”即可。【报名失败】`
      );
      return -1;

    // 请提供你的ID
    case 2:
      if (!msg.content) {
        msg.reply.text(`啊，豆豆没看到你的ID。能再告诉豆豆一下你的游戏ID吗？`);
        return 2;
      }

      const providedRealID = truncate(msg.content, 16);
      if (msg.content != providedRealID) {
        msg.reply.text(
          `"${msg.content}"这个ID太长了[吓]，在游戏里显示不出来（会显示为"${providedRealID}")，请告诉豆豆一个短一点的ID。`
        );
        return 2;
      }

      if (context.name) {
        context.name = msg.content;
        msg.reply.text(`是想换成"${context.name}"这个ID报名吗？不想报名了的话，回复“取消”即可`);
        return 3;
      }

      msg.reply.text(`好，以防你打错，再确认下是用"${msg.content}"这个ID报名吗？`);
      context.name = msg.content;
      return 3;

    // 确定要用你输入的ID报名吗
    case 3:
      if (!context.name) {
        break;
      }
      if (isPositiveReply() || msg.content == context.name) {
        msg.reply.text(
          `OK，那就帮你用"${context.name}"这个ID报名。\n那请问你已经有队友了吗？还是想要以个人名义报名让我们来随机帮你找队伍？`
        );
        return 4;
      }

      if (isNegativeReply() || isRegretReply()) {
        msg.reply.text(`不是的话，那重新告诉下我你的ID吧。`);
        return 2;
      }

      // 其他情况当作想换ID
      return matchSignup(msg, 2, context);

    // 有队友吗
    case 4:
      if (isConfusionReply()) {
        msg.reply.text(
          `是这样的，比赛分固定三人队伍和个人随机组队两种队伍。\n固定队伍固定三人配置，可以附带一位第四名队员作为替补。\n以个人名义报名的玩家则会被随机匹配一名或两名队友。具体的分组规则建议查看订阅号的比赛公告。\n\n那么，如果是已经有组好队的队友的话请回复“有队友”，没有的话请回复“个人”。`
        );
        return 4;
      }

      if (isTeamedReply()) {
        msg.reply.text(
          `好的[机智]，你是队长吗？如果不是队长的话，你的队长应该有发给你一个队伍代号。不太确定的话建议先跟队友确认下。`
        );
        return 5;
      }

      if (isPersonalReply()) {
        const token = await generateEntryToken();
        await MatchSignUpModel.create({
          userKey: msg.userKey,
          ddnetid: context.name,
          entryToken: token,
          registered: true,
        });

        msg.reply.text(
          `[好的] OK了，那就已经帮你报上名了，最后的分组和比赛服务器会在7月19日通过微信订阅号的文章公布。\n==========\n报名ID：${context.name}\n参赛码：${token}\n==========\n\n${MATCHINFO}`
        );
        return -1;
      }
      msg.reply.text(
        `[天啊]豆豆没明白你的意思。如果有队友的话请回复“有”，个人名义报名的话请回复“个人”`
      );
      return 4;

    // 是队长吗
    case 5:
      if (isConfusionReply()) {
        msg.reply.text(
          `哦哦，队长是负责创建队伍的玩家。\n\n如果你的其他队友还没有报名，回复“是”豆豆就帮你创建个新的队伍代号，你可以邀请队友加入你的队伍。\n\n如果已经有队伍代号的话，直接回复队伍代号即可。\n\n不确定的话，建议先跟队友确认一下，回复“取消”可以暂时取消报名，之后再来报名。`
        );
        return 5;
      }

      const creator = await findTeamCreator(msg.content);
      if (creator) {
        // 有这个代号，直接跳到输入代号的进度
        context.teamName = creator.createdTeamName;
        return await matchSignup(msg, 8, context);
      }

      if (isPositiveReply()) {
        msg.reply.text(`了解了，那能不能提供下你的队伍名？`);
        return 6;
      }

      if (isNegativeReply()) {
        msg.reply.text(`那么，能不能提供下队长发给你的队伍代号？豆豆好帮你们组成比赛队伍。`);
        return 8;
      }

      msg.reply.text(
        `抱歉，豆豆不太明白你的意思[疑问]。\n\n如果你的其他队友还没有报名，回复“是”豆豆就帮你创建个新的队伍代号，你可以邀请队友加入你的队伍。\n\n如果已经有队伍代号的话，直接回复队伍代号即可。\n\n不确定的话，建议先跟队友确认一下，回复“取消”可以暂时取消报名，之后再来报名。`
      );
      return 5;

    // 提供队伍名
    case 6:
      if (!msg.content) {
        msg.reply.text(`啊，豆豆没看到你输入的队伍名。能再告诉豆豆一下你要报名的队伍名吗？[委屈]`);
        return 6;
      }

      context.teamName = msg.content;
      const realTeamName = truncate(msg.content, 12);
      if (context.teamName != realTeamName) {
        msg.reply.text(
          `战队名"${context.teamName}"有点长，在游戏里会显示为"${realTeamName}"。不过豆豆依然可以按"${context.teamName}"这个战队名帮你创建队伍，这样可以吗？`
        );
        return 7;
      }

      msg.reply.text(`好的，豆豆确认下，就按"${context.teamName}"这个战队名帮你创建队伍可以吗？`);
      return 7;

    // 确认队伍名
    case 7:
      if (isPositiveReply()) {
        const token = await generateEntryToken();
        context.teamToken = await generateTeamToken();
        await MatchSignUpModel.create({
          userKey: msg.userKey,
          ddnetid: context.name,
          entryToken: token,
          registered: true,
          teamToken: context.teamToken,
          createdTeamName: context.teamName,
          createdTeamToken: context.teamToken,
        });
        msg.reply.text(
          `好的，那就帮你以"${context.teamName}"的队长名义报名了。\n==========\n报名ID：${context.name}\n队伍名称：${context.teamName}\n队伍代号：${context.teamToken}\n参赛码：${token}\n==========\n\n你的队伍代号是：“${context.teamToken}”。将队伍代号发送给你的队友并邀请他们来公众号报名即可。（请只将队伍代码发送给队友，否则可能会影响你的队伍正常报名）\n\n${MATCHINFO}`
        );
        return -1;
      }

      if (isNegativeReply() || isRegretReply()) {
        msg.reply.text(`好吧，那能再告诉豆豆一下你要创建的队伍名吗？`);
        return 6;
      }

      msg.reply.text(
        `豆豆没明白你的意思。请问是想用"${context.teamName}"这个队伍名吗？是的话回复“是”，不是的话回复“不是”。`
      );
      return 7;

    // 输入你的队伍代号
    case 8:
      const teamName = context.teamName || (await findTeamCreator(msg.content)).createdTeamName;
      if (teamName) {
        context.teamName = teamName;
        context.teamToken = msg.content;

        const teammates = await findTeam(msg.content);
        const teamList = teammates.map(t => `"${t.ddnetid}"`).join();
        if (teammates.length >= 4) {
          msg.reply.text(
            `啊，"${teamName}"这个队伍已经有四个队员了：\n${teamList}\n\n豆豆暂时先取消你的报名流程了，你可以去和队长确认下。再次发送“报名”可以重新报名。【报名失败】`
          );
          return -1;
        } else if (teammates.length == 3) {
          msg.reply.text(
            `"${teamName}"这个队伍已经有三个队员了：\n${teamList}\n豆豆还是可以帮你作为"${teamName}"的一员报名，但是比赛的时候会有一位队员是替补，具体谁是替补可以在比赛的时候决定。\n\n帮你作为"${teamName}"的一员报名可以吗？`
          );
          return 9;
        } else if (teammates.length > 0) {
          msg.reply.text(
            `好的，目前"${teamName}"队伍有这些队员：\n${teamList}\n\n那豆豆帮你作为"${teamName}"的一员报名可以吗？`
          );
          return 9;
        } else {
          msg.reply.text(
            `啊，目前"${teamName}"队伍没有队员，说明创建队伍的队长抛弃了这个队伍。\n\n不过豆豆依然可以帮你作为"${teamName}"的一员报名，确定要报名吗？`
          );
          return 9;
        }
      }

      msg.reply.text(
        `抱歉，豆豆找不到代号为"${msg.content}"的队伍。请确认下再发送一遍，或者回复“取消”再重新报名。【报名失败】`
      );
      return 8;

    // 确定要报名到这个代号吗
    case 9:
      if (isPositiveReply()) {
        const token = await generateEntryToken();
        await MatchSignUpModel.create({
          userKey: msg.userKey,
          ddnetid: context.name,
          entryToken: token,
          registered: true,
          teamToken: context.teamToken,
        });

        msg.reply.text(
          `好的，那就帮你报名到"${context.teamName}"这个队伍里了。\n==========\n报名ID：${context.name}\n队伍名称：${context.teamName}\n参赛码：${token}\n==========\n\n${MATCHINFO}`
        );
        return -1;
      }

      if (isNegativeReply() || isRegretReply()) {
        msg.reply.text(
          `好的，那豆豆只能先帮你取消报名流程了。想重新报名的话，再次发送“报名”就可以了。【报名取消】`
        );
        return -1;
      }

      msg.reply.text(
        `抱歉，豆豆不太明白你的意思。\n\n如果你确定要报名到${context.teamName}这个队伍里，回复“是”。否则的话回复“不是”。`
      );
      return 9;
  }

  msg.reply.text(
    `呀，豆豆的脑回路变成豆腐脑彻底混乱掉了。先帮你取消了报名流程，回复“报名”可以重试。【报名失败】`
  );
  return -1;
};
