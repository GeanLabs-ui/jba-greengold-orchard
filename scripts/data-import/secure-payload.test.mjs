import { describe, it, expect } from 'vitest';
import { seal, unseal, fingerprint } from './secure-payload.mjs';

describe('private data migration payloads', () => {
  const key = 'ab'.repeat(32);
  it('preserves text, null values and separate identical source rows', () => {
    const source = [{ row: 17, cost: 330, text: 'Exact spelling ', status: null }, { row: 18, cost: 330, text: 'Exact spelling ', status: null }];
    expect(unseal(seal(source, key), key)).toEqual(source);
  });
  it('rejects changed ciphertext and incorrect keys', () => {
    const payload = JSON.parse(seal({ private: 'sample' }, key));
    const bytes = Buffer.from(payload.ciphertext, 'base64');
    bytes[0] ^= 1;
    payload.ciphertext = bytes.toString('base64');
    expect(() => unseal(JSON.stringify(payload), key)).toThrow();
    expect(() => unseal(seal({}, key), 'cd'.repeat(32))).toThrow();
  });
  it('fingerprints equivalent JSON consistently and detects edits', () => {
    expect(fingerprint({ a: 1, b: 2 })).toBe(fingerprint({ b: 2, a: 1 }));
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
  });
});
