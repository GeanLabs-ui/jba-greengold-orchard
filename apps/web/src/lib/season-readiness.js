import { matchesFarmScope } from './farm-scope';
import { taskLogDate, uniqueTaskLogRows } from './task-log-profile';

const normalized = value => String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');

function stageForText(value) {
  const text = normalized(value);
  if (/\bfertili[sz]\w*\b/.test(text)) return 'fertilizer';
  if (/\b(?:flower(?:ing)?|induction)\b/.test(text)) return 'flowering';
  if (/\bharvest(?:ing|ed)?\b/.test(text) && !/\bpost\s*harvest\b/.test(text)) return 'harvest';
  return null;
}

export function seasonTaskStage(row) {
  return stageForText(row.category) || stageForText(row.activity_type)
    || stageForText(row.title || row.activity_title || row.description);
}

export function taskLogTaskLink(row) {
  if (row.id == null || row.id === '') return null;
  return `/admin/farm-daily-activities/activities/records?${new URLSearchParams({ record: String(row.id), entity: 'DailyActivity' })}`;
}

export function seasonReadiness(records, { farm, farms = [farm], blocks = farm?.blocks || [], year = 'all' }) {
  const structure = { farms, blocks };
  const farmBlocks = blocks.filter(block => String(block.farm_id) === String(farm?.id));
  const scopedRows = uniqueTaskLogRows(records)
    .filter(row => farm && matchesFarmScope(row, `farm:${farm.id}`, structure))
    .filter(row => year === 'all' || taskLogDate(row).slice(0, 4) === String(year))
    .sort((a, b) => taskLogDate(b).localeCompare(taskLogDate(a)) || String(a.id).localeCompare(String(b.id)));
  const result = { total: farmBlocks.length };
  for (const stage of ['fertilizer', 'flowering', 'harvest']) {
    const rows = scopedRows.filter(row => seasonTaskStage(row) === stage);
    const coveredBlocks = new Set();
    let farmLevelCount = 0;
    for (const row of rows) {
      const matching = farmBlocks.filter(block => matchesFarmScope(row, `block:${block.id}`, structure));
      matching.forEach(block => coveredBlocks.add(block.id));
      if (!matching.length) farmLevelCount += 1;
    }
    const completed = rows.filter(row => normalized(row.status) === 'completed').length;
    result[stage] = {
      records: rows,
      count: coveredBlocks.size,
      farmLevelCount,
      completed,
      pending: rows.filter(row => normalized(row.status) === 'pending').length,
      inProgress: rows.filter(row => normalized(row.status) === 'in progress').length,
      percent: rows.length ? Math.round(completed / rows.length * 100) : 0,
    };
  }
  return result;
}
