const FARM_WRITE_ROLES = new Set(['super_admin', 'admin', 'farm_manager']);
const BLOCK_WRITE_ROLES = new Set(['super_admin', 'admin', 'farm_manager', 'farm_supervisor']);
const BLOCK_STATUS_ROLES = new Set(['super_admin', 'admin', 'farm_manager']);
const BLOCK_MERGE_ROLES = new Set(['super_admin', 'admin']);

export const canManageFarms = (role) => FARM_WRITE_ROLES.has(String(role || '').toLowerCase());
export const canManageBlocks = (role) => BLOCK_WRITE_ROLES.has(String(role || '').toLowerCase());
export const canChangeBlockStatus = (role) => BLOCK_STATUS_ROLES.has(String(role || '').toLowerCase());
export const canMergeBlocks = (role) => BLOCK_MERGE_ROLES.has(String(role || '').toLowerCase());

export const formatNumber = (value, maximumFractionDigits = 1) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'No data yet';
  return new Intl.NumberFormat('en-GH', { maximumFractionDigits }).format(Number(value));
};

export const formatDate = (value) => {
  if (!value) return 'No data yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No data yet';
  return new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

export const humanize = (value) => String(value || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

const startOfUtcWeek = (date) => {
  const day = date.getUTCDay() || 7;
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - day + 1);
  return result;
};

const periodKey = (dateValue, granularity) => {
  const date = new Date(`${dateValue}T00:00:00Z`);
  if (granularity === 'yearly') return `${date.getUTCFullYear()}-01-01`;
  if (granularity === 'monthly') return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
  if (granularity === 'weekly') return startOfUtcWeek(date).toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};

export function groupYieldRecords(records = [], granularity = 'monthly') {
  const groups = new Map();
  for (const record of records) {
    if (!record?.record_date) continue;
    const key = periodKey(record.record_date, granularity);
    const current = groups.get(key) || { date: key, actual: 0, forecast: 0 };
    current.actual += Number(record.actual_yield_kg || 0);
    current.forecast += Number(record.forecast_yield_kg || 0);
    groups.set(key, current);
  }
  return [...groups.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function farmLocationOptions(farms = []) {
  return [...new Set(farms.flatMap((farm) => [
    farm.region,
    farm.location,
    ...(farm.block_locations || []),
  ]).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

export function farmVarietyOptions(farms = []) {
  return [...new Set(farms.flatMap((farm) => [
    ...Object.keys(farm.variety_totals || {}),
    ...(farm.block_varieties || []),
  ]))]
    .sort((left, right) => left.localeCompare(right));
}
