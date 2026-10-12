import { z } from 'zod';

const text = z.string().trim().max(4000);
const id = z.string().min(1).max(100);
const number = z.number().finite();
const scope = { farm_id: text.default(''), block_id: text.default(''), variety: text.default('') };
const evidence = z.object({ id, name: text, url: z.string().regex(/^\/api\/v1\/files\/[a-f0-9-]+$/), date: text, author: text, description: text.default('') });
export const kpiSchema = z.object({
  id, name: text.min(1), description: text.default(''), sub_id: text.default(''), unit: text.min(1), baseline: number.default(0),
  target: number.positive(), upper: number.nonnegative().default(0), weight: number.positive(),
  direction: z.enum(['higher', 'lower', 'range']), source: z.enum(['automatic', 'task', 'manual', 'hybrid']),
  metric: z.enum(['yield', 'cost', 'revenue', 'count', 'completion']), frequency: text.default('Monthly'), owner: text.default(''),
  manual_actual: number.nullable().default(null), reason: text.default(''), evidence: z.array(evidence).default([]),
}).superRefine((k, ctx) => {
  if (k.direction === 'range' && k.upper < k.target) ctx.addIssue({ code: 'custom', message: 'Range maximum must be at least the minimum.' });
  if (['manual', 'hybrid'].includes(k.source) && k.manual_actual !== null && !k.reason.trim()) ctx.addIssue({ code: 'custom', message: 'A verified result or adjustment requires a source and reason.' });
});
export const objectiveSchema = z.object({
  id, name: text.min(1), code: text.min(1), category: text, description: text.default(''), rationale: text.default(''), owner: text.min(1), department: text.default(''),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), priority: text,
  status: z.enum(['Draft', 'Active', 'Cancelled']), weight: number.positive(), budget: number.nonnegative(), ...scope,
  subs: z.array(z.object({ id, name: text.min(1), owner: text.default(''), description: text.default(''), weight: number.positive(), ...scope })).default([]),
  kpis: z.array(kpiSchema).default([]),
  allocations: z.array(z.object({ id, farm_id: text, block_id: text, kpi_id: id, target: number.positive() })).default([]),
  feedback: z.array(z.object({ id, date: text, author: text, type: text, notes: text.min(1), kpi_id: text.default(''), ...scope })).default([]),
  blockers: z.array(z.object({ id, name: text.min(1), description: text.default(''), severity: z.enum(['Low', 'Medium', 'High', 'Critical']), owner: text,
    due: text, status: z.enum(['Open', 'Under Investigation', 'In Progress', 'Resolved', 'Accepted Risk']), action: text, resolution: text.default(''), ...scope })).default([]),
  evidence: z.array(evidence).default([]),
}).superRefine((o, ctx) => {
  const unique = (items: { id: string }[]) => new Set(items.map(i => i.id)).size === items.length;
  if (!unique(o.kpis) || !unique(o.subs) || !unique(o.allocations)) ctx.addIssue({ code: 'custom', message: 'Duplicate relationship identifiers.' });
  if (o.end < o.start) ctx.addIssue({ code: 'custom', message: 'Deadline must follow start date.' });
  if (o.kpis.some(k => k.sub_id && !o.subs.some(s => s.id === k.sub_id))) ctx.addIssue({ code: 'custom', message: 'KPI sub-objective does not exist.' });
  if (o.allocations.some(a => !o.kpis.some(k => k.id === a.kpi_id))) ctx.addIssue({ code: 'custom', message: 'Allocation KPI does not exist.' });
});
export const cycleSchema = z.object({ year: z.number().int().min(2026).max(2200), revision: z.number().int().nonnegative(), weighted: z.boolean(),
  objectives: z.array(objectiveSchema).max(100), review: text.default(''), close: z.boolean().default(false),
}).superRefine((c, ctx) => {
  const active = c.objectives.filter(o => o.status !== 'Cancelled');
  if (new Set(c.objectives.map(o => o.id)).size !== c.objectives.length || new Set(c.objectives.map(o => o.code)).size !== c.objectives.length) ctx.addIssue({ code: 'custom', message: 'Objective IDs and codes must be unique.' });
  if (c.weighted && active.length && Math.abs(active.reduce((s, o) => s + o.weight, 0) - 100) > 0.001) ctx.addIssue({ code: 'custom', message: 'Annual objective weights must total 100%.' });
  if (c.objectives.some(o => !o.start.startsWith(String(c.year)) || !o.end.startsWith(String(c.year)))) ctx.addIssue({ code: 'custom', message: 'Objective dates must belong to the selected year.' });
});
export type Objective = z.infer<typeof objectiveSchema>;
export type Cycle = z.infer<typeof cycleSchema>;
export type Log = Record<string, unknown> & { id: string };
const n = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;
const state = (v: unknown) => String(v || '').toLowerCase();
const mean = (values: { value: number | null; weight: number }[]) => {
  if (!values.length || values.some(v => v.value === null)) return null;
  return values.reduce((s, v) => s + Math.min(100, v.value!) * v.weight, 0) / values.reduce((s, v) => s + v.weight, 0);
};
export function achievement(actual: number | null, target: number, direction: string, upper = target): number | null {
  if (actual === null) return null;
  if (direction === 'lower') return actual <= target ? 100 : 100 * target / actual;
  if (direction === 'range') return actual >= target && actual <= upper ? 100 : actual < target ? Math.max(0, actual / target * 100) : upper / actual * 100;
  return Math.max(0, actual / target * 100);
}
function amount(log: Log, metric: string) {
  if (metric === 'cost') return n(log.actual_cost ?? log.cost);
  if (metric === 'revenue') return n(log.actual_revenue ?? log.revenue ?? log.total_revenue);
  if (metric === 'yield') {
    if (log.output_quantity_kg != null && log.output_quantity_kg !== '') return n(log.output_quantity_kg);
    if (n(log.harvest_quantity) > 0) return n(log.harvest_quantity);
    const grades = n(log.grade_a_quantity) + n(log.grade_b_quantity) + n(log.rejected_quantity);
    return grades || (state(log.category) === 'harvesting' ? n(log.quantity_used) : 0);
  }
  return metric === 'completion' ? (state(log.status) === 'completed' ? 100 : Math.min(100, Math.max(0, n(log.completion_percentage ?? log.completion)))) : 1;
}
export function matchesObjectiveFarm(farmId: string | undefined, log: Record<string, unknown>) {
  if (!farmId) return true;
  if (farmId === '__all_farms__') return Boolean(log.farm_id || log.block_id || /farm|A\s*&\s*B/i.test(String(log.farm_name || '')));
  return log.farm_id === farmId;
}
export function eligibleLogs(objective: Objective, year: number, logs: Log[]) {
  return [...new Map(logs.map(l => [l.id, l])).values()].filter(l => {
    const date = String(l.activity_date || l.created_date || '').slice(0, 10);
    return date.startsWith(String(year)) && date >= objective.start && date <= objective.end && !l.archived_at
      && !['cancelled', 'canceled', 'deleted', 'archived'].includes(state(l.status))
      && matchesObjectiveFarm(objective.farm_id, l) && (!objective.block_id || l.block_id === objective.block_id)
      && (!objective.variety || state(l.variety || l.mango_variety) === state(objective.variety));
  });
}
export function calculateObjective(objective: Objective, year: number, allLogs: Log[], now = new Date()) {
  const eligible = eligibleLogs(objective, year, allLogs);
  const logs = eligible.filter(l => l.related_objective === objective.id);
  const kpis = objective.kpis.map(k => {
    const sub = objective.subs.find(s => s.id === k.sub_id);
    const rows = (k.source === 'automatic' ? eligible : logs.filter(l => l.related_kpi === k.id))
      .filter(l => matchesObjectiveFarm(sub?.farm_id, l) && (!sub?.block_id || sub.block_id === l.block_id) && (!sub?.variety || state(l.variety || l.mango_variety) === state(sub.variety)));
    const supportedUnit = k.metric !== 'yield' || ['kg', 'tonnes'].includes(k.unit);
    let actual: number | null = rows.length && supportedUnit ? rows.reduce((s, l) => s + amount(l, k.metric), 0) / (k.metric === 'completion' ? rows.length : 1) : null;
    if (k.metric === 'yield' && k.unit === 'tonnes' && actual !== null) actual /= 1000;
    if (k.source === 'manual') actual = k.manual_actual;
    if (k.source === 'hybrid' && actual !== null) actual += k.manual_actual ?? 0;
    return { ...k, actual, achievement: achievement(actual, k.target, k.direction, k.upper), variance: actual === null ? null : actual - k.target, source_ids: rows.map(l => l.id) };
  });
  const subs = objective.subs.map(s => ({ ...s, achievement: mean(kpis.filter(k => k.sub_id === s.id).map(k => ({ value: k.achievement, weight: k.weight }))) }));
  const grouped = [...subs.map(s => ({ value: s.achievement, weight: s.weight })), ...kpis.filter(k => !k.sub_id).map(k => ({ value: k.achievement, weight: k.weight }))];
  const outcome = mean(grouped);
  const execution = logs.length ? logs.reduce((s, l) => s + amount(l, 'completion'), 0) / logs.length : null;
  const cost = logs.reduce((s, l) => s + amount(l, 'cost'), 0), revenue = logs.reduce((s, l) => s + amount(l, 'revenue'), 0);
  const open = objective.blockers.filter(b => !['Resolved', 'Accepted Risk'].includes(b.status));
  const start = Date.parse(objective.start), end = Date.parse(objective.end) + 86400000;
  const expected = Math.max(0, Math.min(100, (now.getTime() - start) / (end - start) * 100));
  const overdue = logs.filter(l => l.target_date && String(l.target_date) < now.toISOString().slice(0, 10) && state(l.status) !== 'completed').length;
  let health = 'On Track';
  if (objective.status === 'Cancelled') health = 'Cancelled';
  else if (objective.status === 'Draft') health = 'Draft';
  else if (outcome === null) health = 'No result';
  else if (open.some(b => b.severity === 'Critical') || (expected >= 100 && outcome < 100) || outcome < expected - 20) health = 'Behind';
  else if (open.some(b => b.severity === 'High') || outcome < expected - 10 || overdue || (objective.budget > 0 && cost > objective.budget)) health = 'At Risk';
  else if (outcome >= 100 && !open.length) health = 'Completed';
  else if (open.length || outcome < expected - 5) health = 'Attention Needed';
  const contributions = objective.allocations.map(a => {
    const k = kpis.find(k => k.id === a.kpi_id)!;
    const rows = eligible.filter(l => k.source_ids.includes(l.id) && matchesObjectiveFarm(a.farm_id, l) && (!a.block_id || l.block_id === a.block_id));
    const actual = ['manual', 'hybrid'].includes(k.source) || !rows.length ? null : rows.reduce((s, l) => s + amount(l, k.metric), 0) / (k.metric === 'completion' ? rows.length : 1) / (k.metric === 'yield' && k.unit === 'tonnes' ? 1000 : 1);
    return { ...a, actual, achievement: achievement(actual, a.target, k.direction, k.upper), source_ids: rows.map(l => l.id), unit: k.unit };
  });
  return { ...objective, kpis, subs, outcome, execution, expected, health, logs, cost, revenue, budget_variance: cost - objective.budget, open_blockers: open.length, critical_blockers: open.filter(b => b.severity === 'Critical').length, overdue, contributions };
}
export function calculateCycle(cycle: Cycle, logs: Log[], now = new Date()) {
  const objectives = cycle.objectives.map(o => calculateObjective(o, cycle.year, logs, now));
  const active = objectives.filter(o => !['Cancelled', 'Draft'].includes(o.status));
  const score = mean(active.map(o => ({ value: o.outcome, weight: cycle.weighted ? o.weight : 1 })));
  return { objectives, score, calculated_at: now.toISOString() };
}
