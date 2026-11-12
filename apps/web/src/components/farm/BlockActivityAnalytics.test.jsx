import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BlockActivityAnalytics from './BlockActivityAnalytics';

describe('block activity costs', () => {
  it('shows net recorded cost by activity category and the signed total', () => {
    const html = renderToStaticMarkup(<BlockActivityAnalytics activities={[
      { category: 'Fertilizer Application', actual_cost: 60.25, cost: 600 },
      { category: 'Fertilizer Application', actual_cost: 0, cost: 100 },
      { category: 'Fertilizer Application', cost: -10 },
      { category: 'Pruning', actual_cost: -4.5 },
      { category: 'Irrigation', projected_cost: 400 },
    ]} />);

    expect(html).toContain('Activity Cost by Category');
    expect(html).toContain('GH₵45.75 total');
    expect(html).toContain('Fertilizer Application <strong>GH₵50.25');
    expect(html).toContain('Pruning <strong>GH₵-4.5');
    expect(html).not.toContain('Irrigation <strong>');
  });

  it('shows a recorded-cost empty state when all category totals are zero', () => {
    const html = renderToStaticMarkup(<BlockActivityAnalytics activities={[
      { category: 'Pruning', actual_cost: 0 },
    ]} />);

    expect(html).toContain('GH₵0 total');
    expect(html).toContain('No actual cost recorded for this period.');
  });
});
