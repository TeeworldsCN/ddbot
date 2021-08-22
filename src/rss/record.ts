import { timeUnitToString } from 'vega-lite/build/src/timeunit';
import { kaiheila, oicq } from '../bots';
import { SubscriptionModel } from '../db/subscription';
import { Card, SMD } from '../utils/cardBuilder';
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

const sendKaiheila = async (item: RecordEntry, channelKey: string) => {
  if (!kaiheila) return;

  const card = new Card('lg');
  const titles: { [key: string]: [string, string, string, string] } = {
    topteam: ['队伍', '最高团队记录', '提升率', 'success'],
    top: ['玩家', '最高个人记录', '提升率', 'success'],
    worst: ['玩家', '最差个人记录', '降低率', 'danger'],
    worstteam: ['队伍', '最差团队记录', '降低率', 'danger'],
  };
  const type = titles[item.type] || ['', '新记录', '变化', 'secondary'];
  const flag = FLAGS[item.region.toLowerCase()] || item.region;
  const server = SERVERS[item.server.toLowerCase()] || item.server;
  card.addMarkdown(
    `**【${server}】${SMD(item.map)}**\n${flag} ${type[0]} **${SMD(item.players)}** 创下${
      type[1]
    }！`
  );
  if (!item.firstFinish) {
    card.addTable([
      [
        `**新记录**\n${SMD(item.record)}`,
        `**原记录**\n~~${SMD(item.oldRecord)}~~`,
        `**${type[2]}**\n${item.delta}`,
      ],
    ]);
    card.setTheme(type[3] as any);
  } else {
    card.addTable([[`**首杀记录！**\n${SMD(item.record)}`]]);
    card.setTheme('warning');
  }
  card.addContext([`${dateTime(item.time)}`]);
  await kaiheila.channel(channelKey).card(card);
};

const sendOICQ = async (item: RecordEntry, channelKey: string) => {
  if (!oicq) return;

  // if (['CHN', 'JPN', 'KOR', 'SGP', 'IND'].indexOf(item.region) < 0) return;

  const titles: string[] = {
    topteam: ['队伍', '最高团队记录', '提升'],
    top: ['玩家', '最高个人记录', '提升'],
    worst: ['玩家', '最差个人记录', '降低'],
    worstteam: ['队伍', '最差团队记录', '降低'],
    unknown: ['', '记录', '提升'],
  }[item.type];

  const server = SERVERS_SHORT[item.server.toLowerCase()] || item.server;
  const record = item.firstFinish
    ? item.record
    : `${item.record} (相比上个记录 ${item.oldRecord} ${titles[2]} ${item.delta})`;

  await oicq
    .channel(channelKey)
    .text(
      `[${item.region}]${titles[0]}${item.players}创下了${titles[1]}！\n${server} - ${item.map}: ${record}`
    );
};

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
      if (unpacked.platform == 'kaiheila') {
        await sendKaiheila(entry, channel);
      } else if (unpacked.platform == 'oicq') {
        await sendOICQ(entry, channel);
      }
    }
  } else {
    // broadcast text
    for (const channel of doc.channels) {
      const unpacked = unpackChannelID(channel);
      if (unpacked.platform == 'kaiheila' && kaiheila) {
        const card = new Card('lg');
        card.addText(item.title);
        await kaiheila.channel(channel).card(card);
      } else if (unpacked.platform == 'oicq' && oicq) {
        await oicq.channel(channel).text(item.title);
      }
    }
  }

  return true;
};
