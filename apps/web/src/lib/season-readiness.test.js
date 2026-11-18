import { describe, expect, it } from 'vitest';
import { seasonReadiness, seasonTaskStage, taskLogTaskLink } from './season-readiness';

const farm = { id: 'a', name: 'Farm A' };
const farms = [farm, { id: 'b', name: 'Farm B' }];
const blocks = [
  { id: 'a1', farm_id: 'a', block_code: 'A1', status: 'active' },
  { id: 'a2', farm_id: 'a', block_code: 'A2', status: 'inactive' },
  { id: 'b1', farm_id: 'b', block_code: 'B1', status: 'active' },
];
const row = { id: 'log', block_id: 'a1', category: 'Fertilizer Application', activity_date: '2026-03-04', status: 'Completed' };
const summarize = (records, year = 'all') => seasonReadiness(records, { farm, farms, blocks, year });

describe('season readiness from Daily Task Log records', () => {
  it('recognizes recorded stages, spelling variants and legacy induction descriptions', () => {
    expect(seasonTaskStage(row)).toBe('fertilizer');
    expect(seasonTaskStage({ category: 'Fertilisation' })).toBe('fertilizer');
    expect(seasonTaskStage({ category: 'Flower Induction' })).toBe('flowering');
    expect(seasonTaskStage({ category: 'Spraying', title: 'Flower induction on A1' })).toBe('flowering');
    expect(seasonTaskStage({ category: 'Harvesting' })).toBe('harvest');
    expect(seasonTaskStage({ category: 'Packing', title: 'Post-harvest packing' })).toBeNull();
    expect(seasonTaskStage({ category: 'Weeding', notes: 'Harvest next month' })).toBeNull();
    expect(seasonTaskStage({ category: 'Harvesting', title: 'Fertilizer equipment nearby' })).toBe('harvest');
  });

  it('uses task-log harvest records rather than scheduled harvest periods', () => {
    expect(summarize([{ ...row, category: 'Harvesting' }]).harvest.records).toHaveLength(1);
    expect(summarize([]).harvest.records).toEqual([]);
  });

  it('scopes records to the farm, honors linked blocks over stale farm names, and includes shared tasks once', () => {
    const result = summarize([row, row,
      { ...row, id: 'other', block_id: 'b1', farm_id: 'a' },
      { ...row, id: 'shared', block_id: '', shared_scope: 'A1, A2, B1' },
      { ...row, id: 'unassigned', block_id: '' },
    ]);
    expect(result.fertilizer.records.map(r => r.id).sort()).toEqual(['log', 'shared']);
    expect(result.fertilizer.count).toBe(2);
    expect(result.total).toBe(2);
  });

  it('filters the exact selected year, including both boundaries', () => {
    const rows = ['2025-12-31', '2026-01-01', '2026-12-31', '2027-01-01'].map((date, id) => ({ ...row, id: String(id), activity_date: date }));
    expect(summarize(rows, '2026').fertilizer.records.map(r => r.id)).toEqual(['2', '1']);
    expect(summarize(rows).fertilizer.records).toHaveLength(4);
  });

  it('counts unique blocks separately from tasks and measures task completion', () => {
    const result = summarize([row,
      { ...row, id: 'pending', status: 'Pending' },
      { ...row, id: 'progress', status: 'in_progress', block_id: 'a2' },
    ]).fertilizer;
    expect(result).toMatchObject({ count: 2, completed: 1, pending: 1, inProgress: 1, percent: 33 });
    expect(result.records).toHaveLength(3);
  });

  it('keeps farm-level records visible without inventing block assignments', () => {
    const result = summarize([{ ...row, block_id: '', farm_id: 'a' }]).fertilizer;
    expect(result.records).toHaveLength(1);
    expect(result.count).toBe(0);
    expect(result.farmLevelCount).toBe(1);
  });

  it('reflects edited and deleted tasks without stale totals', () => {
    expect(summarize([row]).fertilizer.completed).toBe(1);
    expect(summarize([{ ...row, category: 'Harvesting' }]).fertilizer.records).toEqual([]);
    expect(summarize([]).fertilizer.percent).toBe(0);
  });

  it('links to the exact record with a safely encoded ID', () => {
    expect(taskLogTaskLink({ id: 'task/1 &2' })).toBe('/admin/farm-daily-activities/activities/records?record=task%2F1+%262&entity=DailyActivity');
    expect(taskLogTaskLink({})).toBeNull();
  });
});
