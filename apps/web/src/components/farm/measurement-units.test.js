import { describe, expect, it } from 'vitest';
import { massDisplay, kpiMassFields, kpiMassStorage, objectiveMassDisplay, inventoryMassDisplay, inventoryMassStorage, projectionDisplayValue, projectionStorageValues } from './measurement-units';

describe('kilogram screens with legacy storage', () => {
  it('converts legacy KPI values once, preserves nulls and ratios, and saves back in the original unit', () => {
    const original = { unit: 'tonnes', target: 12, actual: 10.5, baseline: 0, manual_actual: null, variance: -1.5, achievement: 87.5 };
    const display = massDisplay(original, kpiMassFields);
    expect(display).toMatchObject({ unit: 'kg', target: 12000, actual: 10500, baseline: 0, manual_actual: null, variance: -1500, achievement: 87.5 });
    expect(massDisplay(display, kpiMassFields)).toEqual(display);
    expect(kpiMassStorage(display, original)).toEqual({ ...original, upper: undefined });
    expect(original.target).toBe(12);
  });
  it('converts objective allocation results together with their KPI units', () => {
    const result = objectiveMassDisplay({ kpis: [{ unit: 'tonnes', target: 2 }], contributions: [{ unit: 'tonnes', target: 1, actual: 0.5 }] });
    expect(result.kpis[0].target).toBe(2000);
    expect(result.contributions[0]).toMatchObject({ unit: 'kg', target: 1000, actual: 500 });
  });
  it('converts legacy inventory form quantities and round-trips to original stock units', () => {
    const original = { unit: 'tonnes', quantity_purchased: 2, remaining_quantity: '1.5 tonnes', minimum_stock_threshold: 0.25, purchase_cost: 50 };
    const display = inventoryMassDisplay(original);
    expect(display).toMatchObject({ unit: 'kg', quantity_purchased: 2000, remaining_quantity: 1500, minimum_stock_threshold: 250, purchase_cost: 50 });
    expect(inventoryMassStorage(display, original)).toMatchObject({ unit: 'tonnes', quantity_purchased: 2, remaining_quantity: 1.5, minimum_stock_threshold: 0.25 });
    expect(inventoryMassDisplay({ remaining_quantity: '2 tonnes' })).toMatchObject({ unit: 'kg', remaining_quantity: 2000 });
  });
  const defaults = { cost: { defaultValue: 60000 }, yield: { defaultValue: 10000000 } };
  it('reads unmarked legacy projections as tonnes, preserving explicit zero and kg markers', () => {
    expect(projectionDisplayValue({ yield: 12 }, 'yield', defaults)).toBe(12000);
    expect(projectionDisplayValue({ yield: 0 }, 'yield', defaults)).toBe(0);
    expect(projectionDisplayValue({ yield: 12000, yield_unit: 'kg' }, 'yield', defaults)).toBe(12000);
    expect(projectionDisplayValue({}, 'yield', defaults)).toBe(10000000);
    expect(projectionDisplayValue({ cost: 60 }, 'cost', defaults)).toBe(60);
  });
  it('marks new yield saves as kg and leaves legacy yield untouched when editing money', () => {
    const legacy = { id: 'old', yield: 12 };
    const costPatch = projectionStorageValues('cost', 75, defaults, legacy);
    expect(costPatch).toEqual({ cost: 75 });
    expect(projectionDisplayValue({ ...legacy, ...costPatch }, 'yield', defaults)).toBe(12000);
    const yieldPatch = projectionStorageValues('yield', 15000, defaults, legacy);
    expect(yieldPatch).toEqual({ yield: 15000, yield_unit: 'kg' });
    expect(projectionDisplayValue({ ...legacy, ...yieldPatch }, 'yield', defaults)).toBe(15000);
    expect(projectionStorageValues('cost', 75, defaults, null)).toEqual({ cost: 75, yield: 10000000, yield_unit: 'kg' });
  });
});
