import { Status } from 'jsr:@oak/commons@1/status';
import { Router } from 'jsr:@oak/oak/router';
import * as secrets from '../secrets/wechat.ts';
import { parse } from 'https://deno.land/x/xml@6.0.1/parse.ts';
import { cdata, stringify } from 'https://deno.land/x/xml@6.0.1/stringify.ts';
import {
  EncryptedPayload,
  LinkMessagePayload,
  ReceivedMessagePayload,
  TextMessagePayload,
} from '../protocols/wechat.ts';

import { mainHandler } from '../handlers/main.ts';

export const wechat = (router: Router) => {
  if (!secrets.isActive()) {
    return;
  }

  router.get('/wechat', async ({ request, response }) => {
    const params = request.url.searchParams;
    const nonce = params.get('nonce');
    const timestamp = params.get('timestamp');
    const signature = params.get('signature');
    const echostr = params.get('echostr');

    if (!signature || !nonce || !timestamp) {
      response.status = Status.BadRequest;
      return;
    }

    if ((await secrets.sign(timestamp, nonce)) !== signature) {
      response.status = Status.Forbidden;
      return;
    }

    response.body = echostr;
  });

  router.post('/wechat', async ({ request, response }) => {
    const params = request.url.searchParams;
    const nonce = params.get('nonce');
    const signature = params.get('msg_signature');
    const timestamp = params.get('timestamp');
    if (!signature || !nonce || !timestamp) {
      response.status = Status.BadRequest;
      return;
    }

    const body = await request.body.text();
    try {
      const { xml } = parse(body) as unknown as EncryptedPayload;
      const encrypt = xml.Encrypt;
      if ((await secrets.sign(timestamp, nonce, encrypt)) !== signature) {
        response.status = Status.Forbidden;
        return;
      }

      const decrypt = secrets.decrypt(encrypt);
      const info = parse(decrypt) as unknown as ReceivedMessagePayload;

      if (info.xml.MsgType == 'text') {
        let sent = false;
        const message = info.xml.Content;
        await mainHandler(
          {
            text: (msg: string) => {
              const reply: TextMessagePayload = {
                xml: {
                  ToUserName: cdata(info.xml.FromUserName),
                  FromUserName: cdata(info.xml.ToUserName),
                  CreateTime: Math.floor(Date.now() / 1000).toString(),
                  MsgType: 'text',
                  Content: cdata(msg),
                },
              };
              response.body = stringify(reply);
              sent = true;
            },
            link: (title: string, desc: string, url: string) => {
              const reply: LinkMessagePayload = {
                xml: {
                  ToUserName: cdata(info.xml.FromUserName),
                  FromUserName: cdata(info.xml.ToUserName),
                  CreateTime: Math.floor(Date.now() / 1000).toString(),
                  MsgType: 'link',
                  Title: cdata(title),
                  Description: cdata(desc),
                  Url: cdata(url),
                },
              };
              response.body = stringify(reply);
              sent = true;
            },
          },
          message,
          'DIRECT'
        );
        if (!sent) {
          response.body = 'success';
        }
      } else {
        response.body = 'success';
      }
    } catch {
      response.status = Status.BadRequest;
      return;
    }
  });
};
