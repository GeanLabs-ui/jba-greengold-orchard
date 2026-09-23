import { activityCost, activityRevenue, activityYieldKg, parseRecordDate } from './farm-operations-analytics';

const emptyPeriod = (label) => ({ label, cost: 0, revenue: 0, yieldTonnes: 0, profit: 0, records: 0 });
const addActivity = (period, activity) => {
  period.cost += Math.max(0, activityCost(activity));
  period.revenue += activityRevenue(activity);
  period.yieldTonnes += activityYieldKg(activity) / 1000;
  period.profit = period.revenue - period.cost;
  period.records += 1;
};

export function buildFarmPerformanceTrends(activities, selectedYear, currentYear = new Date().getFullYear()) {
  const dated = activities.map((activity) => ({
    activity,
    date: parseRecordDate(activity.activity_date) || parseRecordDate(activity.created_date),
  })).filter(({ date }) => date);
  // Keep the orchard's starting year permanently and extend into the future.
  const firstYear = 2026;
  const lastYear = dated.reduce((latest, { date }) => Math.max(latest, date.getFullYear()), Math.max(2030, currentYear));
  const yearly = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => emptyPeriod(String(firstYear + index)));
  const monthly = Array.from({ length: 12 }, (_, month) => emptyPeriod(new Date(2000, month, 1).toLocaleString('en-US', { month: 'short' })));
  dated.forEach(({ activity, date }) => {
    const yearIndex = date.getFullYear() - firstYear;
    if (yearIndex >= 0 && yearIndex < yearly.length) addActivity(yearly[yearIndex], activity);
    if (date.getFullYear() === Number(selectedYear)) addActivity(monthly[date.getMonth()], activity);
  });
  // Future periods are not zero-valued actual results or forecasts.
  yearly.forEach((period) => {
    if (Number(period.label) > currentYear && !period.records) {
      Object.assign(period, { cost: null, revenue: null, yieldTonnes: null, profit: null });
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
  return `From ${first.label} to ${last.label}, revenue has ${direction('revenue')} and yield has ${direction('yieldTonnes')}.${lossNote}`;
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
  return `From ${first.label} to ${last.label}, revenue has ${direction('revenue')} and yield has ${direction('yieldTonnes')}.${lossNote}`;
}
