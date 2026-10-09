import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';

export default function ObjectiveAlignment({ values, onChange }) {
  const [cycles, setCycles] = useState([]), [search, setSearch] = useState(''), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load = async () => { try { const data = await base44.objectives.list(); if (active) { setCycles(data); setError(''); } } catch (err) { if (active) setError(err.message); } };
    void load(); const unsub = subscribeToDataChanges(load, ['ObjectiveCycle'], { refreshOnFocus: true });
    return () => { active = false; unsub(); };
  }, []);
  const year = Number(String(values.activity_date || '').slice(0, 4));
  const cycle = cycles.find(c => c.year === year);
  const objectives = (cycle?.closed_at ? [] : cycle?.objectives || []).filter(o => o.status === 'Active');
  const objective = objectives.find(o => o.id === values.related_objective);
  const subs = objective?.subs || [];
  const kpis = (objective?.kpis || []).filter(k => (k.sub_id || '') === (values.related_sub_objective || ''));
  const select = (name, value) => {
    onChange(name, value);
    if (name === 'related_objective') { onChange('related_sub_objective', ''); onChange('related_kpi', ''); }
    if (name === 'related_sub_objective') onChange('related_kpi', '');
  };
  return <section className="rounded-lg border border-[#dce9df] bg-white p-3"><h3 className="mb-2 text-sm font-semibold text-[#2e7d32]">Objective alignment (optional)</h3>
    {error && <p role="alert" className="mb-2 text-xs text-red-700">Objective list unavailable: {error}</p>}
    <input aria-label="Search objective alignment" placeholder="Search objectives, sub-objectives and KPIs…" value={search} onChange={e => setSearch(e.target.value)} className="mb-3 w-full rounded border border-slate-200 p-2 text-sm" />
    <div className="grid gap-3 sm:grid-cols-3">{[['related_objective', 'Related Objective', objectives], ['related_sub_objective', 'Related Sub-Objective', subs], ['related_kpi', 'Related KPI', kpis]].map(([name, label, rows]) => <label key={name} className="text-xs font-semibold text-slate-600">{label}<select aria-label={label} value={values[name] || ''} onChange={e => select(name, e.target.value)} className="mt-1 w-full rounded border border-slate-200 bg-white p-2 text-sm"><option value="">None</option>{rows.filter(r => r.id === values[name] || `${r.name} ${r.code || ''}`.toLowerCase().includes(search.toLowerCase())).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>)}</div>
    {values.related_objective && !objective && <p role="alert" className="mt-2 text-xs text-red-700">This objective is closed, inactive or belongs to another year. Clear the link or choose an active objective.</p>}
    <p className="mt-2 text-xs text-slate-500">A numerical log contributes once to the selected KPI. KPI outcome and activity completion are calculated separately.</p>
  </section>;
}
