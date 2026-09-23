export const ACTIVITY_COST_TYPES = [
  { name: 'Administration', color: '#eab308' },
  { name: 'Materials', color: '#3b82f6' },
  { name: 'Fuel', color: '#ef4444' },
  { name: 'Labour', color: '#ec4899' },
  { name: 'Food', color: '#22c55e' },
  { name: 'Tools', color: '#8b5cf6' },
  { name: 'Transport', color: '#06b6d4' },
  { name: 'Equipment', color: '#6366f1' },
  { name: 'Inputs', color: '#14b8a6' },
  { name: 'Other', color: '#f97316' },
];

export function normalizeCostType(value) {
  const name = String(value || '').trim().toLowerCase();
  if (name === 'admin') return 'Administration';
  return ACTIVITY_COST_TYPES.find((type) => type.name.toLowerCase() === name)?.name || 'Other';
}

export function buildCostTypeBreakdown(costRows) {
  const totals = new Map(ACTIVITY_COST_TYPES.map((type) => [type.name, 0]));
  costRows.forEach((row) => {
    const name = normalizeCostType(row.cost_type);
    totals.set(name, totals.get(name) + row.value);
  });
  return ACTIVITY_COST_TYPES.map((type) => ({ ...type, value: totals.get(type.name) }));
}
