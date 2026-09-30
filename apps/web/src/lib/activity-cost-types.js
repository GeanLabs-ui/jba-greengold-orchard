export const ACTIVITY_COST_TYPES = [
  { name: 'Administration', color: '#eab308' },
  { name: 'Materials', color: '#3b82f6' },
  { name: 'Labor', color: '#ec4899' },
  { name: 'Tools', color: '#8b5cf6' },
  { name: 'Transportation', color: '#06b6d4' },
  { name: 'Food/Ent', color: '#22c55e' },
  { name: 'Others', color: '#f97316' },
];

export function normalizeCostType(value) {
  const name = String(value || '').trim().toLowerCase();
  if (name === 'admin') return 'Administration';
  if (name === 'labour') return 'Labor';
  if (name === 'transport') return 'Transportation';
  if (name === 'food') return 'Food/Ent';
  return ACTIVITY_COST_TYPES.find((type) => type.name.toLowerCase() === name)?.name || 'Others';
}

export function buildCostTypeBreakdown(costRows) {
  const totals = new Map(ACTIVITY_COST_TYPES.map((type) => [type.name, 0]));
  costRows.forEach((row) => {
    const name = normalizeCostType(row.cost_type);
    totals.set(name, totals.get(name) + row.value);
  });
  return ACTIVITY_COST_TYPES.map((type) => ({ ...type, value: totals.get(type.name) }));
}

export const formatCostPercentage = (value, total) => !total || !value ? '0%'
  : value / total * 100 < .1 ? '<0.1%' : `${Number((value / total * 100).toFixed(1))}%`;
