import { activityCost, activityRevenue, activityYieldKg, parseRecordDate } from './farm-operations-analytics';

const emptyPeriod = (label) => ({ label, cost: 0, revenue: 0, yieldKg: 0, profit: 0, records: 0 });
const addActivity = (period, activity) => {
  period.cost += activityCost(activity);
  period.revenue += activityRevenue(activity);
  period.yieldKg += activityYieldKg(activity);
  period.profit = period.revenue - period.cost;
  period.records += 1;
};

export function buildFarmPerformanceTrends(activities, selectedYear, currentYear = new Date().getFullYear()) {
  const dated = activities.map((activity) => ({
    activity,
    date: parseRecordDate(activity.activity_date) || parseRecordDate(activity.created_date),
  })).filter(({ date }) => date);
  const years = [...new Set([currentYear, Number(selectedYear), ...dated.map(({ date }) => date.getFullYear())])]
    .filter(Number.isFinite).sort((a, b) => a - b);
  const yearly = years.map(year => emptyPeriod(String(year)));
  const byYear = new Map(yearly.map(period => [Number(period.label), period]));
  const monthly = Array.from({ length: 12 }, (_, month) => emptyPeriod(new Date(2000, month, 1).toLocaleString('en-US', { month: 'short' })));
  dated.forEach(({ activity, date }) => {
    addActivity(byYear.get(date.getFullYear()), activity);
    if (date.getFullYear() === Number(selectedYear)) addActivity(monthly[date.getMonth()], activity);
  });
  // A period with no rows is a gap. A logged zero remains a measurement.
  [...yearly, ...monthly].forEach((period) => {
    if (!period.records) {
      Object.assign(period, { cost: null, revenue: null, yieldKg: null, profit: null });
    }
  });
  return { yearly, monthly, undatedCount: activities.length - dated.length };
}

export function summarizeYearlyTrend(rows) {
  const recorded = rows.filter(row => row.records > 0);
  if (!recorded.length) return 'No recorded performance yet. This trend updates automatically as farm activity is recorded.';
  const last = recorded.at(-1);
  const losses = recorded.filter(row => row.profit < 0).map(row => row.label);
  const lossNote = losses.length ? ` Loss recorded in ${losses.join(', ')}.` : '';
  if (recorded.length === 1) return `Recorded performance for ${last.label}. Year-to-year comparisons will appear as subsequent years are recorded.${lossNote}`;
  const first = recorded[0];
  const direction = key => last[key] > first[key] ? 'increased' : last[key] < first[key] ? 'decreased' : 'remained unchanged';
  return `From ${first.label} to ${last.label}, revenue has ${direction('revenue')} and yield has ${direction('yieldKg')}.${lossNote}`;
}

export function summarizeMonthlyTrend(rows) {
  const recorded = rows.filter(row => row.records > 0);
  if (!recorded.length) return 'No recorded performance for this year. This trend updates automatically as farm activity is recorded.';
  const first = recorded[0];
  const last = recorded.at(-1);
  const losses = recorded.filter(row => row.profit < 0).map(row => row.label);
  const lossNote = losses.length ? ` Loss recorded in ${losses.join(', ')}.` : '';
  if (recorded.length === 1) return `Recorded performance for ${first.label}. Month-to-month comparisons will appear as additional months are recorded.${lossNote}`;
  const direction = key => last[key] > first[key] ? 'increased' : last[key] < first[key] ? 'decreased' : 'remained unchanged';
  return `From ${first.label} to ${last.label}, revenue has ${direction('revenue')} and yield has ${direction('yieldKg')}.${lossNote}`;
}
