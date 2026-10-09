import { describe, expect, it } from 'vitest';
import { achievement, calculateCycle, calculateObjective, cycleSchema, objectiveSchema, type Log } from './objective-model.js';

const objective = () => objectiveSchema.parse({ id: 'o', name: 'Increase mango production', code: 'OBJ-2026-001', category: 'Production', owner: 'Manager', start: '2026-01-01', end: '2026-12-31', status: 'Active', priority: 'High', weight: 100, budget: 100,
  kpis: [{ id: 'k', name: 'Production', unit: 'tonnes', target: 10, weight: 100, direction: 'higher', source: 'task', metric: 'yield' }] });
const log = (override: Partial<Log> = {}): Log => ({ id: 'l', related_objective: 'o', related_kpi: 'k', activity_date: '2026-06-01', status: 'Completed', log_entry: true, output_quantity_kg: 7800, actual_cost: 70, actual_revenue: 100, ...override });
const now = new Date('2026-06-30T12:00:00Z');
describe('Objective calculations and integrity', () => {
  it('keeps execution separate from business outcome', () => {
    const result = calculateObjective(objective(), 2026, [log()], now);
    expect(result.execution).toBe(100);
    expect(result.outcome).toBe(78);
    expect(result.kpis[0].actual).toBe(7.8);
    expect(result.kpis[0].variance).toBeCloseTo(-2.2);
  });
  it('includes both farms in A&B scope while excluding company-only logs', () => {
    const o = objective(); o.farm_id = '__all_farms__';
    const result = calculateObjective(o, 2026, [log({ id: 'a', farm_id: 'farm-a', output_quantity_kg: 4000 }), log({ id: 'b', farm_id: 'farm-b', output_quantity_kg: 6000 }), log({ id: 'admin', output_quantity_kg: 99999 })], now);
    expect(result.logs).toHaveLength(2);
    expect(result.outcome).toBe(100);
  });
  it('honors lower-is-better and range KPIs without division by zero', () => {
    expect(achievement(0, 5, 'lower')).toBe(100);
    expect(achievement(10, 5, 'lower')).toBe(50);
    expect(achievement(65, 60, 'range', 70)).toBe(100);
    expect(achievement(30, 60, 'range', 70)).toBe(50);
    expect(achievement(140, 60, 'range', 70)).toBe(50);
  });
  it('deduplicates source IDs and excludes future, cancelled and archived logs', () => {
    const result = calculateObjective(objective(), 2026, [log(), log(), log({ id: 'future', activity_date: '2027-01-01' }), log({ id: 'cancel', status: 'Cancelled' }), log({ id: 'archive', archived_at: '2026-06-01' })], now);
    expect(result.logs).toHaveLength(1);
    expect(result.kpis[0].actual).toBe(7.8);
    expect(result.cost).toBe(70);
  });
  it('honors explicit zero after an edited Task Log and recalculates deleted sources', () => {
    expect(calculateObjective(objective(), 2026, [log({ output_quantity_kg: 0, harvest_quantity: 99999, actual_cost: 0, cost: 999 })], now)).toMatchObject({ outcome: 0, cost: 0 });
    expect(calculateObjective(objective(), 2026, [], now).outcome).toBeNull();
  });
  it('does not silently turn missing data into achievement', () => {
    const result = calculateObjective(objective(), 2026, [log({ related_kpi: '' })], now);
    expect(result.execution).toBe(100);
    expect(result.outcome).toBeNull();
  });
  it('isolates farm/block scopes and sub-objective scopes', () => {
    const o = objective(); o.farm_id = 'f'; o.block_id = 'b';
    expect(calculateObjective(o, 2026, [log({ farm_id: 'other', block_id: 'b' })], now).logs).toHaveLength(0);
    o.subs = [{ id: 's', name: 'Orchard productivity', weight: 100, owner: '', description: '', farm_id: 'f', block_id: 'b2', variety: '' }]; o.kpis[0].sub_id = 's';
    expect(calculateObjective(o, 2026, [log({ farm_id: 'f', block_id: 'b' })], now).outcome).toBeNull();
  });
  it('calculates weighted annual results rather than an unweighted average', () => {
    const a = objective(), b = objective(); a.weight = 80; b.weight = 20; b.id = 'o2'; b.code = 'OBJ-2026-002'; b.kpis[0].id = 'k2';
    const cycle = cycleSchema.parse({ year: 2026, revision: 0, weighted: true, objectives: [a, b] });
    const result = calculateCycle(cycle, [log({ output_quantity_kg: 10000 }), log({ id: 'l2', related_objective: 'o2', related_kpi: 'k2', output_quantity_kg: 5000 })], now);
    expect(result.score).toBe(90);
  });
  it('rejects invalid weights, dates, units, duplicate IDs and unreasoned manual actuals', () => {
    expect(cycleSchema.safeParse({ year: 2026, revision: 0, weighted: true, objectives: [{ ...objective(), weight: 80 }] }).success).toBe(false);
    expect(cycleSchema.safeParse({ year: 2027, revision: 0, weighted: false, objectives: [objective()] }).success).toBe(false);
    const o = objective();
    expect(objectiveSchema.safeParse({ ...o, kpis: [{ ...o.kpis[0], unit: '' }] }).success).toBe(false);
    expect(objectiveSchema.safeParse({ ...o, kpis: [o.kpis[0], o.kpis[0]] }).success).toBe(false);
    expect(objectiveSchema.safeParse({ ...o, kpis: [{ ...o.kpis[0], source: 'manual', manual_actual: 9, reason: '' }] }).success).toBe(false);
  });
  it('raises health for critical blockers despite fully achieved results', () => {
    const o = objective(); o.blockers = [{ id: 'b', name: 'Pump failure', severity: 'Critical', owner: 'Manager', due: '', status: 'Open', action: '', resolution: '', description: '', farm_id: '', block_id: '', variety: '' }];
    expect(calculateObjective(o, 2026, [log({ output_quantity_kg: 10000 })], now).health).toBe('Behind');
  });
  it('reads automatic results from eligible logs but requires explicit Task KPI alignment', () => {
    const o = objective(); o.kpis[0].source = 'automatic';
    expect(calculateObjective(o, 2026, [log({ related_objective: '', related_kpi: '' })], now).outcome).toBe(78);
    o.kpis[0].source = 'task';
    expect(calculateObjective(o, 2026, [log({ related_objective: '', related_kpi: '' })], now).outcome).toBeNull();
  });
  it('applies verified hybrid adjustments and manual results', () => {
    const o = objective(); o.kpis[0].source = 'hybrid'; o.kpis[0].manual_actual = 0.2; o.kpis[0].reason = 'Weighbridge reconciliation';
    expect(calculateObjective(o, 2026, [log()], now).outcome).toBe(80);
    o.kpis[0].source = 'manual'; o.kpis[0].manual_actual = 9;
    expect(calculateObjective(o, 2026, [], now).outcome).toBe(90);
  });
  it('calculates farm/block allocations using the KPI source records', () => {
    const o = objective(); o.allocations = [{ id: 'a', farm_id: 'f', block_id: 'b', kpi_id: 'k', target: 8 }];
    const result = calculateObjective(o, 2026, [log({ farm_id: 'f', block_id: 'b' })], now);
    expect(result.contributions[0]).toMatchObject({ actual: 7.8, achievement: 97.5, source_ids: ['l'] });
  });
});
