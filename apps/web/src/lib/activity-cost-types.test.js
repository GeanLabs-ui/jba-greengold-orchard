import { describe, expect, it } from 'vitest';
import { ACTIVITY_COST_TYPES, buildCostTypeBreakdown, normalizeCostType, formatCostPercentage } from './activity-cost-types';
import { buildFarmOperationsAnalytics } from './farm-operations-analytics';

describe('cost type breakdown', () => {
  it('keeps small expenses visible in percentages shared by the dashboard and analytics', () => {
    expect(formatCostPercentage(6475174, 6485269)).toBe('99.8%');
    expect(formatCostPercentage(3630, 6485269)).toBe('<0.1%');
    expect(formatCostPercentage(0, 6485269)).toBe('0%');
    expect(formatCostPercentage(0, 0)).toBe('0%');
  });
  it('groups by the recorded cost type, never the farm activity category, preserving the total', () => {
    const analytics = buildFarmOperationsAnalytics({ dailyActivities: [
      { actual_cost: 100, cost_type: 'Food', category: 'Pruning' },
      { actual_cost: 25, cost_type: ' food ', category: 'Weeding' },
      { actual_cost: 50, cost_type: 'Admin', category: 'Spraying' },
      { actual_cost: 10, category: 'Weeding' },
      { actual_cost: 15, cost_type: 'Unclassified', category: 'Labour' },
    ] });
    const breakdown = buildCostTypeBreakdown(analytics.costRows);
    expect(breakdown.find((row) => row.name === 'Food/Ent').value).toBe(125);
    expect(breakdown.find((row) => row.name === 'Administration').value).toBe(50);
    expect(breakdown.find((row) => row.name === 'Others').value).toBe(25);
    expect(breakdown.reduce((sum, row) => sum + row.value, 0)).toBe(analytics.totalCost);
    expect(analytics.costRows.map((row) => row.costCategory)).not.toContain('Weeding');
  });

  it('keeps every dropdown type and its fixed color, including zero-cost types', () => {
    const rows = buildCostTypeBreakdown([{ cost_type: 'Labour', value: 10 }]);
    expect(rows.map((row) => row.name)).toEqual(ACTIVITY_COST_TYPES.map((type) => type.name));
    expect(rows.map((row) => row.name)).toEqual(['Administration', 'Materials', 'Labor', 'Tools', 'Transportation', 'Food/Ent', 'Others']);
    expect(new Set(rows.map((row) => row.color)).size).toBe(7);
    expect(rows.find((row) => row.name === 'Food/Ent')).toMatchObject({ value: 0, color: '#22c55e' });
    expect(rows.find((row) => row.name === 'Labor')).toMatchObject({ value: 10, color: '#ec4899' });
  });

  it('keeps legacy cost records in the renamed categories without losing their amounts', () => {
    expect(['Labour', 'Transport', 'Food', 'Other', 'Fuel', 'Equipment', 'Inputs'].map(normalizeCostType))
      .toEqual(['Labor', 'Transportation', 'Food/Ent', 'Others', 'Others', 'Others', 'Others']);
    const rows = buildCostTypeBreakdown(['Labour', 'Transport', 'Food', 'Other', 'Fuel', 'Equipment', 'Inputs'].map((cost_type) => ({ cost_type, value: 10 })));
    expect(rows.reduce((sum, row) => sum + row.value, 0)).toBe(70);
  });
});
