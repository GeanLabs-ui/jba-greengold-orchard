const shortDate = new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthYear = new Intl.DateTimeFormat('en-GH', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export function reportingMonths(rows, year, currentYear, currentMonth, hasRecords) {
  if (year < currentYear) return rows;
  const lastRecordedMonth = rows.findLastIndex(hasRecords) + 1;
  const through = year === currentYear ? Math.max(currentMonth, lastRecordedMonth) : lastRecordedMonth;
  return rows.slice(0, through);
}

export function aggregateChartPeriods(records, granularity, keys) {
  const groups = new Map();
  for (const row of records) {
    const dateKey = String(row.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
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
