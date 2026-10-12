import type { Database } from '../db.js';
import { matchesObjectiveFarm, type Cycle } from './objective-model.js';

export async function validateObjectiveAlignment(sql: Database, data: Record<string, unknown>, organizationId: string | null): Promise<string | null> {
  if (!data.related_objective) return data.related_sub_objective || data.related_kpi ? 'Select an objective before linking its sub-objective or KPI.' : null;
  const year = String(data.activity_date || '').slice(0, 4);
  const rows = await sql<{ data: Cycle & { closed_at?: string } }[]>`SELECT data FROM entity_records WHERE entity_name = 'ObjectiveCycle' AND organization_id IS NOT DISTINCT FROM ${organizationId} AND data->>'year' = ${year}`;
  const cycle = rows[0]?.data;
  const objective = cycle?.objectives.find(o => o.id === data.related_objective);
  if (!cycle || cycle.closed_at || !objective || objective.status !== 'Active') return 'Choose an active objective in the same open year as this task log.';
  if (String(data.activity_date) < objective.start || String(data.activity_date) > objective.end) return 'Task date is outside the objective period.';
  if (!matchesObjectiveFarm(objective.farm_id, data) || objective.block_id && objective.block_id !== data.block_id) return 'Task farm/block is outside the objective scope.';
  if (objective.variety && String(data.variety || data.mango_variety || '').toLowerCase() !== objective.variety.toLowerCase()) return 'Task variety is outside the objective scope.';
  const sub = objective.subs.find(s => s.id === data.related_sub_objective);
  if (data.related_sub_objective && !sub) return 'The sub-objective does not belong to this objective.';
  if (!matchesObjectiveFarm(sub?.farm_id, data) || sub?.block_id && sub.block_id !== data.block_id) return 'Task farm/block is outside the sub-objective scope.';
  const kpi = objective.kpis.find(k => k.id === data.related_kpi);
  if (data.related_kpi && (!kpi || (kpi.sub_id || '') !== (data.related_sub_objective || ''))) return 'Choose a KPI belonging to the selected objective and sub-objective.';
  return null;
}
