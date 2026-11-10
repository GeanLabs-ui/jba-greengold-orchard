import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatChartValue, positivePieSlices } from '@/lib/analytics-chart-scale';

const colors = ['#16834e', '#2563eb', '#cb7709', '#7c3aed', '#64748b'];

export default function AnalyticsPie({ rows, unit, title, emptyMessage = 'No values available for this breakdown.' }) {
  const slices = positivePieSlices(rows);
  if (!slices.length) return <p role="status" className="grid min-h-24 place-items-center text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  const total = slices.reduce((sum, row) => sum + Number(row.value), 0);
  return <div className="grid min-w-0 gap-3">
    <div className="h-40 min-w-0" role="img" aria-label={title}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={slices} dataKey="value" nameKey="name" innerRadius="63%" outerRadius="93%" paddingAngle={slices.length > 1 ? 1 : 0} isAnimationActive={false}>
            {slices.map((row, index) => <Cell key={row.name} fill={row.color || colors[index % colors.length]} />)}
          </Pie>
          <Tooltip formatter={(value) => [formatChartValue(value, unit) + ' · ' + (100 * value / total).toLocaleString('en-GH', { maximumFractionDigits: 1 }) + '%', 'Share']} />
        </PieChart>
      </ResponsiveContainer>
    </div>
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-caption" aria-label="Chart legend">
      {slices.map((row, index) => <li key={row.name} className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color || colors[index % colors.length] }} />
        {row.name} <strong>{formatChartValue(row.value, unit)}</strong>
      </li>)}
    </ul>
  </div>;
}
