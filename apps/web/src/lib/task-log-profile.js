import { activityCost, activityRevenue, activityYieldKg } from './farm-operations-analytics';
import { matchesFarmScope } from './farm-scope';

export function taskLogTotals(activities) {
  return activities.reduce((totals, row) => {
    totals.totalCost += activityCost(row);
    totals.totalRevenue += activityRevenue(row);
    totals.totalYieldKg += activityYieldKg(row);
    return totals;
  }, { totalCost: 0, totalRevenue: 0, totalYieldKg: 0 });
}

// Relational APIs supply physical farm metadata. Operational results come only
// from the same DailyActivity records used by the Daily Task Log.
export function taskLogProfile(farm, dailyActivities, { start, end, blockId = 'all', blocks = farm.blocks || [] } = {}) {
  const structure = { farms: [farm], blocks };
  const scope = blockId === 'all' ? `farm:${farm.id}` : `block:${blockId}`;
  const dateKey = (row) => String(row.activity_date || row.created_date || '').slice(0, 10);
  const activities = dailyActivities.filter((row) => (
    (!start || dateKey(row) >= start) && (!end || (dateKey(row) && dateKey(row) <= end))
    && matchesFarmScope(row, scope, structure)
  )).sort((a, b) => dateKey(b).localeCompare(dateKey(a)));
  const yieldRecords = activities.map((row) => ({ id: row.id, record_date: row.activity_date || String(row.created_date || '').slice(0, 10), actual_yield_kg: activityYieldKg(row), forecast_yield_kg: row.projected_output_kg ?? row.forecast_yield_kg ?? null }));
  return { ...taskLogTotals(activities), activities, yieldRecords };
}

export function farmWithTaskLog(farm, dailyActivities, period) {
  const model = taskLogProfile(farm, dailyActivities, period);
  return { ...farm, activity_periods: model.activities, yield_records: model.yieldRecords, task_log: model,
    analytics: { ...farm.analytics, totalYieldKg: model.totalYieldKg, yieldRecordCount: model.yieldRecords.length,
      yieldPerAcre: farm.size_acres > 0 ? model.totalYieldKg / farm.size_acres : null,
      currentActivityStage: model.activities[0]?.category || null, mixedActivityStages: false },
    blocks: (farm.blocks || []).map((block) => {
      const blockModel = taskLogProfile(farm, dailyActivities, { ...period, blockId: block.id });
      return { ...block, yield_records: blockModel.yieldRecords, activity_periods: blockModel.activities,
        total_yield_kg: blockModel.totalYieldKg, current_activity_stage: blockModel.activities[0]?.category || null };
    }),
  };
}
