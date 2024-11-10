import { crypto } from 'jsr:@std/crypto';
import { encodeBase64Url } from 'jsr:@std/encoding/base64url';
import { decodeHex } from 'jsr:@std/encoding/hex';

const proxyUrl = Deno.env.get('IMGPROXY_URL');
const key = Deno.env.get('IMGPROXY_KEY');
const salt = Deno.env.get('IMGPROXY_SALT');

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const hmacKey = key
  ? await crypto.subtle.importKey('raw', decodeHex(key), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
    ])
  : undefined;

const saltStr = salt ? textDecoder.decode(decodeHex(salt)) : undefined;
console.log(saltStr);

export const proxy = async (url: string) => {
  if (!proxyUrl || !key || !salt || !hmacKey || !saltStr) {
    return new URL(url);
  }

  const encoded = encodeBase64Url(textEncoder.encode(url));
  const salted = textEncoder.encode(saltStr + '/' + encoded);
  const signature = encodeBase64Url(await crypto.subtle.sign('HMAC', hmacKey, salted));
  return new URL(`${signature}/${encoded}`, proxyUrl);
};
