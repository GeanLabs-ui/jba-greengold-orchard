import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function keyBuffer(key) {
  if (!/^[a-f0-9]{64}$/i.test(key || '')) throw new Error('A 32-byte import encryption key is required');
  return Buffer.from(key, 'hex');
}
export function seal(value, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBuffer(key), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return JSON.stringify({ version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') });
}
export function unseal(envelope, key) {
  const value = JSON.parse(envelope);
  if (value.version !== 1) throw new Error('Unsupported encrypted payload version');
  const decipher = createDecipheriv('aes-256-gcm', keyBuffer(key), Buffer.from(value.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
}
function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
