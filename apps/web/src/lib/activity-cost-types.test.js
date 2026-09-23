import { describe, expect, it } from 'vitest';
import { ACTIVITY_COST_TYPES, buildCostTypeBreakdown } from './activity-cost-types';
import { buildFarmOperationsAnalytics } from './farm-operations-analytics';

describe('cost type breakdown', () => {
  it('groups by the recorded cost type, never the farm activity category, preserving the total', () => {
    const analytics = buildFarmOperationsAnalytics({ dailyActivities: [
      { actual_cost: 100, cost_type: 'Food', category: 'Pruning' },
      { actual_cost: 25, cost_type: ' food ', category: 'Weeding' },
      { actual_cost: 50, cost_type: 'Admin', category: 'Spraying' },
      { actual_cost: 10, category: 'Weeding' },
      { actual_cost: 15, cost_type: 'Unclassified', category: 'Labour' },
    ] });
    const breakdown = buildCostTypeBreakdown(analytics.costRows);
    expect(breakdown.find((row) => row.name === 'Food').value).toBe(125);
    expect(breakdown.find((row) => row.name === 'Administration').value).toBe(50);
    expect(breakdown.find((row) => row.name === 'Other').value).toBe(25);
    expect(breakdown.reduce((sum, row) => sum + row.value, 0)).toBe(analytics.totalCost);
    expect(analytics.costRows.map((row) => row.costCategory)).not.toContain('Weeding');
  });

  it('keeps every dropdown type and its fixed color, including zero-cost types', () => {
    const rows = buildCostTypeBreakdown([{ cost_type: 'Labour', value: 10 }]);
    expect(rows.map((row) => row.name)).toEqual(ACTIVITY_COST_TYPES.map((type) => type.name));
    expect(rows).toHaveLength(10);
    expect(new Set(rows.map((row) => row.color)).size).toBe(10);
    expect(rows.find((row) => row.name === 'Food')).toMatchObject({ value: 0, color: '#22c55e' });
    expect(rows.find((row) => row.name === 'Labour')).toMatchObject({ value: 10, color: '#ec4899' });
  });
});
