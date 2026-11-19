import { fingerprint } from './data-import/secure-payload.mjs';

export function assertExistingRowsPreserved(table, before, after) {
  const columns = Object.keys(before[0]?.row || {});
  const project = ({ row }) => ({ row: Object.fromEntries(columns.map(column => [column, row[column]])) });
  const remaining = new Map();
  for (const row of after) {
    const hash = fingerprint(project(row));
    remaining.set(hash, (remaining.get(hash) || 0) + 1);
  }
  for (const row of before) {
    const hash = fingerprint(row), count = remaining.get(hash) || 0;
    if (!count) throw new Error(`Existing data changed or disappeared in ${table}; inspect encrypted snapshots before proceeding`);
    remaining.set(hash, count - 1);
  }
}
