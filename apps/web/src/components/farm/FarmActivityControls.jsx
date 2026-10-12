import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { activities, activityStatuses, activityForTask, dateOnly, localDate, synchronizeActivity } from '@/lib/farm-activities';

export const formatActivityDate = (value) => value ? new Date(`${dateOnly(value)}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const parsed = (value) => value ? new Date(`${dateOnly(value)}T12:00:00`) : undefined;

export function ActivityDateRange({ start, end, onApply, disabled, label = 'Date range', iconOnly = false, triggerText }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ start: '', end: '' });
  const invalid = Boolean(draft.start && draft.end && draft.end < draft.start);
  const rangeLabel = start || end ? `${formatActivityDate(start) || 'Start date'} – ${formatActivityDate(end) || 'End date'}` : 'Start date – End date';
  return <Popover open={open} onOpenChange={(next) => { if (next) setDraft({ start: dateOnly(start), end: dateOnly(end) }); setOpen(next); }}>
    <PopoverTrigger asChild><button type="button" className={`fa-date${iconOnly ? ' fa-date-icon' : ''}${triggerText ? ' fa-date-heading' : ''}`} disabled={disabled} aria-label={iconOnly ? `${label}: ${rangeLabel}` : label} title={iconOnly || triggerText ? rangeLabel : undefined} data-filter-active={triggerText && Boolean(start || end) ? 'true' : undefined}><CalendarDays size={15} aria-hidden="true" />{!iconOnly && <span>{triggerText || rangeLabel}</span>}</button></PopoverTrigger>
    <PopoverContent className="fa-popover" align="start" data-preserve-colors="true">
      <strong>{label}</strong>
      <Calendar mode="range" defaultMonth={parsed(start)} selected={{ from: parsed(draft.start), to: parsed(draft.end) }} onSelect={(range) => setDraft({ start: range?.from ? localDate(range.from) : '', end: range?.to ? localDate(range.to) : '' })} />
      <div className="fa-range-inputs"><label>Start date<input aria-label="Range start date" type="date" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} /></label><label>End date<input aria-label="Range end date" type="date" min={draft.start} value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} /></label></div>
      {invalid && <p role="alert">End date cannot be before start date.</p>}
      <div className="fa-dialog-footer"><button type="button" onClick={() => setDraft({ start: '', end: '' })}>Clear</button><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="button" className="fa-primary" disabled={invalid} onClick={() => { onApply(draft.start, draft.end); setOpen(false); }}>Apply</button></div>
    </PopoverContent>
  </Popover>;
}

export function ActivityStatus({ value, onChange, disabled, label }) {
  return <select className={`fa-status fa-status-${value}`} aria-label={label || 'Status'} value={value || 'not_started'} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{Object.entries(activityStatuses).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select>;
}

export function ActivityCompletion({ value, onChange, disabled, label }) {
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState(value || 0);
  const options = [...new Set([0, 25, 50, 75, 100, Number(value || 0)])].sort((a, b) => a - b);
  return <div className="fa-completion"><select aria-label={label || 'Completion'} value={Number(value || 0)} disabled={disabled} onChange={(event) => { if (event.target.value === 'custom') { setDraft(value || 0); setCustom(true); } else onChange(Number(event.target.value)); }}>{options.map((percent) => <option key={percent} value={percent}>{percent}%</option>)}<option value="custom">Custom…</option></select>
    {custom && <div className="fa-custom"><input aria-label="Custom completion" type="number" min="0" max="100" step="1" value={draft} onChange={(event) => setDraft(event.target.value)} /><button type="button" disabled={draft === '' || !Number.isInteger(Number(draft)) || Number(draft) < 0 || Number(draft) > 100} onClick={() => { onChange(Number(draft)); setCustom(false); }}>Save</button><button type="button" onClick={() => setCustom(false)}>Cancel</button></div>}
  </div>;
}

export function ActivityChoice({ value, onChange, disabled, label = 'Activity', required = false }) {
  return <select aria-label={label} value={value || ''} required={required} disabled={disabled} title={activities.find((item) => item.id === value)?.name} onChange={(event) => onChange(event.target.value)}><option value="">Select activity</option>{activities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>;
}

export function ActivityEditor({ task, busy, error, onSave, onClose, canEdit }) {
  const activity = activityForTask(task);
  const [form, setForm] = useState({ title: task.title || '', activity_id: task.activity_id || activity?.id || '', timing: task.timing ?? activity?.timing ?? '', start_date: dateOnly(task.start_date), due_date: dateOnly(task.due_date), status: task.status || 'not_started', progress_percent: Number(task.progress_percent || 0), notes: task.notes || '' });
  const [validation, setValidation] = useState('');
  const update = (patch) => { setValidation(''); setForm((previous) => ({ ...previous, ...synchronizeActivity(previous, patch) })); };
  const changeActivity = (id) => {
    const previous = activities.find((item) => item.id === form.activity_id);
    const next = activities.find((item) => item.id === id);
    update({ activity_id: id, ...(!form.timing || form.timing === previous?.timing ? { timing: next?.timing || '' } : {}) });
  };
  const submit = (event) => {
    event.preventDefault();
    try {
      if (!form.title.trim() || !form.activity_id) throw new Error('Enter a task name and select an activity.');
      const fields = synchronizeActivity(task, { ...form, title: form.title.trim() });
      onSave(fields);
    } catch (failure) { setValidation(failure.message); }
  };
  const selectedActivity = activities.find((item) => item.id === form.activity_id);
  return <Dialog open onOpenChange={(open) => !open && !busy && onClose()}><DialogContent className="fa-editor" data-preserve-colors="true">
    <DialogHeader><DialogTitle>{task.id ? 'Edit Task' : 'Add New Task'}</DialogTitle><DialogDescription>Plan the activity and record progress.</DialogDescription></DialogHeader>
    <form onSubmit={submit}><fieldset disabled={busy || !canEdit} className="fa-form-grid">
      <label className="fa-full">Task <span>*</span><input autoFocus required maxLength={200} value={form.title} onChange={(event) => update({ title: event.target.value })} placeholder="Task name" /></label>
      <label>Activity <span>*</span><ActivityChoice value={form.activity_id} onChange={changeActivity} required /></label>
      <label className="fa-full">Timing<textarea rows={2} maxLength={2000} value={form.timing} onChange={(event) => update({ timing: event.target.value })} /></label>
      <div className="fa-full"><span className="fa-field-label">Scheduled dates</span><ActivityDateRange start={form.start_date} end={form.due_date} onApply={(start, end) => update({ start_date: start, due_date: end })} /></div>
      <label>Status<ActivityStatus value={form.status} onChange={(status) => update({ status })} /></label>
      <label>Completion (%)<input type="number" min="0" max="100" step="1" value={form.progress_percent} onChange={(event) => { const progress = event.target.value; if (progress === '') setForm({ ...form, progress_percent: '' }); else if (Number(progress) >= 0 && Number(progress) <= 100) update({ progress_percent: Number(progress) }); }} /></label>
      <label className="fa-full">Note<textarea rows={3} maxLength={2000} value={form.notes} onChange={(event) => update({ notes: event.target.value })} placeholder="Enter a note or field observation…" /></label>
    </fieldset>
    {selectedActivity?.readiness && <details className="fa-readiness"><summary>Physical signs to look for</summary><p>{selectedActivity.readiness}</p><small>Source: Mango Post-Harvest Management Review</small></details>}
    {(validation || error) && <p className="fa-error" role="alert">{validation || error}</p>}
    <div className="fa-dialog-footer"><button type="button" disabled={busy} onClick={onClose}>Cancel</button>{canEdit && <button type="submit" className="fa-primary" disabled={busy || !form.title.trim() || !form.activity_id || form.progress_percent === ''}>{busy ? 'Saving…' : task.id ? 'Save Changes' : 'Create Task'}</button>}</div>
    </form>
  </DialogContent></Dialog>;
}
