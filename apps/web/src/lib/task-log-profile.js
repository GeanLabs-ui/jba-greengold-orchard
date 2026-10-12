import { activityYieldKg, buildFarmOperationsAnalytics } from './farm-operations-analytics';

// Relational APIs supply physical farm metadata. Operational results come only
// from the same DailyActivity records used by the Daily Task Log.
export function taskLogProfile(farm, dailyActivities, { start, end, blockId = 'all' } = {}) {
  const model = buildFarmOperationsAnalytics({ farms: [farm], blocks: farm.blocks || [], dailyActivities }, {
    farmId: farm.id, blockId, start: start ? new Date(`${start}T00:00:00Z`) : null,
    end: end ? new Date(`${end}T23:59:59.999Z`) : null,
  });
  const activities = model.activities.slice().sort((a, b) => String(b.activity_date || b.created_date || '').localeCompare(String(a.activity_date || a.created_date || '')));
  const yieldRecords = activities.map((row) => ({ id: row.id, record_date: row.activity_date || String(row.created_date || '').slice(0, 10), actual_yield_kg: activityYieldKg(row), forecast_yield_kg: 0 }));
  return { ...model, activities, yieldRecords };
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
