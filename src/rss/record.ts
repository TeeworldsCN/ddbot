import { kaiheila } from '../bots';
import { SubscriptionModel } from '../db/subscription';
import { Card, SMD } from '../utils/cardBuilder';
import { FLAGS, SERVERS } from '../utils/consts';
import { dateTime, unpackID } from '../utils/helpers';
import { FeedEntry, FeedHandler } from '../utils/rssFeeder';

const sendKaiheila = async (item: FeedEntry, channelKey: string) => {
  if (!kaiheila) return;

  const card = new Card('lg');
  const data = (item.title as string).match(
    /\[([A-Z]*)\] (.* rank).*on \[([A-Za-z]*)\] ([^:]*): ([0-9:.]*) (.*) \(([^-)]*)(?: - (.*%).*)?\)/
  );

  if (data) {
    const server = SERVERS[data[3].toLowerCase()] || data[3];
    const map = data[4];
    const flag = FLAGS[data[1].toLowerCase()] || data[1];
    const types: { [key: string]: [string, string, string, string] } = {
      'top 1 team rank': ['队伍', '最高团队记录', '提升率', 'success'],
      'top 1 rank': ['玩家', '最高个人记录', '提升率', 'success'],
      'worst rank': ['玩家', '最差个人记录', '降低率', 'danger'],
      'worst team rank': ['队伍', '最差团队记录', '降低率', 'danger'],
    };
    const type = types[data[2].toLowerCase()] || ['', '新记录', '变化', 'secondary'];
    const old = data[7].slice(16) || data[5];

    card.addMarkdown(
      `**【${server}】${SMD(map)}**\n${flag} ${type[0]} **${SMD(data[6])}** 创下${type[1]}！`
    );
    if (data[8]) {
      card.addTable([
        [
          `**新记录**\n${SMD(data[5])}`,
          `**原记录**\n~~${SMD(old)}~~`,
          `**${type[2]}**\n${data[8]}`,
        ],
      ]);
      card.setTheme(type[3] as any);
    } else {
      card.addTable([[`**首杀记录！**\n${SMD(data[5])}`]]);
      card.setTheme('warning');
    }
  } else {
    card.slice(0, 0);
    card.addText(item.title);
  }
  card.addContext([`${dateTime(item.updated)}`]);
  await kaiheila.channel(channelKey).card(card);
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

  // broadcast
  for (const channel of doc.channels) {
    const unpacked = unpackID(channel);
    if (unpacked.platform == 'kaiheila') {
      await sendKaiheila(item, channel);
    }
  }

  return true;
};
