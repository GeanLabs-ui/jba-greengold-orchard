const shortDate = new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthYear = new Intl.DateTimeFormat('en-GH', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const accraCalendar = new Intl.DateTimeFormat('en-GH', {
  timeZone: 'Africa/Accra', calendar: 'gregory', numberingSystem: 'latn',
  year: 'numeric', month: '2-digit', day: '2-digit',
});

export function reportingDateKey(value = new Date()) {
  if (!value) return null;
  const datePrefix = typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}(?=$|T| )/)?.[0];
  if (datePrefix) {
    const day = new Date(datePrefix);
    if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== datePrefix) return null;
    if (value === datePrefix) return datePrefix;
  }
  // Interpret timestamps with no explicit offset as Accra time (UTC+00:00).
  const localTimestamp = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value);
  const date = new Date(localTimestamp ? value.replace(' ', 'T') + 'Z' : value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(accraCalendar.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}`;
}

export function reportingYear(now = new Date()) {
  return Number(reportingDateKey(now)?.slice(0, 4));
}

export function reportingYears(currentYear = reportingYear()) {
  return Array.from({ length: Math.max(2035, currentYear) - 2025 + 1 }, (_, index) => 2025 + index);
}

export function completeYearlyPeriods(rows, currentYear, keys) {
  const byYear = new Map(rows.map(row => [row.label, row]));
  const missing = Object.fromEntries(keys.map(key => [key, null]));
  return reportingYears(currentYear).map(year => {
    const label = String(year);
    return byYear.get(label) ?? { key: `${year}-01-01`, label, ...missing };
  });
}

export const calendarAxisLabels = { interval: 0, angle: -90, textAnchor: 'end', height: 46 };

export function aggregateChartPeriods(records, granularity, keys) {
  const groups = new Map();
  for (const row of records) {
    const dateKey = reportingDateKey(row.date ?? null);
    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    const date = new Date(dateKey + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) continue;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    if (granularity === 'weekly') date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    if (granularity === 'monthly') date.setUTCDate(1);
    if (granularity === 'quarterly') date.setUTCMonth(Math.floor(month / 3) * 3, 1);
    if (granularity === 'yearly') date.setUTCMonth(0, 1);
    const key = date.toISOString().slice(0, 10);
    const label = granularity === 'quarterly' ? 'Q' + (Math.floor(month / 3) + 1) + ' ' + year
      : granularity === 'yearly' ? String(year)
        : granularity === 'monthly' ? monthYear.format(date) : shortDate.format(date) + ' ' + date.getUTCFullYear();
    const group = groups.get(key) || { key, label };
    for (const field of keys) {
      const value = row[field];
      if (value != null && value !== '' && Number.isFinite(Number(value))) {
        group[field] = (group[field] ?? 0) + Number(value);
      } else if (!(field in group)) group[field] = null;
    }
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}
