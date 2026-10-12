import { describe, expect, it } from 'vitest';
import { buildFarmPerformanceTrends, summarizeYearlyTrend, summarizeMonthlyTrend } from './farm-performance-trends';
import { buildFarmOperationsAnalytics } from './farm-operations-analytics';
const activities = [
  { activity_date: '2025-12-31', farm_id: 'a', block_id: 'a1', actual_cost: 100, actual_revenue: 60, harvest_quantity: 1000 },
  { activity_date: '2026-01-01', farm_id: 'a', block_id: 'a1', actual_cost: 20, actual_revenue: 100, harvest_quantity: 500 },
  { activity_date: '2026-12-31', farm_id: 'b', block_id: 'b1', actual_cost: 50, actual_revenue: 150, harvest_quantity: 1500 },
];
describe('farm performance trends', () => {
  it('starts at 2026, aggregates actual readings and preserves all twelve months', () => {
    const { yearly, monthly } = buildFarmPerformanceTrends(activities, 2026, 2026);
    expect(yearly.map(row => row.label)).toEqual(['2026', '2027', '2028', '2029', '2030']);
    expect(yearly[0]).toMatchObject({ cost: 70, revenue: 250, profit: 180, yieldTonnes: 2 });
    expect(monthly).toHaveLength(12);
    expect(monthly[0]).toMatchObject({ label: 'Jan', cost: 20, profit: 80 });
    expect(monthly[1]).toMatchObject({ label: 'Feb', records: 0, cost: 0 });
    expect(monthly[11]).toMatchObject({ label: 'Dec', cost: 50, profit: 100 });
    expect(buildFarmPerformanceTrends(activities, 2025, 2026).monthly[11].profit).toBe(-40);
  });
  it('preserves farm and block filtering', () => {
    const data = { farms: [{ id: 'a', name: 'Farm A' }, { id: 'b', name: 'Farm B' }], blocks: [{ id: 'a1', farm_id: 'a' }, { id: 'b1', farm_id: 'b' }], dailyActivities: activities };
    for (const filter of [{ farmId: 'a' }, { blockId: 'a1' }]) {
      const scoped = buildFarmOperationsAnalytics(data, filter).activities;
      expect(buildFarmPerformanceTrends(scoped, 2026, 2026).yearly[0].cost).toBe(20);
    }
  });
  it('reports undated records and uses valid creation dates', () => {
    const result = buildFarmPerformanceTrends([{ created_date: '2026-02-01', cost: 30 }, { actual_cost: 90 }], 2026, 2026);
    expect(result.undatedCount).toBe(1);
    expect(result.yearly[0].profit).toBe(-30);
    expect(result.monthly[1].cost).toBe(30);
  });
  it('extends automatically without losing the starting year or historical totals', () => {
    const nextYear = buildFarmPerformanceTrends(activities, 2027, 2027);
    expect(nextYear.yearly[0].cost).toBe(70);
    expect(nextYear.yearly[1]).toMatchObject({ label: '2027', cost: 0 });
    const later = buildFarmPerformanceTrends(activities, 2032, 2032);
    expect(later.yearly.map(row => row.label)).toEqual(['2026', '2027', '2028', '2029', '2030', '2031', '2032']);
    expect(later.yearly[0].cost).toBe(70);
  });
  it('includes future data years and does not invent zero readings for unrecorded future years', () => {
    const result = buildFarmPerformanceTrends([{ activity_date: '2033-01-01', actual_cost: 100, actual_revenue: 60 }], 2033, 2026);
    expect(result.yearly.at(-1)).toMatchObject({ label: '2033', profit: -40, records: 1 });
    expect(result.yearly[1]).toMatchObject({ label: '2027', cost: null, revenue: null, yieldTonnes: null, profit: null, records: 0 });
  });
});

describe('yearly performance summary', () => {
  it('does not claim growth from missing future readings', () => {
    const { yearly } = buildFarmPerformanceTrends([{ activity_date: '2026-01-01', actual_cost: 100 }], 2026, 2026);
    expect(summarizeYearlyTrend(yearly)).toContain('Year-to-year comparisons will appear');
    expect(summarizeYearlyTrend(yearly)).toContain('Loss recorded in 2026');
  });
  it('describes mixed performance and loss years from recorded results', () => {
    expect(summarizeYearlyTrend([
      { label: '2026', records: 1, revenue: 100, yieldTonnes: 2, profit: -10 },
      { label: '2027', records: 1, revenue: 200, yieldTonnes: 1, profit: 20 },
      { label: '2028', records: 0, revenue: null, yieldTonnes: null, profit: null },
    ])).toBe('From 2026 to 2027, revenue has increased and yield has decreased. Loss recorded in 2026.');
    expect(summarizeYearlyTrend([])).toContain('No recorded performance yet');
  });
});

describe('monthly performance summary', () => {
  it('summarizes recorded months without treating empty months as losses or growth', () => {
    const { monthly } = buildFarmPerformanceTrends([
      { activity_date: '2026-01-01', actual_cost: 100, actual_revenue: 50, harvest_quantity: 1000 },
      { activity_date: '2026-08-01', actual_cost: 100, actual_revenue: 150, harvest_quantity: 1000 },
    ], 2026, 2026);
    expect(summarizeMonthlyTrend(monthly)).toBe('From Jan to Aug, revenue has increased and yield has remained unchanged. Loss recorded in Jan.');
    expect(summarizeMonthlyTrend(buildFarmPerformanceTrends([], 2027, 2026).monthly)).toContain('No recorded performance for this year');
  });
  it('does not claim a monthly trend from one recorded month', () => {
    const { monthly } = buildFarmPerformanceTrends([{ activity_date: '2026-03-01', actual_cost: 10 }], 2026, 2026);
    expect(summarizeMonthlyTrend(monthly)).toContain('Month-to-month comparisons will appear');
    expect(summarizeMonthlyTrend(monthly)).toContain('Loss recorded in Mar');
  });
});
