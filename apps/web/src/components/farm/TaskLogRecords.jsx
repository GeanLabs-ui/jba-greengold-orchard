import { formatCurrency, formatDate, formatNumber } from '@/components/shared/format';
import { activityCost, activityRevenue, activityYieldKg } from '@/lib/farm-operations-analytics';
import { normalizeCostType } from '@/lib/activity-cost-types';
import { blockLabel } from '@/lib/farm-scope';

export const activityLogColumns = [
  { key: 'activity_date', label: 'Date', className: 'w-[92px]', headerClassName: 'bg-[#f4fbf5] text-[#2e7d32]', render: (item) => formatDate(item.activity_date) },
  { key: 'title', label: 'Task Description', className: 'w-[168px]', headerClassName: 'bg-[#f4fbf5] text-[#2e7d32]', render: (item) => item.title || item.activity_title || item.description },
  { key: 'status', label: 'Status', className: 'w-[96px]', headerClassName: 'bg-[#f4fbf5] text-[#2e7d32]' },
  { key: 'category', label: 'Activity Type', className: 'w-[110px]', headerClassName: 'bg-[#f4fbf5] text-[#2e7d32]', render: (item) => item.category },
  { key: 'item_tag', label: 'Item Tag', className: 'w-[92px]', headerClassName: 'bg-[#f4fbf5] text-[#2e7d32]', render: (item) => item.item_tag || item.input_name || item.equipment_used },
  { key: 'quantity', label: 'Quantity', className: 'w-[72px] text-center', headerClassName: 'bg-[#f4fbf5] text-[#2e7d32]', render: (item) => formatNumber(item.quantity_used ?? item.harvest_quantity ?? item.crates_used) },
  { key: 'responsible', label: 'Responsible', className: 'w-[116px]', headerClassName: 'bg-[#f4fbf5] text-[#2e7d32]', render: (item) => item.responsible || item.assigned_workers || item.supervisor_name },
  { key: 'contact', label: 'Contact', className: 'w-[92px]', headerClassName: 'bg-[#f4fbf5] text-[#2e7d32]', render: (item) => item.contact },
  { key: 'block_name', label: 'Farm Block', className: 'w-[102px]', headerClassName: 'bg-[#f4fbf5] text-[#2e7d32]', render: (item) => blockLabel(item) },
  { key: 'actual_cost', label: 'Actual Cost', className: 'w-[96px] text-center', headerClassName: 'bg-[#f4fbf5] text-[#2e7d32]', render: (item) => <span className="font-semibold text-[#2e7d32]">{formatCurrency(activityCost(item))}</span> },
  { key: 'revenue', label: 'Actual Revenue', className: 'w-[84px] text-center', headerClassName: 'bg-[#f4fbf5] text-[#2e7d32]', render: (item) => <span className="font-semibold text-[#2e7d32]">{formatCurrency(activityRevenue(item))}</span> },
  { key: 'output_quantity_kg', label: 'Actual Yield (Kg)', className: 'w-[104px] text-center', headerClassName: 'bg-[#f4fbf5] text-[#2e7d32]', render: (item) => <span className="font-semibold text-[#2e7d32]">{formatNumber(activityYieldKg(item))} Kg</span> },
  { key: 'cost_type', label: 'Type of Cost', className: 'w-[86px] text-center', headerClassName: 'bg-[#f4fbf5] text-[#2e7d32]', render: (item) => item.cost_type ? normalizeCostType(item.cost_type) : '—' },
  { key: 'notes', label: 'Notes', className: 'w-[170px]', headerClassName: 'bg-[#f4fbf5] text-[#2e7d32]', render: (item) => item.notes },
];

export function taskLogCell(item, column) {
  if (column.key === 'status') {
    return <span className="inline-flex rounded-sm bg-[#e8f5e9] px-2 py-0.5 text-caption font-medium text-[#256b2a]">{item.status || 'Pending'}</span>;
  }
  const value = column.render ? column.render(item) : item[column.key];
  return value == null || value === '' ? '—' : value;
}

export default function TaskLogRecords({ activities }) {
  return (
    <section className="task-log-records my-4 overflow-hidden rounded-lg border bg-card" aria-label="Daily Task Log records">
      <h2 className="border-b px-4 py-3 text-section-title">Daily Task Log records</h2>
      {activities.length ? (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Daily Task Log table">
          <table className="w-full min-w-[1320px] table-fixed border-collapse text-caption text-slate-800">
            <thead>
              <tr>
                {activityLogColumns.map((column) => (
                  <th key={column.key} scope="col" className={"border border-slate-100 px-3 py-2 text-center " + column.headerClassName + " " + column.className}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activities.map((item) => (
                <tr key={item.id} className="hover:bg-[#f9fcfa]">
                  {activityLogColumns.map((column) => (
                    <td key={column.key} className={"border border-slate-200 px-3 py-2 align-middle break-words " + column.className}>
                      {taskLogCell(item, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="px-4 py-6 text-sm text-muted-foreground">No Daily Task Log records for this period.</p>}
    </section>
  );
}
