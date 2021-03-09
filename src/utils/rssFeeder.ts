import axios, { AxiosInstance } from 'axios';
import Lowdb from 'lowdb';
import cheerio from 'cheerio';

interface FeedEntry {
  title: string;
  link: string;
  content: string;
  author?: string;
  updated: number;
}

export class RssFeeder {
  private axios: AxiosInstance;
  private events: { [key: string]: (entry: FeedEntry) => Promise<boolean> };
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

  public startFeed(url: string, eventName: string, interval: number, offset: number) {
    if (interval < this.timeout * 2) {
      // stupid but safe
      interval = this.timeout * 2;
    }
    setTimeout(() => {
      const event = async () => {
        try {
          const response = await this.axios.get(url);
          let last_time = this.db.get(`${eventName}_last`).value() || 0;
          const entries: FeedEntry[] = [];

          const $ = cheerio.load(response.data);
          $('entry').each((i, e) => {
            const time = $('updated', e).text();
            if (time) {
              entries.push({
                title: $('title', e).text(),
                link: $('link', e).attr('href'),
                content: $('content', e).html(),
                author: $('author name', e).text() || $('author', e).text() || undefined,
                updated: new Date(time).getTime(),
              });
            }
          });

          entries.sort((a, b) => (a.updated == b.updated ? 0 : a.updated < b.updated ? -1 : 1));

          let dirty = false;
          for (let entry of entries) {
            if (entry.updated > last_time) {
              if (this.events[eventName]) {
                let success = false;
                try {
                  success = await this.events[eventName](entry);
                } catch (e) {
                  console.log(`${eventName} handler failed:`);
                  console.log(e);
                  break;
                }

                if (success) {
                  last_time = entry.updated;
                  dirty = true;
                } else {
                  break;
                }
              }
            }
          }

          if (dirty) {
            this.db.set(`${eventName}_last`, last_time).write();
          }
        } catch (e) {
          console.error('Feed error:');
          console.log(e);
        }
      };
      event();
      setInterval(event, interval);
    }, offset);
  }

  public register(eventName: string, cb: (entry: FeedEntry) => Promise<boolean>) {
    this.events[eventName] = cb;
  }
}
