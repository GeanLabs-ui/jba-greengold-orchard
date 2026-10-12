import { formatCurrency, formatNumber } from '@/components/shared/format';

export default function TaskLogMetrics({ model }) {
  return <section aria-label="Daily Task Log actual totals" className="grid gap-3 sm:grid-cols-3">
    {[['Actual Cost', formatCurrency(model.totalCost)], ['Actual Revenue', formatCurrency(model.totalRevenue)], ['Actual Yield', `${formatNumber(model.totalYieldKg / 1000)} tonnes`]].map(([label, value]) =>
      <div key={label} className="rounded-lg border border-border bg-card p-4"><p className="text-kpi-label text-muted-foreground">{label}</p><p className="mt-2 text-kpi-value">{value}</p><p className="mt-1 text-caption text-muted-foreground">Daily Task Log · selected period</p></div>)}
  </section>;
}
