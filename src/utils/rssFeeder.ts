import xml2js from 'xml2js';
import axios, { AxiosInstance } from 'axios';
import Lowdb from 'lowdb';

interface FeedEntry {
  title: string;
  link: string;
  content: string;
  updated: number;
}

export class RssFeeder {
  private axios: AxiosInstance;
  private events: { [key: string]: (entry: FeedEntry) => Promise<void> };
  private timeout: number;
  private db: Lowdb.LowdbSync<any>;

  public constructor(timeout: number = 10000, db: Lowdb.LowdbSync<any>) {
    this.axios = axios.create({
      headers: {
        'Accept-Encoding': 'gzip, deflate',
      },
      decompress: true,
      timeout,
    });

    this.timeout = timeout;
    this.events = {};
    this.db = db;
  }

  public startFeed(url: string, eventName: string, interval: number) {
    if (interval < this.timeout * 2) {
      // stupid but safe
      interval = this.timeout * 2;
    }

    setInterval(async () => {
      try {
        const response = await axios.get(url);
        const xml = await xml2js.parseStringPromise(response.data, {
          trim: true,
        });
        let last_time = this.db.get(`${eventName}_last`).value() || 0;
        const entries: FeedEntry[] = [];
        const xmlEntries = xml?.feed?.entry;
        if (!xmlEntries) throw new Error('No feed entry');

        for (let entry of xmlEntries) {
          const time = entry?.updated?.[0];
          if (time) {
            entries.push({
              title: entry?.title?.[0],
              link: entry?.link?.[0]?.href,
              content: entry?.content?.[0],
              updated: new Date(time).getTime(),
            });
          }
        }

        entries.sort((a, b) => (a.updated == b.updated ? 0 : a.updated < b.updated ? -1 : 1));

        for (let entry of entries) {
          if (entry.updated > last_time) {
            if (this.events[eventName]) await this.events[eventName](entry);
            last_time = entry.updated;
          }
        }
        this.db.set(`${eventName}_last`, last_time).write();
      } catch (e) {
        console.error('Feed error:');
        console.log(e);
      }
    }, interval);
  }

  public register(eventName: string, cb: (entry: FeedEntry) => Promise<void>) {
    this.events[eventName] = cb;
  }
}
