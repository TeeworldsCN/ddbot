import type { Response } from 'jsr:@oak/oak/response';

// Webhook
export type QQPayload =
  | QQValidationPayload
  | QQC2CMessageCreatePayload
  | QQGroupAtMessageCreatePayload
  | QQDirectMessageCreatePayload;

export type QQC2CMessageCreatePayload = CallbackPayload<
  {
    id: string;
    content: string;
    timestamp: string;
    author: { id: string; user_openid: string; union_openid: string };
    message_scene: { source: string };
  },
  'C2C_MESSAGE_CREATE'
>;

export type QQGroupAtMessageCreatePayload = CallbackPayload<
  {
    id: string;
    content: string;
    timestamp: string;
    author: { id: string; user_openid: string; union_openid: string };
    group_id: string;
    group_openid: string;
    message_scene: { source: string };
  },
  'GROUP_AT_MESSAGE_CREATE'
>;

export type QQDirectMessageCreatePayload = CallbackPayload<
  {
    author: {
      avatar: string;
      bot: boolean;
      id: string;
      username: string;
    };
    channel_id: string;
    content: string;
    guild_id: string;
    id: string;
    member: {
      joined_at: string;
      roles: string[];
    };
    timestamp: string;
  },
  'DIRECT_MESSAGE_CREATE'
>;

export interface QQValidationPayload {
  op: 13;
  d: {
    plain_token: string;
    event_ts: string;
  };
}

interface CallbackPayload<T, U extends string> {
  op: 12;
  id: string;
  d: T;
  t: U;
}

// QQ OpenAPI
const END_POINT = 'https://api.sgroup.qq.com';
const secret = Deno.env.get('QQ_SECRET');
const appId = Deno.env.get('QQ_APPID');

let accessToken: string | undefined;
let accessTokenExpires: number | undefined;

export const GetAccessToken = async () => {
  if (accessToken && accessTokenExpires && Date.now() < accessTokenExpires) {
    return accessToken;
  }

  const url = new URL('https://bots.qq.com/app/getAppAccessToken');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appId,
      clientSecret: secret,
    }),
  });

  if (res.status != 200) {
    console.error(res.status, res.statusText);
    return '';
  }

  const json = await res.json();

  if (!json.access_token || !json.expires_in) {
    console.error(json);
    return '';
  }

  accessToken = json.access_token;
  accessTokenExpires = Date.now() + (parseInt(json.expires_in) - 30) * 1000;
  return accessToken;
};

export const ReplyToC2CMessage = async (openid: string, msgId: string, content: string) => {
  const url = new URL(`/v2/users/${openid}/messages`, END_POINT);
  const token = await GetAccessToken();
  if (!token) {
    console.error('Can not get access token.');
    return;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `QQBot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      msg_type: 0,
      msg_id: msgId,
    }),
  });

  if (res.status != 200) {
    console.error(res.status, res.statusText);
  }
  return res;
};

export const ReplyToDirectMessage = async (guildId: string, msgId: string, content: string) => {
  const url = new URL(`/dms/${guildId}/messages`, END_POINT);
  const token = await GetAccessToken();
  if (!token) {
    console.error('Can not get access token.');
    return;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `QQBot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      msg_id: msgId,
    }),
  });
  if (res.status != 200) {
    console.error(res.status, res.statusText);
  }
  return res;
};
