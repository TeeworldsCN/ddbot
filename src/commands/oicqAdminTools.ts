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
  const channelKey = query.getRest(1) || msg.channelKey;

  const channelInfo = unpackChannelID(channelKey);
  if (channelInfo.platform !== 'oicq') {
    await msg.reply.text('请提供频道Key');
    return;
  }

  const memberList = await oicq.instance.getGroupMemberList(parseInt(channelInfo.id));
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
