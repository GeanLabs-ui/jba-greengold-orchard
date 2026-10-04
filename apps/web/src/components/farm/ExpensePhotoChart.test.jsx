import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ExpensePhotoChart from './ExpensePhotoChart';

describe('live expense chart', () => {
  it('renders all seven seeded slices only when explicitly requested', () => {
    const html = renderToStaticMarkup(<ExpensePhotoChart seedData rows={[{ name: 'Labor', value: 6475174 }]} />);
    expect(html).not.toContain('Sample distribution · actual recorded total');
    expect(html).toContain('GH₵ 6,475,174');
    expect(html).not.toContain('GH₵ 100,000');
    expect(html.match(/role="button"/g)).toHaveLength(7);
    expect(html).toContain('Select Labor: 100%, GH₵ 6,475,174');
    expect(html).toContain('Select Others: 0%, GH₵ 0');
    expect(html).toContain('All recorded dates');
  });
  it('updates selected category details when new task-log costs arrive, including clearing them to zero', () => {
    const render = rows => renderToStaticMarkup(<ExpensePhotoChart seedData rows={rows} selectionName="Tools" />);
    const before = render([{ name: 'Labor', value: 600 }, { name: 'Tools', value: 100 }]);
    const after = render([{ name: 'Labor', value: 600 }, { name: 'Tools', value: 300 }]);
    const cleared = render([{ name: 'Labor', value: 600 }, { name: 'Tools', value: 0 }]);
    expect(before).toContain('Select Tools: 14%, GH₵ 100');
    expect(after).toContain('Select Tools: 33%, GH₵ 300');
    expect(after).toContain('GH₵ 900');
    expect(cleared).toContain('Select Tools: 0%, GH₵ 0');
    expect(cleared).toContain('GH₵ 600');
    expect(after).not.toContain('GH₵ 10,000');
  });
  it('keeps the actual total at zero when seed slices are shown without recorded costs', () => {
    const html = renderToStaticMarkup(<ExpensePhotoChart seedData rows={[]} />);
    expect(html).toContain('GH₵ 0');
    expect(html.match(/role="button"/g)).toHaveLength(7);
  });
  it('renders supplied task-log costs even in development and never uses the fixed preview', () => {
    const html = renderToStaticMarkup(<ExpensePhotoChart rows={[{ name: 'Labor', value: 600 }, { name: 'Tools', value: 100 }]} total={100000} rangeLabel="2026" />);
    expect(html).toContain('GH₵ 700');
    expect(html).toContain('GH₵ 600');
    expect(html).not.toContain('100,000');
    expect(html).toContain('2026');
  });
  it('shows zero for an empty task log', () => {
    expect(renderToStaticMarkup(<ExpensePhotoChart rows={[]} />)).toContain('GH₵ 0');
  });
});
