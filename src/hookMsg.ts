import express from 'express';
import { DateTime } from 'luxon';
import { CONFIG } from './config';
import { SubscriptionModel } from './db/subscription';
import { API } from './utils/axios';
import { unpackChannelID } from './utils/helpers';

export const hookMsg = express.Router();

interface WebhookMessage {
  content: string; // 默认文本消息
  khlcard: any; // 开黑啦特殊卡片消息
  discord: any; // Discord特殊消息
}

hookMsg.post('/:channel', express.json(), async (req, res) => {
  if (!CONFIG.auth?.token) return res.sendStatus(404);

  const body = req.body as WebhookMessage;
  if (req.query.token != CONFIG.auth.token) return res.sendStatus(404);

  if (!body.content) {
    return res.status(400).send({ error: 'content missing' });
  }

  const doc = await SubscriptionModel.findOneAndUpdate(
    { name: req.params.channel },
    { $set: { last: DateTime.now().toMillis() } }
  ).exec();
  if (!doc) {
    return res.sendStatus(404);
  }

  // broadcast
  const err = [];
  for (const channel of doc.channels) {
    const unpacked = unpackChannelID(channel);
    if (unpacked.platform == 'discord') {
      if (!CONFIG.twcnApi?.token) continue;
      try {
        if (body.discord) {
          await API.post(
            `/webhook/${CONFIG.twcnApi.token}/https://discord.com/api/webhooks/${unpacked.id}`,
            body.discord
          );
        } else {
          await API.post(
            `/webhook/${CONFIG.twcnApi.token}/https://discord.com/api/webhooks/${unpacked.id}`,
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
      if (!CONFIG.twcnApi?.token) continue;
      try {
        await API.post(`/webhook/${CONFIG.twcnApi.token}/${unpacked.id}`, body);
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
