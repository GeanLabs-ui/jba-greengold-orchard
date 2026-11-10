import { aggregateChartPeriods } from './analytics-periods';

const FARM_WRITE_ROLES = new Set(['super_admin', 'admin', 'farm_manager']);
const BLOCK_WRITE_ROLES = new Set(['super_admin', 'admin', 'farm_manager', 'farm_supervisor']);
const BLOCK_STATUS_ROLES = new Set(['super_admin', 'admin', 'farm_manager']);
const BLOCK_MERGE_ROLES = new Set(['super_admin', 'admin']);

export const canManageFarms = (role) => FARM_WRITE_ROLES.has(String(role || '').toLowerCase());
export const canManageBlocks = (role) => BLOCK_WRITE_ROLES.has(String(role || '').toLowerCase());
export const canChangeBlockStatus = (role) => BLOCK_STATUS_ROLES.has(String(role || '').toLowerCase());
export const canMergeBlocks = (role) => BLOCK_MERGE_ROLES.has(String(role || '').toLowerCase());

export const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'No data yet';
  return new Intl.NumberFormat('en-GH', { maximumFractionDigits: 0 }).format(Number(value));
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

export function groupYieldRecords(records = [], granularity = 'monthly') {
  return aggregateChartPeriods(records.map(record => ({
    date: record.record_date,
    actual: record.actual_yield_kg,
    forecast: record.forecast_yield_kg,
  })), granularity, ['actual', 'forecast']).map(({ key, actual, forecast }) => ({
    date: key, actual, forecast,
  }));
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
