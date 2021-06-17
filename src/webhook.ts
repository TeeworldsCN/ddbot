import express from 'express';
import { kaiheila } from './bots/kaiheila';
import { SubscriptionModel } from './db/subscription';
import { API } from './utils/axios';
import { unpackID } from './utils/helpers';

export const webhook = express();

interface WebhookMessage {
  content: string; // 默认文本消息
  khlcard: any; // 开黑啦特殊卡片消息
  discord: any; // Discord特殊消息
}

webhook.post('/wh/:channel', express.json(), async (req, res) => {
  const body = req.body as WebhookMessage;
  if (req.query.token != process.env.BOT_AUTH_TOKEN) return res.sendStatus(404);

  if (!body.content) {
    return res.status(400).send({ error: 'content missing' });
  }

  const doc = await SubscriptionModel.findOne({ name: req.params.channel }).exec();
  if (!doc) {
    return res.sendStatus(404);
  }

  // broadcast
  const err = [];
  for (const channel of doc.channels) {
    const unpacked = unpackID(channel);
    if (unpacked.platform == 'kaiheila') {
      if (body.khlcard) {
        await kaiheila.channel(channel).card(body.khlcard);
      } else {
        await kaiheila.channel(channel).text(body.content);
      }
    } else if (unpacked.platform == 'discord') {
      try {
        if (body.discord) {
          await API.post(
            `/webhook/${process.env.TWCN_API_TOKEN}/https://discord.com/api/webhooks/${unpacked.id}`,
            body.discord
          );
        } else {
          await API.post(
            `/webhook/${process.env.TWCN_API_TOKEN}/https://discord.com/api/webhooks/${unpacked.id}`,
            { content: body.content }
          );
        }
      } catch (e) {
        err.push({
          channel,
          status: e?.response?.status || -1,
          data: e?.response?.data || null,
        });
      }
    } else if (unpacked.platform == 'webhook') {
      try {
        await API.post(`/webhook/${process.env.TWCN_API_TOKEN}/${unpacked.id}`, body);
      } catch (e) {
        err.push({
          channel,
          status: e?.response?.status || -1,
          data: e?.response?.data || null,
        });
      }
    }
  }

  if (err.length > 0) {
    return res.status(500).send({ err });
  }
  return res.sendStatus(200);
});

export const startWebhook = () => {
  webhook.listen(process.env.WEBHOOK_PORT);
};
