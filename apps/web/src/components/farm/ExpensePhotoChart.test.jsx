import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ExpensePhotoChart from './ExpensePhotoChart';
import { ACTIVITY_COST_TYPES } from '@/lib/activity-cost-types';

afterEach(() => vi.unstubAllEnvs());
describe('expense chart environment data', () => {
  const liveRows = [{ name: 'Administration', value: 25 }, { name: 'Materials', value: 75 }];
  it('uses the supplied live amounts in production mode', () => {
    vi.stubEnv('DEV', false);
    const html = renderToStaticMarkup(<ExpensePhotoChart rows={liveRows} total={100} selectionName="Materials" />);
    expect(html).toContain('GH₵ 100');
    expect(html).toContain('GH₵ 75');
    expect(html).toContain('75%');
    expect(html).not.toContain('Development sample');
    expect(html).not.toContain('Select expense category');
  });
  it('previews all seven categories without altering supplied records', () => {
    vi.stubEnv('DEV', true);
    const html = renderToStaticMarkup(<ExpensePhotoChart rows={liveRows} total={100} selectionName="Materials" />);
    expect(html).toContain('GH₵ 100,000');
    expect(html).toContain('GH₵ 18,000');
    expect(html).toContain('18%');
    expect(html.match(/data-cost-category=/g)).toHaveLength(7);
    expect(liveRows).toEqual([{ name: 'Administration', value: 25 }, { name: 'Materials', value: 75 }]);
  });
  it('shows all seven live cost types, including tiny amounts and missing zero categories', () => {
    vi.stubEnv('DEV', false);
    const html = renderToStaticMarkup(<ExpensePhotoChart rows={[
      { name: 'Materials', value: 999 }, { name: 'Tools', value: 0.01 },
    ]} total={999.01} />);
    const diagram = html.slice(0, html.indexOf('</svg>'));
    for (const { name } of ACTIVITY_COST_TYPES) expect(diagram).toContain(`data-cost-category="${name}"`);
    expect(diagram.match(/data-cost-category=/g)).toHaveLength(7);
    expect(diagram).toContain('GH₵ 0.01');
    expect(diagram).toContain('&lt;0.1%');
    expect(diagram.match(/>0%<\/text>/g)).toHaveLength(5);
    expect(html).not.toContain('expense-category-legend');
    expect(html).toContain('viewBox="-15 -15 390 350"');
  });
  it('keeps all categories visible for an empty expense total', () => {
    vi.stubEnv('DEV', false);
    const html = renderToStaticMarkup(<ExpensePhotoChart rows={[]} total={0} />);
    expect(html.match(/data-cost-category=/g)).toHaveLength(7);
    expect(html.match(/>0%<\/text>/g)).toHaveLength(7);
    expect(html).not.toMatch(/NaN|Infinity/);
  });
});
