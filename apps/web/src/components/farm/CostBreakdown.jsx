import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { buildCostTypeBreakdown, formatCostPercentage as percent } from '@/lib/activity-cost-types';
import ExpensePhotoChart from './ExpensePhotoChart';
import './cost-breakdown.css';
const money = value => `₵${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const colors = ['#ffbf00', '#087aff', '#ff1919', '#f31b89', '#0cb32b', '#8500ff', '#00aff5'];
export default function CostBreakdown({ costRows, farmFor }) {
  const [selection, setSelection] = useState(null);
  const categories = buildCostTypeBreakdown(costRows);
  const total = categories.reduce((sum,item) => sum + item.value, 0);
  const farms = Object.values(costRows.reduce((groups,row) => {
    const name = farmFor(row);
    groups[name] ||= { name, value: 0 };
    groups[name].value += row.value;
    return groups;
  }, Object.create(null))).sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const select = (kind, name) => setSelection(current => name === 'all' || (current?.kind === kind && current.name === name) ? null : { kind, name });
  const selectedCategory = selection?.kind === 'category' ? categories.find(item => item.name === selection.name) : null;
  const focus = !selection ? null : {
    name: selection.name,
    value: selectedCategory ? selectedCategory.value : costRows.filter(row => farmFor(row) === selection.name).reduce((sum,row) => sum + row.value, 0),
    color: selectedCategory ? colors[categories.indexOf(selectedCategory)] : '#986300',
  };
  return <section className="cost-breakdown" aria-label="Expense Breakdown">
    {selection && <button type="button" className="cost-clear-selection" onClick={() => setSelection(null)}>Clear selection</button>}
    <span className="sr-only" aria-live="polite">{focus ? `${focus.name}: ${money(focus.value)}, ${percent(focus.value,total)}` : `Total cost: ${money(total)}`}</span>
    <h2 className="expense-breakdown-heading">Expense Breakdown</h2><ExpensePhotoChart rows={categories} total={total} selectionName={selection?.kind === 'category' ? selection.name : null} onSelectionChange={name => select('category', name || 'all')} />
    <details className="cost-farm-split"><summary>Cost Split by Main Farm</summary>

      <div className="cost-farm-items">
        {farms.map(farm => <button key={farm.name} type="button" onClick={() => select('farm',farm.name)} aria-pressed={selection?.kind === 'farm' && selection.name === farm.name} className="cost-farm-item"><span className="cost-location"><MapPin/></span><span><strong>{farm.name}</strong><span>{money(farm.value)} · {percent(farm.value,total)}</span></span></button>)}
        {!farms.length && <p>No farm costs recorded for this selection.</p>}
        <button type="button" className="cost-farm-total" onClick={() => select('category','all')}><span>Total Cost</span><strong>{money(total)}</strong></button>
      </div>
    </details>
  </section>;
}
