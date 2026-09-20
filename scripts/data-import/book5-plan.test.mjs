import { describe, it, expect } from 'vitest';
import { fingerprint } from './secure-payload.mjs';
import { activityId, prepareInserts, verifyAfter } from './book5-plan.mjs';

const fixture = () => {
  const before = { records: [{ id: 'old', entity_name: 'DailyActivity', organization_id: null, data: { title: 'Existing task', actual_cost: 12 } }], blocks: [{ id: 'a1', organization_id: null }], farms: [{ id: 'a', organization_id: null }] };
  const data = { activity_date: '2026-09-01', title: 'Example task', actual_cost: 23, responsible: 'Example worker', block_id: 'a1', farm_id: 'a', source_workbook: 'Book5.xlsx', source_row: 40, import_key: activityId(40) };
  const plan = { version: 1, mode: 'apply', organization_id: null, baseline_fingerprint: fingerprint(before), entries: [{ source_row: 40, organization_id: null, data }], expected_import_count: 1, expected_import_total: 23 };
  return { before, plan };
};
describe('reviewed additive activity import', () => {
  it('adds only reviewed rows, preserves originals and reruns without additions', () => {
    const { before, plan } = fixture();
    const inserts = prepareInserts(before, plan);
    const after = { ...before, records: [...before.records, ...inserts] };
    verifyAfter(before, after, inserts);
    expect(prepareInserts(after, plan)).toEqual([]);
  });
  it('refuses a stale snapshot instead of ignoring concurrent edits', () => {
    const { before, plan } = fixture();
    before.records[0].data.actual_cost = 13;
    expect(() => prepareInserts(before, plan)).toThrow('snapshot');
  });
  it('refuses changed imported records instead of overwriting them', () => {
    const { before, plan } = fixture();
    const inserts = prepareInserts(before, plan);
    const after = structuredClone({ ...before, records: [...before.records, ...inserts] });
    after.records[1].data.title = 'Edited after import';
    expect(() => prepareInserts(after, plan)).toThrow('edited');
  });
  it('rejects duplicates, wrong organizations and incorrect totals', () => {
    const { before, plan } = fixture();
    before.records[0].data = structuredClone(plan.entries[0].data);
    plan.baseline_fingerprint = fingerprint(before);
    expect(() => prepareInserts(before, plan)).toThrow('duplicate');
    plan.entries[0].organization_id = 'another-organization';
    expect(() => prepareInserts(before, plan)).toThrow('Organization');
    const clean = fixture();
    clean.plan.expected_import_total = 24;
    expect(() => prepareInserts(clean.before, clean.plan)).toThrow('total');
  });
  it('keeps explicitly confirmed identical payments as separate source rows', () => {
    const { before, plan } = fixture();
    const second = structuredClone(plan.entries[0]);
    second.source_row = 41;
    second.data.source_row = 41;
    second.data.import_key = activityId(41);
    second.confirmed_separate_payment = true;
    plan.entries.push(second);
    plan.expected_import_count = 2;
    plan.expected_import_total = 46;
    expect(prepareInserts(before, plan)).toHaveLength(2);
  });
  it('detects missing inserted rows and changes to original records', () => {
    const { before, plan } = fixture();
    const inserts = prepareInserts(before, plan);
    expect(() => verifyAfter(before, before, inserts)).toThrow('verification');
    const after = structuredClone({ ...before, records: [...before.records, ...inserts] });
    after.records[0].data.title = 'Unexpected edit';
    expect(() => verifyAfter(before, after, inserts)).toThrow('Existing data');
  });
});
