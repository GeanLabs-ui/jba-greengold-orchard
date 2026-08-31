import React from 'react';

const semanticTone = (column) => {
  const text = `${column.semantic || ''} ${column.label || ''} ${column.key || ''}`.toLowerCase();
  if (/(cost|expense)/.test(text)) return 'text-rose-600';
  if (/yield/.test(text)) return 'text-emerald-700';
  if (/(revenue|sales)/.test(text)) return 'text-blue-600';
  return '';
};

export default function DataTable({
  items,
  columns,
  emptyMessage = 'No records found.',
  onRowClick,
  selectedId,
  rowActions,
  selectable = false,
  selectedIds = [],
  onSelectedIdsChange,
}) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {selectable && <th className="w-12 px-4 py-3"><input type="checkbox" aria-label="Select all rows" checked={items.length > 0 && items.every((item) => selectedIds.includes(item.id))} onChange={(event) => onSelectedIdsChange?.(event.target.checked ? items.map((item) => item.id).filter(Boolean) : [])} /></th>}
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 font-semibold ${semanticTone(col) || 'text-muted-foreground'} ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                {col.label}
              </th>
            ))}
            {rowActions && <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item, i) => (
            <tr
              key={item.id || i}
              className={`transition-colors hover:bg-muted/30 ${onRowClick ? 'cursor-pointer' : ''} ${selectedId === item.id ? 'bg-primary/10' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {selectable && <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`Select row ${i + 1}`} checked={selectedIds.includes(item.id)} onChange={(event) => onSelectedIdsChange?.(event.target.checked ? [...selectedIds, item.id] : selectedIds.filter((id) => id !== item.id))} /></td>}
              {columns.map((col) => {
                const val = item[col.key];
                return (
                  <td key={col.key} className={`px-4 py-3 ${semanticTone(col)} ${col.align === 'right' ? 'text-right' : ''}`}>
                    {col.render ? col.render(val, item) : col.format ? col.format(val) : val || '—'}
                  </td>
                );
              })}
              {rowActions && (
                <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                  <div className="flex justify-end gap-2">{rowActions(item)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
