import { fingerprint } from './secure-payload.mjs';

export const activityId = row => `book5-2026-operation-log-r${row}`;
export const activityTotal = rows => rows.filter(row => row.entity_name === 'DailyActivity').reduce((total, row) => total + Number(row.data.actual_cost ?? row.data.cost ?? 0), 0);
const normalized = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
export function signature(data) {
  return JSON.stringify([
    normalized(data.activity_date).slice(0, 10),
    normalized(data.title || data.activity_title || data.description),
    Number(data.actual_cost ?? data.cost ?? 0),
    normalized(data.responsible || data.assigned_workers || data.supervisor_name),
    normalized(data.block_id || data.block_name || data.block_code),
  ]);
}

export function prepareInserts(before, plan) {
  if (plan.version !== 1 || plan.mode !== 'apply' || !Array.isArray(plan.entries) || !plan.entries.length || plan.entries.length > 48) throw new Error('Invalid reviewed plan');
  const ids = plan.entries.map(entry => activityId(entry.source_row));
  if (new Set(ids).size !== ids.length) throw new Error('Repeated source row');
  const original = { ...before, records: before.records.filter(row => !ids.includes(row.id)) };
  if (fingerprint(original) !== plan.baseline_fingerprint) throw new Error('Current records differ from the reviewed snapshot');
  const inserts = [];
  for (const entry of plan.entries) {
    if (!Number.isInteger(entry.source_row) || entry.source_row < 3 || entry.source_row > 50) throw new Error('Invalid source row');
    if (entry.organization_id !== plan.organization_id) throw new Error('Organization mismatch');
    const data = entry.data;
    if (!data || !/^2026-\d{2}-\d{2}$/.test(data.activity_date) || !data.title || !Number.isFinite(data.actual_cost) || data.actual_cost < 0) throw new Error('Invalid activity data');
    if (data.source_workbook !== 'Book5.xlsx' || data.source_row !== entry.source_row || data.import_key !== activityId(entry.source_row)) throw new Error('Invalid source provenance');
    if (data.block_id && !before.blocks.some(block => block.id === data.block_id && block.organization_id === entry.organization_id)) throw new Error('Invalid block or organization');
    if (data.farm_id && !before.farms.some(farm => farm.id === data.farm_id && farm.organization_id === entry.organization_id)) throw new Error('Invalid farm or organization');
    const existing = before.records.find(row => row.id === activityId(entry.source_row));
    if (existing) {
      if (existing.entity_name !== 'DailyActivity' || existing.organization_id !== entry.organization_id || fingerprint(existing.data) !== fingerprint(data)) throw new Error('An imported record was edited; preserve it');
      continue;
    }
    const duplicates = before.records.filter(row => row.entity_name === 'DailyActivity' && row.organization_id === entry.organization_id && signature(row.data) === signature(data));
    const plannedDuplicate = inserts.some(row => signature(row.data) === signature(data));
    if ((duplicates.length || plannedDuplicate) && !entry.confirmed_separate_payment) throw new Error('Potential duplicate activity');
    inserts.push({ id: activityId(entry.source_row), entity_name: 'DailyActivity', organization_id: entry.organization_id, data });
  }
  const total = plan.entries.reduce((sum, entry) => sum + entry.data.actual_cost, 0);
  if (total !== plan.expected_import_total || plan.entries.length !== plan.expected_import_count) throw new Error('Reviewed count or cost total mismatch');
  return inserts;
}

export function verifyAfter(before, after, inserts) {
  const addedIds = new Set(inserts.map(row => row.id));
  const preserved = { ...after, records: after.records.filter(row => !addedIds.has(row.id)) };
  if (fingerprint(preserved) !== fingerprint(before)) throw new Error('Existing data changed during import');
  for (const insert of inserts) {
    const matches = after.records.filter(row => row.id === insert.id && row.entity_name === 'DailyActivity');
    if (matches.length !== 1 || fingerprint(matches[0].data) !== fingerprint(insert.data)) throw new Error('Saved record verification failed');
  }
  const addedTotal = inserts.reduce((sum, row) => sum + row.data.actual_cost, 0);
  if (activityTotal(after.records) !== activityTotal(before.records) + addedTotal) throw new Error('Saved cost total mismatch');
}
