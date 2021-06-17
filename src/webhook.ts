import express from 'express';

export const webhook = express();

export const startWebhook = () => {
  webhook.listen(process.env.WEBHOOK_PORT);
};
