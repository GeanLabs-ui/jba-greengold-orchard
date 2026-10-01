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
    expect(html.match(/role="button"/g)).toHaveLength(7);
    expect(liveRows).toEqual([{ name: 'Administration', value: 25 }, { name: 'Materials', value: 75 }]);
  });
  it('shows all seven live cost types, including tiny amounts and missing zero categories', () => {
    vi.stubEnv('DEV', false);
    const html = renderToStaticMarkup(<ExpensePhotoChart rows={[
      { name: 'Materials', value: 999 }, { name: 'Tools', value: 0.01 },
    ]} total={999.01} />);
    const legend = html.slice(html.indexOf('<ul class="expense-category-legend"'));
    for (const { name } of ACTIVITY_COST_TYPES) expect(legend).toContain(`>${name}</span>`);
    expect(legend.match(/<button /g)).toHaveLength(7);
    expect(legend).toContain('GH₵ 0.01');
    expect(legend).toContain('&lt;0.1%');
    expect(legend.match(/>GH₵ 0<\/span>/g)).toHaveLength(5);
    expect(html.match(/role="button"/g)).toHaveLength(2);
  });
  it('keeps all categories visible for an empty expense total', () => {
    vi.stubEnv('DEV', false);
    const html = renderToStaticMarkup(<ExpensePhotoChart rows={[]} total={0} />);
    const legend = html.slice(html.indexOf('<ul class="expense-category-legend"'));
    expect(legend.match(/>0%<\/span>/g)).toHaveLength(7);
    expect(html).not.toMatch(/NaN|Infinity/);
  });
});
