import { timeUnitToString } from 'vega-lite/build/src/timeunit';
import { botsByName } from '../bots';
import { SubscriptionModel } from '../db/subscription';
import { FLAGS, SERVERS, SERVERS_SHORT } from '../utils/consts';
import { dateTime, unpackChannelID, unpackID } from '../utils/helpers';
import { FeedEntry, FeedHandler } from '../utils/rssFeeder';

type RecordType = 'top' | 'topteam' | 'worst' | 'worstteam' | 'unknown';

interface RecordEntry {
  type: RecordType;
  map: string;
  server: string;
  region: string;
  record: string;
  oldRecord: string;
  delta: string;
  firstFinish: boolean;
  players: string;
  time: number;
}

export const recordFeed: FeedHandler = async item => {
  if (!item || !item.title) {
    console.warn('Record: no item');
    return false;
  }

  const doc = await SubscriptionModel.findOne({ name: 'record' }).exec();
  if (!doc) {
    console.warn('Record: not subscribed');
    return false;
  }

  const data = (item.title as string).match(
    /\[([A-Z]*)\] (.* rank).*on \[([A-Za-z]*)\] ([^:]*): ([0-9:.]*) (.*) \(([^-)]*)(?: - (.*%).*)?\)/
  );

  if (data) {
    const server = data[3].toLowerCase();
    const map = data[4];
    const region = data[1].toUpperCase();
    const types: { [key: string]: RecordType } = {
      'top 1 team rank': 'topteam',
      'top 1 rank': 'top',
      'worst rank': 'worst',
      'worst team rank': 'worstteam',
    };

    const entry: RecordEntry = {
      type: types[data[2].toLowerCase()] || 'unknown',
      server,
      region,
      map,
      players: data[6],
      record: data[5],
      oldRecord: data[7].slice(16) || data[5],
      delta: data[8],
      firstFinish: !data[8],
      time: item.updated,
    };

    // broadcast
    for (const channel of doc.channels) {
      const unpacked = unpackChannelID(channel);
      const bot = botsByName[unpacked.botName];
      if (bot) {
        const titles: string[] = {
          topteam: ['队伍', '最高团队记录', '提升'],
          top: ['玩家', '最高个人记录', '提升'],
          worst: ['玩家', '最差个人记录', '降低'],
          worstteam: ['队伍', '最差团队记录', '降低'],
          unknown: ['', '记录', '提升'],
        }[entry.type];

        const server = SERVERS_SHORT[entry.server.toLowerCase()] || entry.server;
        const record = entry.firstFinish
          ? entry.record
          : `${entry.record} (相比上个记录 ${entry.oldRecord} ${titles[2]} ${entry.delta})`;

        await bot
          .channel(channel)
          .text(
            `[${entry.region}]${titles[0]}${entry.players}创下了${titles[1]}！\n${server} - ${entry.map}: ${record}`
          );
      }
    }
  } else {
    // broadcast text
    for (const channel of doc.channels) {
      const unpacked = unpackChannelID(channel);
      const bot = botsByName[unpacked.botName];
      if (bot) {
        await bot.channel(channel).text(item.title);
      }
    }
  }

  return true;
};
