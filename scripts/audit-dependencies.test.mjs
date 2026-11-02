import { expect, it } from 'vitest';
import { assessAudit } from './audit-dependencies.mjs';

const legacy = { via: [{ name: 'minimatch', url: 'https://github.com/advisories/GHSA-g3hv-75wg-m249' }] };
it('requires the verified legacy source for the reviewed advisory and its dependency chain', () => {
  const report = { vulnerabilities: { minimatch: legacy, eslint: { via: ['minimatch'] } } };
  expect(assessAudit(report, true)).toEqual([]);
  expect(assessAudit(report, false)).toEqual(['minimatch', 'eslint']);
});
it('rejects new advisories even when the legacy source matches', () => {
  expect(assessAudit({ vulnerabilities: { minimatch: { via: [...legacy.via, { name: 'minimatch', url: 'new-advisory' }] } } }, true)).toEqual(['minimatch']);
});
it('rejects unresolvable or cyclic vulnerability chains', () => {
  expect(assessAudit({ vulnerabilities: { a: { via: ['b'] }, b: { via: ['a'] } } }, true)).toEqual(['a', 'b']);
});
