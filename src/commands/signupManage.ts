import { TextHandler } from '../bottype';
import { MatchSignUpModel } from '../db/matchSignup';
import { LEVEL_ADMIN, LEVEL_OPERATOR } from '../db/user';
import { CommandParser } from '../utils/commandParser';

export const registrationCheck: TextHandler = async msg => {
  if (msg.userLevel > LEVEL_OPERATOR) return;

  const query = new CommandParser(msg.text);
  const token = query.getString(1);
  const state = query.getString(2);

  if (!token) {
    await msg.reply.text(`指令 参赛码 报名状态[true|false]`);
    return;
  }

  const signedUp = await MatchSignUpModel.findOne({ entryToken: token })
    .populate('teamCreator')
    .exec();

  if (!signedUp) {
    await msg.reply.text(`没找到报名信息。`);
    return;
  }

  if (signedUp.createdTeamToken) {
    if (signedUp.teamCreator) {
      await msg.reply.text(
        `报名信息如下：\n==========\n报名ID：${signedUp.ddnetid}\n创建队伍：${signedUp.createdTeamToken}\n创建队伍代号：${signedUp.createdTeamToken}\n队伍：${signedUp.teamCreator.createdTeamName}\n参赛码：${signedUp.entryToken}\n==========`
      );
    } else {
      await msg.reply.text(
        `报名信息如下：\n==========\n报名ID：${signedUp.ddnetid}\n创建队伍：${signedUp.createdTeamToken}\n创建队伍代号：${signedUp.createdTeamToken}\n参赛码：${signedUp.entryToken}\n==========`
      );
    }
  } else if (signedUp.teamCreator) {
    await msg.reply.text(
      `报名信息如下：\n==========\n报名ID：${signedUp.ddnetid}\n队伍：${signedUp.teamCreator.createdTeamName}\n参赛码：${signedUp.entryToken}\n==========`
    );
  } else {
    await msg.reply.text(
      `报名信息如下：\n==========\n报名ID：${signedUp.ddnetid}\n参赛码：${signedUp.entryToken}\n==========`
    );
  }

  if (state == 'false') {
    signedUp.registered = false;
    await signedUp.save();
    await msg.reply.text(`取消了该玩家的报名。`);
  } else if (state == 'true') {
    signedUp.registered = true;
    await signedUp.save();
    await msg.reply.text(`恢复了该玩家的报名。`);
  }
};

export const exportRegistration: TextHandler = async msg => {
  if (msg.userLevel > LEVEL_OPERATOR) return;

  const entries = await MatchSignUpModel.find({}).populate('teamCreator', 'createdTeamName').exec();
  const lines = [
    'userKey,registered,ddnetid,teamName,entryToken,teamToken,createdTeamName,createdTeamToken',
  ];

  for (const entry of entries) {
    lines.push(
      `"${entry.userKey}","${entry.registered}","${entry.ddnetid}","${
        entry.teamCreator ? entry.teamCreator.createdTeamName : ''
      }","${entry.entryToken}","${entry.teamToken || ''}","${entry.createdTeamName || ''}","${
        entry.createdTeamToken || ''
      }"`
    );
  }

  const fileID = await msg.bot.uploadFile('reg.csv', Buffer.from(lines.join('\n')));
  await msg.reply.file(fileID);
};
