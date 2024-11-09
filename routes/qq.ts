import { Status } from 'jsr:@oak/commons@1/status';
import { Router } from 'jsr:@oak/oak/router';
import { QQPayload, ReplyToC2CMessage, ReplyToDirectMessage } from '../protocols/qq.ts';
import * as secret from '../secrets/qq.ts';
import { mainHandler } from '../handlers/main.ts';

export const qq = (router: Router) => {
  if (!secret.isActive()) {
    return;
  }

  router.post('/qq', async ({ request, response }) => {
    const headers = request.headers;
    if (headers.get('user-agent') !== 'QQBot-Callback') {
      response.status = Status.BadRequest;
      return;
    }

    if (headers.get('x-signature-method') !== 'Ed25519') {
      response.status = Status.BadRequest;
      return;
    }

    // Verify signature
    const signature = headers.get('x-signature-ed25519');
    const timestamp = headers.get('x-signature-timestamp');
    if (!signature || !timestamp) {
      response.status = Status.BadRequest;
      return;
    }

    const body = await request.body.text();
    if (!(await secret.verify(body, timestamp, signature))) {
      response.status = Status.Forbidden;
      return;
    }

    const payload = JSON.parse(body) as QQPayload;
    if (payload.op == 13) {
      response.body = {
        plain_token: payload.d.plain_token,
        signature: await secret.sign(payload.d.plain_token, payload.d.event_ts),
      };
    } else {
      if (payload.t == 'C2C_MESSAGE_CREATE') {
        const message = payload.d.content;

        await mainHandler(
          {
            text: (msg: string) => {
              ReplyToC2CMessage(payload.d.author.user_openid, payload.d.id, msg);
            },
            link: (title: string, desc: string, url: string) => {
              ReplyToC2CMessage(
                payload.d.author.user_openid,
                payload.d.id,
                `${title} - ${desc}:\n${url}`
              );
            },
          },
          message,
          'qq'
        );
      }
      if (payload.t == 'DIRECT_MESSAGE_CREATE') {
        const message = payload.d.content;
        await mainHandler(
          {
            text: (msg: string) => {
              ReplyToDirectMessage(payload.d.author.id, payload.d.id, msg);
            },
            link: (title: string, desc: string, url: string) => {
              ReplyToDirectMessage(
                payload.d.author.id,
                payload.d.id,
                `${title} - ${desc}:\n${url}`
              );
            },
          },
          message,
          'qq'
        );
      }

      // acknowledge message
      response.body = {
        op: 12,
        d: 0,
      };
    }
  });
};
