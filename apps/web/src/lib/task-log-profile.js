import { activityCost, activityRevenue, activityYieldKg } from './farm-operations-analytics';
import { BLOCK_CODES, blockLabel, farmCode, matchesFarmScope, scopeLabel } from './farm-scope';

export function uniqueTaskLogRows(activities) {
  const ids = new Set();
  return activities.filter(({ id }) => {
    if (id == null || id === '') return true;
    const key = String(id);
    if (ids.has(key)) return false;
    ids.add(key);
    return true;
  });
}

export function taskLogTotals(activities) {
  return uniqueTaskLogRows(activities).reduce((totals, row) => {
    totals.totalCost += activityCost(row);
    totals.totalRevenue += activityRevenue(row);
    totals.totalYieldKg += activityYieldKg(row);
    return totals;
  }, { totalCost: 0, totalRevenue: 0, totalYieldKg: 0 });
}

export const taskLogDate = (row) => String(row.activity_date || row.created_date || '').slice(0, 10);

// Each row has one owner at each reporting level. Whole-farm and multi-block
// entries belong to the farm when all referenced blocks belong to that farm.
export function groupTaskLog(records, { farms = [], blocks = [], start, end } = {}) {
  const byFarm = new Map();
  const byBlock = new Map();
  const shared = [];
  const unassigned = [];
  const append = (map, id, row) => {
    const key = String(id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  };
  const structure = { farms, blocks };
  const blockById = new Map(blocks.map((block) => [String(block.id), block]));
  const activities = uniqueTaskLogRows(records).filter((row) => (
    (!start || taskLogDate(row) >= start) && (!end || (taskLogDate(row) && taskLogDate(row) <= end))
  )).sort((a, b) => taskLogDate(b).localeCompare(taskLogDate(a)));

  for (const row of activities) {
    const linkedBlock = row.block_id && blockById.get(String(row.block_id));
    const scope = scopeLabel(row.shared_scope || row.block_name);
    const explicitCodes = new Set(blockLabel([row.shared_scope, row.block_name, row.block_code].filter(Boolean).join(' ')).match(/\b[AB][1-5]\b/g) || []);
    const matchingBlocks = linkedBlock ? [linkedBlock] : explicitCodes.size
      ? blocks.filter((block) => explicitCodes.has(blockLabel(block)))
      : blocks.filter((block) => matchesFarmScope(row, `block:${block.id}`, structure));
    const farmIds = new Set(matchingBlocks.map((block) => block.farm_id).filter(Boolean).map(String));

    if (!linkedBlock) {
      const explicitFarms = new Set([...explicitCodes].map((code) => code[0]));
      const isCombined = scope === 'Farm A&B' || (!explicitCodes.size && !matchingBlocks.length
        && [row.farm_name, row.farm_code, row.farm].some((label) => scopeLabel(label) === 'Farm A&B'));
      if (isCombined || explicitFarms.size > 1 || farmIds.size > 1) {
        shared.push(row);
        continue;
      }
      if (!farmIds.size) {
        farms.filter((farm) => matchesFarmScope(row, `farm:${farm.id}`, structure))
          .forEach((farm) => farmIds.add(String(farm.id)));
      }
    }

    if (farmIds.size === 1) {
      append(byFarm, [...farmIds][0], row);
      if (matchingBlocks.length === 1 && (linkedBlock || explicitCodes.size <= 1)) append(byBlock, matchingBlocks[0].id, row);
    } else {
      (farmIds.size > 1 ? shared : unassigned).push(row);
    }
  }
  return { byFarm, byBlock, shared, unassigned };
}

export function filterTaskLogScope(records, selection, structure) {
  if (selection === 'all') return uniqueTaskLogRows(records);
  const ledger = groupTaskLog(records, structure);
  if (selection === 'shared' || selection === 'unassigned') return ledger[selection];
  if (selection.startsWith('farm:')) return ledger.byFarm.get(selection.slice(5)) || [];
  if (selection.startsWith('block:')) return ledger.byBlock.get(selection.slice(6)) || [];
  const farm = structure.farms.find((item) => farmCode(item) === selection);
  if (farm) return ledger.byFarm.get(String(farm.id)) || [];
  const block = BLOCK_CODES.includes(selection) && structure.blocks.find((item) => blockLabel(item) === selection);
  return block ? ledger.byBlock.get(String(block.id)) || [] : [];
}

function profileForRows(activities) {
  const yieldRecords = activities.map((row) => ({ id: row.id, record_date: taskLogDate(row), actual_yield_kg: activityYieldKg(row), forecast_yield_kg: row.projected_output_kg ?? row.forecast_yield_kg ?? null }));
  return { ...taskLogTotals(activities), activities, yieldRecords };
}

export function taskLogProfile(farm, dailyActivities, { blockId = 'all', farms = [farm], blocks = farm.blocks || [], ...period } = {}) {
  const ledger = groupTaskLog(dailyActivities, { farms, blocks, ...period });
  return profileForRows((blockId === 'all' ? ledger.byFarm.get(String(farm.id)) : ledger.byBlock.get(String(blockId))) || []);
}

export function farmWithTaskLog(farm, dailyActivities, { farms = [farm], blocks = farm.blocks || [], ...period } = {}) {
  const ledger = groupTaskLog(dailyActivities, { farms, blocks, ...period });
  const model = profileForRows(ledger.byFarm.get(String(farm.id)) || []);
  const blockRows = new Set([...ledger.byBlock.values()].flat());
  const farmLevelRows = model.activities.filter((row) => !blockRows.has(row));
  return { ...farm, activity_periods: model.activities, yield_records: model.yieldRecords, task_log: model, farmLevelRows,
    analytics: { ...farm.analytics, totalYieldKg: model.totalYieldKg, yieldRecordCount: model.yieldRecords.length,
      yieldPerAcre: farm.size_acres > 0 ? model.totalYieldKg / farm.size_acres : null,
      currentActivityStage: model.activities[0]?.category || null, mixedActivityStages: false },
    blocks: (farm.blocks || []).map((block) => {
      const blockModel = profileForRows(ledger.byBlock.get(String(block.id)) || []);
      return { ...block, yield_records: blockModel.yieldRecords, activity_periods: blockModel.activities,
        total_yield_kg: blockModel.totalYieldKg, current_activity_stage: blockModel.activities[0]?.category || null };
    }),
  };
}
