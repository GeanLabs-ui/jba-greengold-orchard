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
  const categories = buildCostTypeBreakdown(rows.map(row => ({ cost_type: row.name, value: row.value })));
  const total = categories.reduce((sum, row) => sum + row.value, 0);
  const slices = categories.filter(row => row.value > 0);
  return <div className="expense-breakdown-content">
    <div className="expense-cost-donut" role="img" aria-label={`Total cost: ${money(total)}. ${slices.map(row => `${row.name}: ${money(row.value)}`).join(', ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={slices.length ? slices : [{ name: 'No recorded costs', value: 1, color: '#edf2f7' }]} dataKey="value" nameKey="name" innerRadius="65%" outerRadius="96%" startAngle={90} endAngle={-270} stroke="#fff" strokeWidth={1} isAnimationActive={false}>
            {(slices.length ? slices : [{ color: '#edf2f7' }]).map((row, index) => <Cell key={row.name || index} fill={row.color} />)}
          </Pie>
          {slices.length > 0 && <Tooltip formatter={(value, name) => [`${money(value)} · ${formatCostPercentage(value, total)}`, name]} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="expense-cost-center"><span>Total Cost</span><strong>{money(total)}</strong><small>{rangeLabel}</small></div>
    </div>
    <ul className="expense-cost-key" aria-label="Recorded cost types">
      {categories.map(row => <li key={row.name}>
        <span className="expense-cost-name"><i style={{ backgroundColor: row.color }} aria-hidden="true" />{row.name}</span>
        <span className="expense-cost-amount"><strong>{money(row.value)}</strong><small>{formatCostPercentage(row.value, total)}</small></span>
      </li>)}
    </ul>
    <details className="expense-main-farms">
      <summary>Cost Split by Main Farm</summary>
      <div className="expense-main-farm-list">
        {farms.map((farm, index) => <div className="expense-main-farm-row" key={farm.name}>
          <span className="expense-farm-name"><MapPin style={{ color: farmColors[index % farmColors.length] }} aria-hidden="true" /><span>{farm.name}</span></span>
          <span className="expense-farm-amount"><strong>{money(farm.value)}</strong><small> · {formatCostPercentage(farm.value, total)}</small></span>
        </div>)}
        {!farms.length && <p>No farm costs recorded for this selection.</p>}
      </div>
    </details>
  </div>;
}
