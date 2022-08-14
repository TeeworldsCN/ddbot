import express from 'express';
import { CONFIG } from './config';

export const webhook = express();

export const startWebhook = () => {
  webhook.listen(CONFIG.webhookPort);
};
