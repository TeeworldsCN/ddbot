import { crypto } from 'jsr:@std/crypto';
import { encodeBase64Url } from 'jsr:@std/encoding/base64url';
import { encodeHex, decodeHex } from 'jsr:@std/encoding/hex';

const secret = Deno.env.get('QQ_SECRET');
const textEncoder = new TextEncoder();

let active = true;
if (!secret) {
  console.warn('QQ_SECRET is not set');
  active = false;
}
export const isActive = () => active;

let privateKey = secret;
if (privateKey) {
  while (privateKey.length < 32) {
    privateKey += privateKey.slice(0, 32 - privateKey.length);
  }
}

let privKey: CryptoKey | undefined;
let pubKey: CryptoKey | undefined;

if (privateKey) {
  const jwk = {
    d: encodeBase64Url(new TextEncoder().encode(secret)),
    key_ops: ['sign'],
    crv: 'Ed25519',
    ext: true,
    kty: 'OKP',
  };

  privKey = await crypto.subtle.importKey('jwk', jwk, { name: 'ed25519' }, true, ['sign']);
  const exported = await crypto.subtle.exportKey('jwk', privKey);
  exported.key_ops = ['verify'];
  delete exported.d;
  pubKey = await crypto.subtle.importKey('jwk', exported, { name: 'ed25519' }, false, ['verify']);
}

export const sign = async (msg: string, timestamp: string) => {
  if (!privKey) throw new Error('No private key');
  const body = textEncoder.encode(timestamp + msg);
  return encodeHex(await crypto.subtle.sign({ name: 'ed25519' }, privKey, body));
};

export const verify = (msg: string, timestamp: string, sig: string) => {
  if (!pubKey) throw new Error('No public key');
  const body = textEncoder.encode(timestamp + msg);
  const signiture = decodeHex(sig);
  return crypto.subtle.verify({ name: 'ed25519' }, pubKey, signiture, body);
};
