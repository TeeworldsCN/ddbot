import { SubscriptionModel } from '../db/subscription';
import { SERVERS } from '../utils/consts';
import { FeedHandler } from '../utils/rssFeeder';
import cheerio from 'cheerio';
import { Card } from '../utils/cardBuilder';
import { dateTime, unpackID } from '../utils/helpers';
import { kaiheila } from '../bots';

interface MapDetail {
  name: string;
  author: string;
  server: string;
  size: string;
  desc: string;
  imageName: string;
  tiles: string[];
  updated: number;
}

const sendKaiheila = async (item: MapDetail, channelKey: string) => {
  if (!kaiheila) return;

  const card = new Card('lg');

  card.addTitle(`DDNet 新地图发布`);
  card.addTextWithButton(`地图: ${item.name}\n作者: ${item.author}`, {
    theme: 'info',
    text: '预览',
    value: `https://teeworlds.cn/p/${encodeURIComponent(item.name)}`,
    click: 'link',
  });

  if (item.tiles.length > 0)
    card.addContext(
      item.tiles.map(src => {
        return { src };
      })
    );

  const text = [];
  if (item.size) text.push(`地图大小: ${item.size}`);
  if (item.server) text.push(`类型: ${item.server}`);
  if (item.desc) text.push(item.desc);
  const descText = `${text.join('\n')}\n\n发布时间: ${dateTime(item.updated)}`;

  if (item.imageName) {
    card.addTextWithImage(
      descText,
      { src: `https://api.teeworlds.cn/ddnet/mapthumbs/${item.imageName}.png?square=true` },
      'lg',
      true
    );
  } else {
    card.addText(descText);
  }
  card.setTheme('success');
  await kaiheila.channel(channelKey).card(card);
};

let MAP_RETRY = 0;

export const mapFeed: FeedHandler = async item => {
  if (!item || !item.title) {
    console.warn('Map: no item');
    return false;
  }

  const doc = await SubscriptionModel.findOne({ name: 'map' }).exec();
  if (!doc) {
    console.warn('Map: not subscribed');
    return false;
  }

  const $ = cheerio.load(item.content);
  const data: MapDetail = {
    name: null,
    author: null,
    server: null,
    size: null,
    desc: null,
    imageName: null,
    tiles: [],
    updated: item.updated,
  };

  $('div a').each((i, e) => {
    const link = $(e);
    const href = link.attr('href');
    if (href.startsWith('/maps/')) {
      data.name = link.text();
    } else if (href.startsWith('/mappers/')) {
      data.author = link.text();
    } else if (href.startsWith('/ranks/')) {
      data.server =
        SERVERS[
          link
            .text()
            .replace(/ [Ss]erver/, '')
            .toLowerCase()
        ];
    }
  });

  if (!data.name || !data.author) throw new Error("Can't parse essential map detail");

  $('div span').each((i, e) => {
    const title = $(e).attr('title');
    const sizeMatch = title.match(/([0-9]*x[0-9]*)/);
    if (sizeMatch) {
      data.size = sizeMatch[1];
    }
  });

  $('div p').each((i, e) => {
    const text = $(e).text().trim();
    if (text.startsWith('Difficulty')) {
      data.desc = text.replace('Difficulty', '星级').replace(', Points', '\n分数');
    }
  });

  if (!data.size || !data.server || !data.desc) {
    if (MAP_RETRY < 10) {
      MAP_RETRY++;
      return false;
    }
  }

  const imageName = $('.screenshot')
    .attr('src')
    .match(/\/ranks\/maps\/(.*).png/)?.[1];

  if (imageName) {
    data.imageName = imageName;
  }

  const tiles = $('div p')
    .eq(3)
    .find('img')
    .toArray()
    .map(e => {
      const tile = $(e)
        .attr('src')
        .match(/\/([^\/]*).png/)[1];
      return `https://teeworlds.cn/assets/tiles/${tile}.png`;
    });

  if (tiles) {
    data.tiles.push(...tiles);
  }

  MAP_RETRY = 0;

  // broadcast
  for (const channel of doc.channels) {
    const unpacked = unpackID(channel);
    if (unpacked.platform == 'kaiheila') {
      await sendKaiheila(data, channel);
    }
  }

  return true;
};
