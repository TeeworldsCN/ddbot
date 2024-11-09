import { Aes } from 'https://deno.land/x/crypto@v0.10.1/aes.ts';
import { Cbc } from 'https://deno.land/x/crypto@v0.10.0/block-modes.ts';

import { crypto } from 'jsr:@std/crypto';
import { encodeHex } from 'jsr:@std/encoding/hex';
import { decodeBase64 } from 'jsr:@std/encoding/base64';

const token = Deno.env.get('WECHAT_TOKEN');
const appid = Deno.env.get('WECHAT_APPID');
const aesKey = Deno.env.get('WECHAT_AES_KEY');

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

let active = true;
if (!token) {
  console.warn('WECHAT_TOKEN is not set');
  active = false;
}

if (!aesKey) {
  console.warn('WECHAT_AES_KEY is not set');
  active = false;
}

if (!appid) {
  console.warn('WECHAT_APPID is not set');
  active = false;
}

export const isActive = () => active;

let encryptionKey: Cbc<Aes> | undefined;
const appIdData = textEncoder.encode(appid || '');

if (aesKey) {
  const aesKeyBuffer = decodeBase64(aesKey);
  const aesIv = aesKeyBuffer.slice(0, 16);
  encryptionKey = new Cbc(Aes, aesKeyBuffer, aesIv);
}

export const sign = async (timestamp: string, nouce: string, encrypt: string | null = null) => {
  if (!token) throw new Error('No token');

  const payload = (encrypt ? [token, timestamp, nouce, encrypt] : [token, timestamp, nouce])
    .sort()
    .join('');
  return encodeHex(await crypto.subtle.digest('SHA-1', textEncoder.encode(payload)));
};

export const decrypt = (encrypt: string) => {
  if (!encryptionKey) throw new Error('No encryption key');

  const data = decodeBase64(encrypt);
  const result = unwrap(encryptionKey.decrypt(data));
  const len = readUInt32BE(result, 16);
  const body = result.slice(20, 20 + len);
  return textDecoder.decode(body);
};

export const encrypt = (msg: string) => {
  if (!encryptionKey) throw new Error('No encryption key');

  const random = new Uint8Array(16);
  crypto.getRandomValues(random);

  const msgData = textEncoder.encode(msg);
  const fullMsg = new Uint8Array(random.length + 4 + msgData.length + appIdData.length);
  fullMsg.set(random, 0);
  writeUInt32BE(fullMsg, random.length, msgData.length);
  fullMsg.set(msgData, random.length + 4);
  fullMsg.set(appIdData, random.length + 4 + msgData.length);
  const paddedMsg = wrap(fullMsg);

  return textDecoder.decode(encryptionKey.encrypt(paddedMsg));
};

// Helpers
const unwrap = (data: Uint8Array) => {
  let pad = data[data.length - 1];
  if (pad < 1 || pad > 32) {
    pad = 0;
  }
  return data.slice(0, data.length - pad);
};

const wrap = (data: Uint8Array) => {
  const blockSize = 32;
  const textLength = data.length;
  const amountToPad = blockSize - (textLength % blockSize);
  const result = new Uint8Array(textLength + amountToPad);
  result.set(data, 0);
  result.fill(amountToPad, textLength);
  return result;
};

const writeUInt32BE = (buffer: Uint8Array, offset: number, value: number) => {
  buffer[offset + 0] = (value >> 24) & 0xff;
  buffer[offset + 1] = (value >> 16) & 0xff;
  buffer[offset + 2] = (value >> 8) & 0xff;
  buffer[offset + 3] = value & 0xff;
};

const readUInt32BE = (buffer: Uint8Array, offset: number) => {
  return (
    (buffer[offset + 0] << 24) |
    (buffer[offset + 1] << 16) |
    (buffer[offset + 2] << 8) |
    buffer[offset + 3]
  );
};
