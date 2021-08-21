import axios from 'axios';
import { DateTime } from 'luxon';
import { MessageElem, MessageEventData, segment } from 'oicq';
import { oicq } from '../bots';
import { TextHandler } from '../bottype';
import { CommandParser } from '../utils/commandParser';
import { QMOTE } from '../utils/consts';
import { unpackChannelID } from '../utils/helpers';
import { pstd } from '../utils/pstd';

// QQ：查表情
export const checkface: TextHandler = async msg => {
  const query = new CommandParser(msg.command);
  let face = query.getNumber(1);
  const content: MessageEventData = msg.raw;
  let name = null;

  if (isNaN(face)) {
    face = null;
    for (const e of content.message) {
      if (e.type == 'face') {
        face = e.data.id;
        name = e.data.text;
      } else if (e.type == 'sface') {
        face = e.data.id;
        name = e.data.text;
      }
    }
  }

  if (face == null) {
    await msg.reply.text('找不到相关内容');
    return;
  }

  const emoteData = QMOTE[face];
  const seg: MessageElem[] = [segment.face(face), segment.text(`(${face}|${name})`)];
  if (emoteData) {
    seg.push(segment.text(` | 中: ${emoteData.name}`));
    if (emoteData.eng) {
      seg.push(segment.text(` 英: ${emoteData.eng}`));
    }
    if (emoteData.emoji) {
      seg.push(
        segment.text(
          ` Emoji: ${emoteData.emoji} | U+${emoteData.emoji.codePointAt(0).toString(16)}`
        )
      );
    }
  }

  if (msg.sessionType == 'CHANNEL') {
    await msg.bot.instance.sendGroupMsg(parseInt(msg.channelId), seg);
  } else {
    await msg.bot.instance.sendPrivateMsg(parseInt(msg.userId), seg);
  }
};

// QQ：查询群员
export const oicqCheckMembers: TextHandler = async msg => {
  const query = new CommandParser(msg.command);
  let channelId = query.getNumber(1);

  if (channelId == null) {
    const channelInfo = unpackChannelID(msg.channelKey);
    if (channelInfo.platform !== 'oicq') {
      await msg.reply.text('请提供频道Key');
      return;
    }
    channelId = parseInt(channelInfo.id);
  }

  const memberList = await oicq.instance.getGroupMemberList(channelId);
  if (memberList.retcode) {
    await msg.reply.text(`获取列表失败：${memberList.error.message}`);
    return;
  }

  const csv_data: string[] = [
    '"账号","昵称","群名片","入群时间戳","最后发言时间戳","禁言到期时间戳","入群时间","最后发言时间","禁言到期时间"',
  ];

  const q = (str: string) => {
    return str.replace(/"/g, '\\"');
  };

  for (const [_, info] of memberList.data) {
    csv_data.push(
      `"${info.user_id}","${q(info.nickname)}","${q(info.card)}","${info.join_time}","${
        info.last_sent_time
      }","${info.shutup_time}","${DateTime.fromMillis(info.join_time * 1000)
        .setLocale('zh')
        .toLocaleString(DateTime.DATETIME_MED)}","${
        info.last_sent_time
          ? DateTime.fromMillis(info.last_sent_time * 1000)
              .setLocale('zh')
              .toLocaleString(DateTime.DATETIME_MED)
          : 'never'
      }","${
        info.shutup_time
          ? DateTime.fromMillis(info.shutup_time * 1000)
              .setLocale('zh')
              .toLocaleString(DateTime.DATETIME_MED)
          : '-'
      }"`
    );
  }

  await msg.reply.text(await pstd(csv_data.join('\n')));
};

// QQ：清除缓存
export const oicqClearCache: TextHandler = async msg => {
  if (!oicq) return;

  const result = await oicq.instance.cleanCache();
  if (result.retcode) {
    msg.reply.text(`清除缓存失败：${result.error}`);
    return;
  }

  msg.reply.text(`清除缓存成功`);
  return;
};

// QQ：清理群员
export const oicqClearMembers: TextHandler = async msg => {
  const query = new CommandParser(msg.command);
  let beforeTime = query.getNumber(1);
  let confirm = query.getRest(2);

  if (beforeTime == null) {
    return;
  }

  const channelInfo = unpackChannelID(msg.channelKey);
  if (channelInfo.platform !== 'oicq') return;

  const memberList = await oicq.instance.getGroupMemberList(parseInt(channelInfo.id));
  if (memberList.retcode) {
    await msg.reply.text(`获取列表失败：${memberList.error.message}`);
    return;
  }

  const candidates: number[] = [];

  for (const [_, info] of memberList.data) {
    // no message
    if (info.join_time < beforeTime && info.last_sent_time - info.join_time == 0) {
      candidates.push(info.user_id);
    }
  }

  if (candidates.length / memberList.data.size > 0.1) {
    await msg.reply.text(`有${candidates.length}名符合条件的用户，数量过多，为了安全已禁止操作。`);
    return;
  }

  if (confirm !== 'confirm') {
    await msg.reply.text(`将清理${candidates.length}名用户。请确认。`);
    return;
  }

  const total = candidates.length;
  const reportPer = Math.floor(total / 5);

  const removeOne = async () => {
    if (candidates.length <= 0) {
      await msg.reply.text(`清理完毕`);
      return;
    }
    const result = await oicq.instance.setGroupKick(
      parseInt(channelInfo.id),
      candidates.pop(),
      false
    );
    const delta = total - candidates.length - 1;
    if (result.retcode) {
      await msg.reply.text(`清理中断，已清理${delta}名用户`);
      return;
    } else if (delta % reportPer == 0) {
      await msg.reply.text(`已清理 ${delta}/${total}`);
    }
    setTimeout(removeOne, 1000 + Math.random() * 2000);
  };

  await msg.reply.text(`清理操作已开始`);
  removeOne();
};
