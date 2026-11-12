import { formatChartValue, positivePieSlices } from '@/lib/analytics-chart-scale';
import React from 'react';
import { MapPin } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { buildCostTypeBreakdown, formatCostPercentage } from '@/lib/activity-cost-types';
import './expense-breakdown-content.css';

const money = value => `₵${Number(value || 0).toLocaleString('en-GH', { maximumFractionDigits: 0 })}`;
const farmColors = ['#059669', '#3b82f6', '#d97706', '#8b5cf6', '#64748b'];

export default function ExpenseBreakdownContent({ rows = [], farms = [], rangeLabel = 'All recorded dates' }) {
  // Use the same categories and colours as the Type of Cost field. Slice sizes
  // come exclusively from recorded amounts, including legacy type aliases.
  const categories = buildCostTypeBreakdown(rows.map(row => ({ cost_type: row.name, value: row.value })))
    .sort((a, b) => b.value - a.value);
  const total = categories.reduce((sum, row) => sum + row.value, 0);
  const slices = positivePieSlices(categories);
  const positiveTotal = slices.reduce((sum, row) => sum + row.value, 0);
  const farmPositiveTotal = farms.reduce((sum, row) => sum + Math.max(0, row.value), 0);
  const hasAdjustments = categories.some(row => row.value < 0);
  return <div className="expense-breakdown-content">
    <div className="expense-cost-donut" role="img" aria-label={`Total cost: ${money(total)}. ${slices.map(row => `${row.name}: ${money(row.value)}`).join(', ')}`}>
      {slices.length ? <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={slices} dataKey="value" nameKey="name" innerRadius="65%" outerRadius="96%" startAngle={90} endAngle={-270} stroke="#fff" strokeWidth={1} isAnimationActive={false}>
            {slices.map((row, index) => <Cell key={row.name || index} fill={row.color} />)}
          </Pie>
          {slices.length > 0 && <Tooltip formatter={(value, name) => [`${formatChartValue(value, 'GHS')} · ${formatCostPercentage(value, positiveTotal)}`, name]} />}
        </PieChart>
      </ResponsiveContainer> : null}
      <div className="expense-cost-center"><span>{total < 0 ? "Net credit" : hasAdjustments ? "Net cost" : "Total cost"}</span><strong>{money(Math.abs(total))}</strong><small>{rangeLabel}</small></div>
    </div>
    <ul className="expense-cost-key" aria-label="Recorded cost types">
      {categories.map(row => <li key={row.name}>
        <span className="expense-cost-name"><i style={{ backgroundColor: row.color }} aria-hidden="true" />{row.name}</span>
        <span className="expense-cost-amount"><strong>{money(Math.abs(row.value))}</strong><small>{row.value < 0 ? "Credit" : formatCostPercentage(row.value, positiveTotal)}</small></span>
      </li>)}
    </ul>
    {hasAdjustments && <p className="text-caption text-muted-foreground">Slices show positive costs. Adjustments are included in the net total.</p>}
    <details className="expense-main-farms">
      <summary>Cost Split by Main Farm</summary>
      <div className="expense-main-farm-list">
        {farms.map((farm, index) => <div className="expense-main-farm-row" key={farm.name}>
          <span className="expense-farm-name"><MapPin style={{ color: farmColors[index % farmColors.length] }} aria-hidden="true" /><span>{farm.name}</span></span>
          <span className="expense-farm-amount"><strong>{money(Math.abs(farm.value))}</strong><small> · {farm.value < 0 ? "Credit" : formatCostPercentage(farm.value, farmPositiveTotal)}</small></span>
        </div>)}
        {!farms.length && <p>No farm costs recorded for this selection.</p>}
      </div>
    </details>
  </div>;
}
