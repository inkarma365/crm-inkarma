import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const sha256 = (s: string | Buffer): string => createHash('sha256').update(s).digest('hex');

/** Token casuale url-safe; nel DB si salva solo l'hash. */
export const newToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

export const safeEqual = (a: string, b: string): boolean => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

export const hmacHex = (secret: string, payload: string): string =>
  createHmac('sha256', secret).update(payload).digest('hex');
