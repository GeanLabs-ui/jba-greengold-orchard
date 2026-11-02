import { buildCostTypeBreakdown } from '@/lib/activity-cost-types';
import ExpenseBreakdownContent from './ExpenseBreakdownContent';
import './cost-breakdown.css';

export default function CostBreakdown({ costRows, farmFor, rangeLabel = 'All recorded dates' }) {
  const categories = buildCostTypeBreakdown(costRows);
  const farms = Object.values(costRows.reduce((groups, row) => {
    const name = farmFor(row);
    groups[name] ||= { name, value: 0 };
    groups[name].value += row.value;
    return groups;
  }, Object.create(null))).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return <section className="cost-breakdown" aria-label="Expense Breakdown">
    <h2 className="expense-breakdown-heading">Expense Breakdown</h2>
    <ExpenseBreakdownContent rows={categories} farms={farms} rangeLabel={rangeLabel} />
  </section>;
}
