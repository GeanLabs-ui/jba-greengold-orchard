import { describe, expect, it } from 'vitest';
import { measurementScales, projectionDomain } from './analytics-chart-scale';

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
    const scales = measurementScales([{ cost: 6485269, revenue: 1890091, profit: -4595178, yieldTonnes: 5.69 }], { cost: 60000, revenue: 400000, yield: 10000 });
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
});
