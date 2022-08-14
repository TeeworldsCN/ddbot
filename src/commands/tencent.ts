import { ReplyCommandHandler } from '../bottype';
import * as tencentcloud from 'tencentcloud-sdk-nodejs';
import { CommandParser } from '../utils/commandParser';
import { CONFIG } from '../config';

const TmtClient = tencentcloud.tmt.v20180321.Client;
const secretId = CONFIG.tencentSdk?.secretId;
const secretKey = CONFIG.tencentSdk?.secretKey;
export const tencent =
  secretId && secretKey
    ? new TmtClient({
        credential: {
          secretId,
          secretKey,
        },
        region: 'ap-chengdu',
        profile: {
          httpProfile: {
            endpoint: 'tmt.tencentcloudapi.com',
          },
        },
      })
    : null;

export const translate: ReplyCommandHandler = async msg => {
  if (!tencent) return;

  const query = new CommandParser(msg.base.command);
  const text = query.getRest(1);

  if (!text) return;

  const notranslate = text.match(/(["“”].*["”“])/s);

  try {
    const result = await tencent.TextTranslate({
      SourceText: text,
      Source: 'auto',
      Target: 'zh',
      ProjectId: 0,
      UntranslatedText: notranslate ? notranslate[1] : undefined,
    });
    msg.reply.text(`${msg.base.author.nickname}: ${result.TargetText}`);
  } catch (err) {
    msg.reply.text(err?.message || err.toString());
  }
};

export const fanyi: ReplyCommandHandler = async msg => {
  if (!tencent) return;

  const query = new CommandParser(msg.base.command);
  const text = query.getRest(1);

  if (!text) return;

  const notranslate = text.match(/(["“”].*["”“])/s);

  try {
    const result = await tencent.TextTranslate({
      SourceText: text,
      Source: 'auto',
      Target: 'en',
      ProjectId: 0,
      UntranslatedText: notranslate ? notranslate[1] : undefined,
    });
    msg.reply.text(`${msg.base.author.nickname}: ${result.TargetText}`);
  } catch (err) {
    msg.reply.text(err?.message || err.toString());
  }
};
