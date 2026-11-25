import type { Cycle } from './objective-model.js';

export function objectiveRemovalError(previous: Cycle | undefined, next: Cycle, logs: Record<string, unknown>[]): string | null {
  if (!previous) return null;
  for (const old of previous.objectives) {
    const objective = next.objectives.find(item => item.id === old.id);
    const sources = logs.filter(log => log.related_objective === old.id);
    if (!objective && sources.length) return 'This objective has linked Daily Task Logs. Cancel it to preserve their history instead of deleting it.';
    if (!objective) continue;
    if (sources.some(log => log.related_sub_objective && !objective.subs.some(item => item.id === log.related_sub_objective))) return 'A removed sub-objective has linked Daily Task Logs. Keep it or explicitly correct those source links first.';
    if (sources.some(log => log.related_kpi && !objective.kpis.some(item => item.id === log.related_kpi))) return 'A removed KPI has linked Daily Task Logs. Keep it or explicitly correct those source links first.';
  }
  return null;
}
