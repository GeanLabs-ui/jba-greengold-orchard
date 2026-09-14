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
    <>
    <div className="mobile-record-list md:hidden">
      {selectable && <label className="flex min-h-11 items-center gap-3"><input type="checkbox" aria-label="Select all rows" checked={items.every((item) => selectedIds.includes(item.id))} onChange={(event) => onSelectedIdsChange?.(event.target.checked ? items.map((item) => item.id).filter(Boolean) : [])} />Select all</label>}
      {items.map((item, i) => (
        <article key={item.id || i} className={`mobile-record ${selectedId === item.id ? 'ring-2 ring-primary' : ''}`}>
          {selectable && <label className="flex min-h-11 items-center gap-3"><input type="checkbox" aria-label={`Select row ${i + 1}`} checked={selectedIds.includes(item.id)} onChange={(event) => onSelectedIdsChange?.(event.target.checked ? [...selectedIds, item.id] : selectedIds.filter((id) => id !== item.id))} />Select record</label>}
          <dl className="mobile-record-fields">
            {columns.slice(0, 3).map((col) => <div key={col.key}><dt>{col.label}</dt><dd className={semanticTone(col)}>{col.render ? col.render(item[col.key], item) : col.format ? col.format(item[col.key]) : item[col.key] ?? '—'}</dd></div>)}
          </dl>
          {columns.length > 3 && <details className="mobile-record-details"><summary>More details</summary><dl className="mobile-record-fields">{columns.slice(3).map((col) => <div key={col.key}><dt>{col.label}</dt><dd className={semanticTone(col)}>{col.render ? col.render(item[col.key], item) : col.format ? col.format(item[col.key]) : item[col.key] ?? '—'}</dd></div>)}</dl></details>}
          {(onRowClick || rowActions) && <div className="mobile-record-actions">{onRowClick && <button type="button" className="rounded border border-border px-3 py-2 font-semibold text-primary" onClick={() => onRowClick(item)}>View record</button>}{rowActions?.(item)}</div>}
        </article>
      ))}
    </div>
    <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm md:block">
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
    </>
  );
}
