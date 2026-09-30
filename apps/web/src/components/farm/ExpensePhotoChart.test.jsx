import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ExpensePhotoChart from './ExpensePhotoChart';

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
});
