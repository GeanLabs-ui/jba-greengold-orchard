import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSafeRedirectTarget } from './safe-redirect';

describe('getSafeRedirectTarget', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: 'https://staging.example.com' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps same-origin paths including their query and fragment', () => {
    expect(getSafeRedirectTarget('/portal/orders?status=open#latest')).toBe('/portal/orders?status=open#latest');
  });

  it('rejects absolute and backslash-based cross-origin destinations', () => {
    expect(getSafeRedirectTarget('https://attacker.example/path')).toBe('/');
    expect(getSafeRedirectTarget('\\\\attacker.example/path')).toBe('/');
  });
});
