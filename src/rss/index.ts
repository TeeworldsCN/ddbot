import { RssFeeder } from '../utils/rssFeeder';
import { mapFeed } from './map';
import { recordFeed } from './record';

export const feederStart = () => {
  const feeder = new RssFeeder(10000);
  feeder.startFeed('https://ddnet.tw/status/records/feed/', 'record', 30000, 10000);
  feeder.startFeed('https://ddnet.tw/releases/feed/', 'map', 300000, 15000);
  feeder.register('record', recordFeed);
  feeder.register('map', mapFeed);
};
