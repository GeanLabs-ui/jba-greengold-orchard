import { harvestDays, harvestChange } from '@/lib/harvest-metrics';
import { FARM_SCOPE_OPTIONS, matchesFarmScope, resolveOperationalScope } from '@/lib/farm-scope';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Store, Tag, ShoppingBasket, CircleX, Coins, Users, ChartNoAxesColumnIncreasing, Clock, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import HarvestRecordDialog from '@/components/farm/HarvestRecordDialog';
import './harvest-operations.css';

const number = (value) => Number(value) || 0;
const fmt = (value) => new Intl.NumberFormat('en-GH', { maximumFractionDigits: 3 }).format(number(value));
const day = (value) => String(value || '').slice(0, 10);
const statusInfo = (value) => {
  const key = String(value || 'planned').toLowerCase().replaceAll('_', ' ');
  if (/complete/.test(key)) return { label: 'Completed', tone: 'green' };
  if (/transport|dispatch/.test(key)) return { label: 'Awaiting Transport', tone: 'blue' };
  if (/quality|qc/.test(key)) return { label: 'Quality Check', tone: 'purple' };
  if (/progress/.test(key)) return { label: 'In Progress', tone: 'amber' };
  return { label: value ? String(value).replaceAll('_', ' ') : 'Planned', tone: 'slate' };
};
const quantity = (r) => number(r.quantity_harvested_kg ?? r.total_quantity ?? r.harvest_quantity);
const cost = (r) => number(r.harvest_cost ?? r.actual_cost ?? r.total_cost ?? r.cost);
const team = (r) => { const value = r.team_name || r.team || r.assigned_team || r.team_lead; return !value || /^(not recorded|unassigned|n\/a)$/i.test(value) ? 'Unassigned' : value; };
const dateLabel = (value) => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
function Status({ value }) { const s = statusInfo(value); return <span className={`ho-status ho-${s.tone}`}><i /><span>{s.label}</span></span>; }
function Panel({ title, icon: Icon, action, children, className = '' }) { return <section className={`ho-panel ${className}`}><header><h2><Icon />{title}</h2>{action}</header>{children}</section>; }
function Empty({ columns }) { return <tr><td colSpan={columns} className="ho-empty">No harvest records found.</td></tr>; }

export default function HarvestOperations() {
  const preview = import.meta.env.DEV;
  const [data, setData] = useState({ records: [], farms: [], blocks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sampleChanged, setSampleChanged] = useState(false);
  const [scope, setScope] = useState('all');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const recordsRef = useRef(null);
  const load = useCallback(async () => {
    try {
      if (import.meta.env.DEV && preview) {
        const { harvestPreviewData } = await import('./harvest-preview');
        const seed = harvestPreviewData();
        const saved = localStorage.getItem('jba:harvest-dev-records:v1');
        setData({ ...seed, records: saved ? JSON.parse(saved) : seed.records }); setSampleChanged(Boolean(saved)); setError(''); return;
      }
      const [records, farms, blocks] = await Promise.all([base44.entities.HarvestBatch.listAll('-harvest_date'), base44.entities.Farm.listAll(), base44.entities.FarmBlock.listAll()]);
      setData({ records, farms, blocks }); setError('');
    } catch { setError('Harvest records could not be loaded. Please retry.'); }
    finally { setLoading(false); }
  }, [preview]);
  useEffect(() => { void load(); return preview ? undefined : subscribeToDataChanges(load, ['HarvestBatch', 'Farm', 'FarmBlock'], { refreshOnFocus: true }); }, [load]);
  useEffect(() => {
    if (preview && !loading && sampleChanged) {
      try { localStorage.setItem('jba:harvest-dev-records:v1', JSON.stringify(data.records)); }
      catch { setError('Local storage is full. Remove large evidence files before saving more records.'); }
    }
  }, [data.records, loading, preview, sampleChanged]);
  const rows = useMemo(() => data.records.map((r) => ({ ...r, farm_name: r.farm_name || data.farms.find((f) => String(f.id) === String(r.farm_id))?.name || '—', block_name: r.block_name || data.blocks.find((b) => String(b.id) === String(r.block_id))?.name || '—' })).filter((r) => matchesFarmScope(r, scope, data) && (!status || statusInfo(r.status).label === status)), [data, scope, status]);
  const { recorded, current, previous } = harvestDays(rows);
  const sum = (items, get) => items.reduce((total, r) => total + get(r), 0);
  const metrics = [
    { label: "Today's Harvest", value: `${fmt(sum(current, quantity) / 1000)} tonnes`, icon: ShoppingBasket, tone: 'lime', now: sum(current, quantity), before: sum(previous, quantity) },
    { label: 'Rejected Quantity', value: `${fmt(sum(current, (r) => number(r.rejected_kg)) / 1000)} tonnes`, icon: CircleX, tone: 'red', now: sum(current, (r) => number(r.rejected_kg)), before: sum(previous, (r) => number(r.rejected_kg)), reverse: true },
    { label: 'Total Harvest Cost', value: `GH₵ ${fmt(sum(current, cost))}`, icon: Coins, tone: 'gold', now: sum(current, cost), before: sum(previous, cost), reverse: true },
    { label: 'Active Teams', value: new Set(current.map(team).filter((t) => t !== 'Unassigned')).size, icon: Users, tone: 'green', note: `of ${new Set(rows.map(team).filter((t) => t !== 'Unassigned')).size} teams` },
  ];
  const blocks = Object.values(recorded.reduce((acc, r) => { const key = `${r.farm_name}/${r.block_name}`; acc[key] ||= { name: r.block_name, farm: r.farm_name, total: 0 }; acc[key].total += quantity(r); return acc; }, {}));
  const teams = Object.values(recorded.reduce((acc, r) => { const key = team(r); acc[key] ||= { name: key, blocks: new Set(), total: 0, rejected: 0, cost: 0 }; acc[key].blocks.add(r.block_name); acc[key].total += quantity(r); acc[key].rejected += number(r.rejected_kg); acc[key].cost += cost(r); return acc; }, {}));
  const create = async (values) => {
    const location = resolveOperationalScope(values, data.farms, data.blocks);
    if ((values.status !== 'Draft' && number(values.quantity_harvested_kg) <= 0) || number(values.rejected_kg) < 0 || number(values.harvest_cost) < 0 || number(values.rejected_kg) > number(values.quantity_harvested_kg)) throw new Error('Enter a positive harvest quantity, non-negative cost, and rejected quantity no greater than the total.');
    if (preview) {
      setSampleChanged(true);
      setData((existing) => ({ ...existing, records: [{ ...values, id: String(Date.now()), harvest_code: values.harvest_code || 'HV-DEMO-' + Date.now(), ...location, created_date: new Date().toISOString() }, ...existing.records] }));
      return;
    }
    await base44.entities.HarvestBatch.create({ ...values, quantity_harvested_kg: number(values.quantity_harvested_kg), rejected_kg: number(values.rejected_kg), harvest_cost: number(values.harvest_cost), ...location, harvest_code: values.harvest_code || `HV-${Date.now()}`, batch_number: `BATCH-${Date.now()}` });
    await load();
  };
  const updateRecord = async (values) => {
    const updated = { ...selected, ...values, ...resolveOperationalScope(values, data.farms, data.blocks) };
    if (!preview) { const { id, ...payload } = updated; await base44.entities.HarvestBatch.update(id, payload); }
    setData((old) => ({ ...old, records: old.records.map((r) => r.id === selected.id ? updated : r) }));
    setSelected(updated); setSampleChanged(true);
  };
  const deleteRecord = async () => {
    if (!preview) await base44.entities.HarvestBatch.delete(selected.id);
    setData((old) => ({ ...old, records: old.records.filter((r) => r.id !== selected.id) }));
    setSelected(null); setSampleChanged(true);
  };
  return <div className="harvest-ops">
    <div className="ho-toolbar">
      <label className="ho-filter ho-scope-filter"><Store /><select aria-label="Filter by farm and block" value={scope} onChange={(e) => setScope(e.target.value)}>{FARM_SCOPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="ho-filter"><Tag /><select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All Statuses</option>{[...new Set(['Completed', 'In Progress', 'Awaiting Transport', 'Quality Check', 'Planned', ...data.records.map((r) => statusInfo(r.status).label)])].map((s) => <option key={s}>{s}</option>)}</select></label>
      <HarvestRecordDialog data={data} onCreate={create} preview={preview} />
    </div>
    {error && <div role="alert" className="ho-error">{error} <button onClick={load}>Retry</button></div>}
    {loading && <p role="status">Loading harvest records…</p>}
    <div className="ho-metrics">{metrics.map(({ label, value, icon: Icon, tone, now, before, reverse, note }) => { const change = harvestChange(now, before); return <section className="ho-metric" key={label}><span className={`ho-metric-icon ho-${tone}`}><Icon /></span><div><h2>{label}</h2><strong>{value}</strong></div><div className="ho-metric-note">{note || <><b className={change !== null && (reverse ? change <= 0 : change >= 0) ? 'ho-good' : change !== null ? 'ho-bad' : ''}>{change === null ? 'New' : change === 0 ? '0%' : `${change > 0 ? '↑ +' : '↓ '}${change}%`}</b><span>{change === null ? "No records yesterday" : "vs. yesterday"}</span></>}</div></section>; })}</div>
    <div className="ho-middle">
      <Panel title="Today's Harvest Status" icon={ChartNoAxesColumnIncreasing}><div className="ho-table-wrap"><table><thead><tr>{['Block', 'Farm', 'Status', 'Harvested Qty (tonnes)', 'Rejected Qty (tonnes)', 'Date Stamp', 'Actions'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{current.map((r) => <tr key={r.id}><td className="ho-bold">{r.block_name}</td><td>{r.farm_name}</td><td><Status value={r.status} /></td><td>{fmt(quantity(r) / 1000)} tonnes</td><td>{fmt(number(r.rejected_kg) / 1000)} tonnes</td><td>{dateLabel(r.harvest_date)}</td><td><button className="ho-view" onClick={() => setSelected(r)}>View</button></td></tr>)}{!current.length && <Empty columns={7} />}</tbody></table></div></Panel>
      <Panel title="Today's Activity Timeline" icon={Clock}><div className="ho-timeline">{current.map((r) => <button key={r.id} className={`ho-event ho-${statusInfo(r.status).tone}`} onClick={() => setSelected(r)}><time>{r.time_recorded || (r.created_date ? new Date(r.created_date).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Accra' }) : '—')}</time><i /><span><strong>{r.block_name} {statusInfo(r.status).label.toLowerCase()}</strong><small>{team(r)} · {fmt(quantity(r) / 1000)} tonnes · {r.farm_name}</small></span></button>)}{!current.length && <p className="ho-empty">No harvest activity today.</p>}</div></Panel>
    </div>
    <div ref={recordsRef}><Panel title="Recent Harvest Records" icon={FileText}><div className="ho-table-wrap"><table><thead><tr>{['Record ID', 'Date', 'Farm', 'Block', 'Variety', 'Total Qty (tonnes)', 'Rejected Qty (tonnes)', 'Cost (GH₵)', 'Team', 'Supervisor', 'Status'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.id} tabIndex={0} className="ho-clickable-record" onClick={() => setSelected(r)} onKeyDown={(e) => { if (e.target === e.currentTarget && ['Enter', ' '].includes(e.key)) { e.preventDefault(); setSelected(r); } }}><td>{r.harvest_code || r.batch_number || r.id}</td><td>{day(r.harvest_date) || '—'}</td><td>{r.farm_name}</td><td>{r.block_name}</td><td>{r.mango_variety || r.variety || '—'}</td><td>{fmt(quantity(r) / 1000)}</td><td>{fmt(number(r.rejected_kg) / 1000)}</td><td>{fmt(cost(r))}</td><td>{team(r)}</td><td>{r.supervisor_name || r.supervisor || r.team_lead || '—'}</td><td><Status value={r.status} /></td></tr>)}{!rows.length && <Empty columns={11} />}</tbody></table></div></Panel></div>
    <div className="ho-bottom"><Panel title="Harvest by Farm Block" icon={ChartNoAxesColumnIncreasing}><div className="ho-bars">{blocks.map((b, index) => <div key={`${b.farm}/${b.name}`} title={`${b.farm} · ${b.name}`}><span>{b.name}</span><div><i style={{ width: `${b.total / Math.max(1, ...blocks.map((item) => item.total)) * 100}%`, background: ['#29b83d', '#f4b500', '#3973fa', '#962cf7'][index % 4] }} /></div><strong>{fmt(b.total / 1000)} tonnes</strong></div>)}{!blocks.length && <p className="ho-empty">No harvest quantities to display.</p>}</div></Panel>
    <Panel title="Team Performance" icon={Users}><div className="ho-table-wrap"><table><thead><tr>{['Team', 'Blocks Handled', 'Total Harvest (tonnes)', 'Rejected (tonnes)', 'Cost (GH₵)'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{teams.map((t) => <tr key={t.name}><td>{t.name}</td><td>{[...t.blocks].join(', ')}</td><td>{fmt(t.total / 1000)}</td><td>{fmt(t.rejected / 1000)}</td><td>{fmt(t.cost)}</td></tr>)}{!teams.length && <Empty columns={5} />}</tbody></table></div></Panel></div>
    {selected && <HarvestRecordDialog key={selected.id} data={data} preview={preview} record={selected} onClose={() => setSelected(null)} onSave={updateRecord} onDelete={deleteRecord} />}

  </div>;
}
