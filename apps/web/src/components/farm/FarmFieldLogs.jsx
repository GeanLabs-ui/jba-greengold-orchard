import { useCallback, useEffect, useMemo, useState } from 'react';
import { CloudSun, Loader2, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PROGRAMME_CODE } from '@/data/dailyRoutineProgramme';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { formatDate } from '@/lib/farm-management';

export const FIELD_LOG_TYPES = ['Nutrition', 'Irrigation', 'Pest & Disease', 'Weather', 'Lesson Learned'];

const today = () => new Date().toISOString().slice(0, 10);
const logCode = () => `FPL-${Date.now().toString().slice(-8)}`;
const fieldClass = 'flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
const belongsToFarm = (log, farm, blockIds) => log.farm_id === farm.id
  || (log.block_id && blockIds.has(log.block_id))
  || (!log.farm_id && log.farm_name === farm.name);

export default function FarmFieldLogs({ farm, blocks = [], initialBlockId = 'all', lockScope = false, canCreate = false, className = 'mt-8' }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [type, setType] = useState(FIELD_LOG_TYPES[0]);
  const [scope, setScope] = useState(initialBlockId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryScope, setEntryScope] = useState(initialBlockId === 'all' ? 'farm' : initialBlockId);

  const blockIds = useMemo(() => new Set(blocks.map((block) => block.id)), [blocks]);
  const loadLogs = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const records = await base44.entities.FarmProcessLog.list('-activity_date', 250);
      setLogs((records || []).filter((log) => belongsToFarm(log, farm, blockIds)));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load field logs.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [blockIds, farm]);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => subscribeToDataChanges(() => loadLogs({ silent: true }), ['FarmProcessLog']), [loadLogs]);

  const scopedLogs = useMemo(() => logs.filter((log) => {
    if (lockScope) return log.block_id === initialBlockId;
    if (scope === 'all') return true;
    if (scope === 'farm') return !log.block_id;
    return log.block_id === scope;
  }), [initialBlockId, lockScope, logs, scope]);
  const visibleLogs = useMemo(() => scopedLogs.filter((log) => (log.type || log.log_type || 'Nutrition') === type), [scopedLogs, type]);
  const typeCount = (logType) => scopedLogs.filter((log) => (log.type || log.log_type || 'Nutrition') === logType).length;
  const scopeLabel = lockScope
    ? blocks.find((block) => block.id === initialBlockId)?.name || 'sub-block'
    : scope === 'all' ? 'the farm land and all sub-blocks' : scope === 'farm' ? 'the whole farm land' : blocks.find((block) => block.id === scope)?.name || 'this sub-block';

  const openCreate = () => {
    setEntryScope(lockScope ? initialBlockId : scope === 'all' ? 'farm' : scope);
    setDialogOpen(true);
  };

  const createLog = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedBlock = blocks.find((block) => block.id === entryScope);
    setSaving(true);
    try {
      const payload = {
        programme_code: PROGRAMME_CODE,
        source: 'Farms',
        log_code: logCode(),
        phase: 'crop_management',
        type: form.get('type'),
        log_type: form.get('type'),
        activity_date: form.get('entry_date'),
        entry_date: form.get('entry_date'),
        farm_id: farm.id,
        farm_name: farm.name,
        block_id: selectedBlock?.id || '',
        block_name: selectedBlock?.name || 'Farm-wide',
        performed_by_name: form.get('owner'),
        owner: form.get('owner'),
        activity_title: form.get('notes'),
        notes: form.get('notes'),
        result: form.get('result'),
        status: 'completed',
        recorded_at: new Date().toISOString(),
      };
      const created = await base44.entities.FarmProcessLog.create(payload);
      if (form.get('type') === 'Weather') {
        await base44.entities.WeatherLog.create({ ...payload, weather_date: form.get('entry_date') }).catch(() => null);
      }
      setLogs((current) => [created, ...current.filter((log) => log.id !== created.id)]);
      setType(String(form.get('type')));
      if (!lockScope) setScope(selectedBlock?.id || 'farm');
      setDialogOpen(false);
      toast.success('Field log synchronized with Daily Activities');
    } catch (saveError) {
      toast.error(saveError.message || 'Unable to save the field log');
    } finally {
      setSaving(false);
    }
  };

  return <section id="field-logs" className={`${className} scroll-mt-24 rounded-xl border bg-card shadow-sm`}>
    <div className="flex flex-col gap-4 border-b px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Operational evidence</p><h2 className="mt-1 font-heading text-2xl font-semibold">Field logs</h2><p className="mt-1 text-sm text-muted-foreground">Dated observations and interventions for {scopeLabel}.</p></div>
      <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => loadLogs()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>{canCreate ? <Button type="button" size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New entry</Button> : null}</div>
    </div>
    {!lockScope ? <div className="border-b bg-muted/15 px-5 py-4"><label className="block max-w-sm text-xs font-medium text-muted-foreground">View records for<select className={`${fieldClass} mt-1.5`} value={scope} onChange={(event) => setScope(event.target.value)}><option value="all">Entire farm land + all sub-blocks</option><option value="farm">Farm-wide records only</option>{blocks.map((block) => <option key={block.id} value={block.id}>{block.block_code} · {block.name}</option>)}</select></label></div> : null}
    <div className="flex gap-2 overflow-x-auto px-5 py-4" role="tablist" aria-label="Field log categories">{FIELD_LOG_TYPES.map((logType) => <button type="button" role="tab" aria-selected={type === logType} key={logType} onClick={() => setType(logType)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${type === logType ? 'border-emerald-900 bg-emerald-900 text-white' : 'bg-background hover:border-emerald-300 hover:bg-emerald-50'}`}>{logType} · {typeCount(logType)}</button>)}</div>
    {error ? <div className="mx-5 mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div> : null}
    {loading ? <div className="grid min-h-52 place-items-center"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-emerald-700" />Loading field logs…</div></div> : null}
    {!loading && !error && visibleLogs.length ? <div className="overflow-x-auto border-t"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-muted/35 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Farm / sub-block</th><th className="px-5 py-3 font-medium">Responsible</th><th className="px-5 py-3 font-medium">Observation / action</th><th className="px-5 py-3 font-medium">Result / follow-up</th></tr></thead><tbody className="divide-y">{visibleLogs.map((log) => <tr key={log.id} className="align-top transition hover:bg-muted/20"><td className="whitespace-nowrap px-5 py-4 font-medium">{formatDate(log.entry_date || log.activity_date)}</td><td className="px-5 py-4"><span className="font-medium">{log.block_name || 'Farm-wide'}</span><span className="mt-0.5 block text-xs text-muted-foreground">{log.block_id ? farm.name : 'Whole farm land'}</span></td><td className="px-5 py-4">{log.owner || log.performed_by_name || 'Not recorded'}</td><td className="max-w-sm px-5 py-4 leading-6">{log.activity_title || log.notes}</td><td className="max-w-xs px-5 py-4 leading-6 text-muted-foreground">{log.result || 'No follow-up recorded'}</td></tr>)}</tbody></table></div> : null}
    {!loading && !error && !visibleLogs.length ? <div className="grid min-h-52 place-items-center border-t px-5 py-10 text-center"><div><CloudSun className="mx-auto h-8 w-8 text-emerald-700/70" /><p className="mt-3 font-semibold">No {type.toLowerCase()} entries yet</p><p className="mt-1 text-sm text-muted-foreground">The first dated record for {scopeLabel} will appear here.</p>{canCreate ? <Button type="button" className="mt-4" size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add entry</Button> : null}</div></div> : null}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Add field entry</DialogTitle><DialogDescription>This record will be visible here and in Daily Activities.</DialogDescription></DialogHeader><form onSubmit={createLog} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Log type<select name="type" className={`${fieldClass} mt-1.5`} defaultValue={type} required>{FIELD_LOG_TYPES.map((logType) => <option key={logType}>{logType}</option>)}</select></label>
      <label className="text-sm font-medium">Date<Input name="entry_date" className="mt-1.5" type="date" defaultValue={today()} required /></label>
      <label className="text-sm font-medium sm:col-span-2">Farm land / sub-block<select className={`${fieldClass} mt-1.5`} value={entryScope} onChange={(event) => setEntryScope(event.target.value)} disabled={lockScope}><option value="farm">{farm.name} · Whole farm land</option>{blocks.map((block) => <option key={block.id} value={block.id}>{block.block_code} · {block.name}</option>)}</select></label>
      <label className="text-sm font-medium sm:col-span-2">Responsible person<Input name="owner" className="mt-1.5" minLength={2} maxLength={120} required /></label>
      <label className="text-sm font-medium sm:col-span-2">Observation / action<textarea name="notes" className={`${fieldClass} mt-1.5 min-h-28 resize-y`} minLength={3} maxLength={4000} required /></label>
      <label className="text-sm font-medium sm:col-span-2">Result / follow-up<textarea name="result" className={`${fieldClass} mt-1.5 min-h-20 resize-y`} maxLength={2000} /></label>
      <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button><Button disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save entry</Button></DialogFooter>
    </form></DialogContent></Dialog>
  </section>;
}
