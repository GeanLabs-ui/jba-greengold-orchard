import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const migrationUrl = new URL('../migrations/0012_farm_management_workbook_seed.sql', import.meta.url);

async function seedRecords() {
  const migration = await readFile(migrationUrl, 'utf8');
  const match = migration.match(/\$workbook_seed\$(\[.*\])\$workbook_seed\$/s);
  if (!match) throw new Error('Workbook seed payload is missing from migration 0012');
  return JSON.parse(match[1]) as Array<{ id: string; entityName: string; data: Record<string, unknown> }>;
}

const sum = (records: Array<{ data: Record<string, unknown> }>, key: string) => (
  records.reduce((total, record) => total + Number(record.data[key] || 0), 0)
);

describe('farm management workbook seed', () => {
  it('keeps deterministic ids and import keys unique', async () => {
    const records = await seedRecords();
    const ids = records.map((record) => record.id);
    const importKeys = records.map((record) => record.data.import_key);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(importKeys).size).toBe(importKeys.length);
  });

  it('reconciles workbook expense, activity, harvest, and receipt totals', async () => {
    const records = await seedRecords();
    const byEntity = (name: string) => records.filter((record) => record.entityName === name);
    const expenses = byEntity('FarmExpense');
    const expenseLedger = byEntity('FarmFinanceRecord').filter((record) => record.data.record_type === 'expense');
    const activities = byEntity('DailyActivity');
    const harvests = byEntity('HarvestBatch');
    const payments = byEntity('Payment');

    expect(expenses).toHaveLength(64);
    expect(sum(expenses, 'amount')).toBeCloseTo(119_537, 2);
    expect(expenseLedger).toHaveLength(64);
    expect(sum(expenseLedger, 'amount')).toBeCloseTo(119_537, 2);
    expect(activities).toHaveLength(9);
    expect(sum(activities, 'cost')).toBeCloseTo(3_630, 2);
    expect(harvests).toHaveLength(3);
    expect(sum(harvests, 'quantity_harvested_kg')).toBeCloseTo(29_323, 2);
    expect(sum(harvests, 'grade_a_kg')).toBeCloseTo(26_718, 2);
    expect(sum(harvests, 'rejected_kg')).toBeCloseTo(2_605, 2);
    expect(payments).toHaveLength(3);
    expect(sum(payments, 'amount')).toBeCloseTo(170_647.75, 2);
  });

  it('covers the workbook planning and input sections', async () => {
    const records = await seedRecords();
    expect(records.filter((record) => record.entityName === 'FarmTask')).toHaveLength(12);
    expect(records.filter((record) => record.entityName === 'FarmInput')).toHaveLength(8);
    expect(records.filter((record) => record.entityName === 'FarmFinanceRecord' && record.data.record_type === 'business_target')).toHaveLength(5);
  });
});
