import { formatCurrency, formatNumber } from '@/components/shared/format';

export default function TaskLogMetrics({ model, compact = false }) {
  const metrics = [
    ['Actual Cost', formatCurrency(model.totalCost)],
    ['Actual Revenue', formatCurrency(model.totalRevenue)],
    ['Actual Yield', `${formatNumber(model.totalYieldKg)} Kg`],
  ];
  return (
    <section aria-label="Daily Task Log actual totals">
      <dl className={compact ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-3 gap-3'}>
        {metrics.map(([label, value]) => (
          <div key={label} className={compact ? 'min-w-0' : 'min-w-0 rounded-lg border bg-card p-3 sm:p-4'}>
            <dt className="text-caption text-muted-foreground">{label}</dt>
            <dd className={`mt-1 break-words font-semibold tabular-nums ${compact ? 'text-caption' : 'sm:text-kpi-value'}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
