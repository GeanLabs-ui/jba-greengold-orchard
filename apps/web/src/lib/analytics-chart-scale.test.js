import { describe, expect, it } from 'vitest';
import { formatChartValue, measurementScales, nonNegativeChartRows, numericChartAxis, positivePieSlices, projectionDomain } from './analytics-chart-scale';
import { aggregateChartPeriods, reportingDateKey, reportingYear, reportingYears } from './analytics-periods';

describe('data-driven chart presentation', () => {
  it('extends the reporting calendar at Accra midnight, independent of the timestamp offset', () => {
    const before = reportingYear(new Date('2036-01-01T00:59:59+01:00'));
    const after = reportingYear(new Date('2035-12-31T19:00:00-05:00'));
    expect(reportingYears(before)).toEqual([2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035]);
    expect(reportingYears(after)).toEqual([...reportingYears(before), 2036]);
    expect(reportingDateKey('2035-12-31')).toBe('2035-12-31');
    expect(reportingDateKey('2036-02-30T00:00:00Z')).toBeNull();
    expect(aggregateChartPeriods([{ date: '2035-12-31T19:00:00-05:00', value: 7 }], 'monthly', ['value']))
      .toMatchObject([{ key: '2036-01-01', value: 7 }]);
  });
  it('expands with signed values, uses bounded ticks and preserves small fractions', () => {
    const small = numericChartAxis([{ value: -0.15 }, { value: 0 }, { value: 0.21 }], ['value']);
    expect(small.domain[0]).toBeLessThan(-0.15);
    expect(small.domain[1]).toBeGreaterThan(0.21);
    expect(small.ticks).toContain(0);
    const large = numericChartAxis([{ value: 50_000 }, { value: 500_000 }], ['value']);
    expect(large.domain[1]).toBeGreaterThan(500_000);
    expect(large.ticks.length).toBeLessThan(12);
    expect(numericChartAxis([{ value: 0 }], ['value']).domain[0]).toBe(0);
    expect(numericChartAxis([{ value: null }, { value: '' }], ['value'])).toEqual({});
    expect(formatChartValue(-1500.25, 'GHS')).toBe('GH₵-1,500.25');
  });

  it('calculates independent scales for currency and weight', () => {
    const rows = [{ revenue: 750_000, yieldKg: 2.5 }, { revenue: -200, yieldKg: 0 }];
    expect(numericChartAxis(rows, ['revenue']).domain[0]).toBeLessThan(0);
    expect(numericChartAxis(rows, ['yieldKg']).domain[1]).toBeLessThan(10);
  });

  it('uses a signed logarithmic scale for outliers when enabled', () => {
    const rows = [{ value: -80_000 }, { value: 10 }, { value: 500_000 }];
    const axis = numericChartAxis(rows, ['value'], { compressOutliers: true });
    expect(axis.scale).toBe('symlog');
    expect(axis.ticks).toContain(0);
    expect(axis.ticks.some(tick => tick < 0)).toBe(true);
    expect(axis.domain[1]).toBeGreaterThan(500_000);
    expect(numericChartAxis(rows, ['value']).scale).toBeUndefined();
  });

  it('groups unsorted records into all five calendar intervals without turning missing amounts into zero', () => {
    const records = [
      { date: '2027-01-02', value: null },
      { date: '2026-12-31', value: -5 },
      { date: '2026-12-29', value: 5 },
      { date: '2026-02-30', value: 200 },
    ];
    expect(aggregateChartPeriods(records, 'daily', ['value']).map(row => row.value)).toEqual([5, -5, null]);
    expect(aggregateChartPeriods(records, 'weekly', ['value'])).toMatchObject([{ key: '2026-12-28', value: 0 }]);
    expect(aggregateChartPeriods(records, 'monthly', ['value']).map(row => row.value)).toEqual([0, null]);
    expect(aggregateChartPeriods(records, 'quarterly', ['value']).map(row => row.label)).toEqual(['Q4 2026', 'Q1 2027']);
    expect(aggregateChartPeriods(records, 'yearly', ['value']).map(row => row.label)).toEqual(['2026', '2027']);
  });

  it('omits only non-positive and missing pie slices', () => {
    expect(positivePieSlices([{ value: 0 }, { value: -20 }, { value: null }, { value: 100 }])).toEqual([{ value: 100 }]);
  });
});

it('floors displayed chart values at zero and preserves missing values and source data', () => {
  const rows = [{ label: 'Oct', cost: 674, profit: -674, yieldKg: -2 }, { label: 'Future', cost: null }];
  const plot = nonNegativeChartRows(rows, ['cost', 'profit', 'yieldKg']);
  expect(plot[0]).toEqual({ label: 'Oct', cost: 674, profit: 0, yieldKg: 0 });
  expect(plot[1].cost).toBeNull();
  expect(rows[0].profit).toBe(-674);
});

describe('projectionDomain', () => {
  it('measures low actual values against the projected target', () => {
    expect(projectionDomain([60000, 400000])([0, 5380])).toEqual([0, 400000]);
    expect(projectionDomain([10000])([0, 5.69])).toEqual([0, 10000]);
  });
  it('keeps over-target actuals and negative profit in view with whole endpoints', () => {
    expect(projectionDomain([60000, 400000])([-120.5, 926463.4])).toEqual([-200000, 1000000]);
  });
  it('handles zero and not-yet-loaded projections', () => {
    expect(projectionDomain([0, undefined])([0, 0])).toEqual([0, 1]);
  });
});

describe('measurementScales', () => {
  it('gives every grid row a fixed whole-number increment on both axes', () => {
    const scales = measurementScales([{ cost: 6485269, revenue: 1890091, profit: -4595178, yieldKg: 5690 }], { cost: 60000, revenue: 400000, yield: 10000 });
    expect(scales.money.step).toBe(1000000);
    expect(scales.money.ticks).toEqual([-5000000, -4000000, -3000000, -2000000, -1000000, 0, 1000000, 2000000, 3000000, 4000000, 5000000, 6000000, 7000000]);
    expect(scales.yield.ticks).toHaveLength(scales.money.ticks.length);
    expect(scales.yield.step).toBe(1000);
  });
  it('uses 100-unit rows when the values fit that scale', () => {
    const scales = measurementScales([{ cost: 900 }], { cost: 1000, yield: 1000 });
    expect(scales.money.ticks).toEqual([0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]);
    expect(scales.yield.ticks).toEqual(scales.money.ticks);
  });
  it('keeps kilogram readings above the target inside the yield axis', () => {
    const scales = measurementScales([{ cost: 1000, yieldKg: 1500000 }], { yield: 1000000 });
    expect(scales.yield.domain[1]).toBeGreaterThanOrEqual(1500000);
    expect(scales.yield.step).toBeGreaterThanOrEqual(100000);
  });
});
