import AdminActionButton from '@/components/admin/AdminActionButton';
import BrandLogo from '@/components/shared/BrandLogo';
import { useId, useState } from 'react';
import { BarChart3, CalendarDays, ClipboardList, Clock3, FileText, Flag, House, ListTodo, MessageCircle, Plus, Save, Timer, UsersRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import './master-task-editor.css';

const statuses = { not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', blocked: 'Blocked', deferred: 'Deferred' };
const date = (value) => value ? String(value).slice(0, 10) : '';
const stamp = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not recorded';
const dateLabel = (value) => value ? new Date(value).toLocaleDateString('en-GB') : '—';
function SectionHeading({ icon: Icon, title, description }) {
  return <div className="mte-section-heading"><span className="mte-icon"><Icon size={23} strokeWidth={2} /></span><div><h2>{title}</h2><p>{description}</p></div></div>;
}
function Field({ label, required, children }) {
  return <label className="mte-field"><span>{label}{required && <b className="mte-required"> *</b>}</span>{children}</label>;
}
function Choice({ name, value, onChange, choices, icon: Icon, required }) {
  return <div className="mte-input-icon">{Icon && <Icon size={17} />}<select name={name} value={value} onChange={onChange} required={required}><option value="">Select…</option>{[...new Set([...choices, value].filter(Boolean))].map((item) => <option key={item}>{item}</option>)}</select></div>;
}

export default function MasterTaskEditor({ task, form, setForm, saving, onSave, onClose, subtasks, currentTime, durationLabel, trackedSeconds, onArchive, onSaveSubtask }) {
  const formId = useId();
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [subtaskError, setSubtaskError] = useState('');
  const update = (event) => {
    setSaveFeedback(null);
    const { name, type, checked, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaveFeedback(null);
    const result = await onSave(event);
    setSaveFeedback(result?.success
      ? { success: true, message: 'Changes saved successfully.' }
      : { success: false, message: result?.error || 'Could not save changes. Please try again.' });
  };
  const completed = subtasks.filter((item) => item.status === 'completed').length;
  const creator = task.created_by_name || task.created_by || 'Not recorded';
  const updater = task.updated_by_name || task.updated_by || creator;
  const openSubtask = (record = null) => {
    setEditing(record);
    setSubtaskError('');
    setDraft({ title: record?.title || '', field_area: record?.field_area || form.field_area, assigned_to_name: record?.assigned_to_name || form.owner_name, priority: record?.priority || 'medium', planned_start_at: date(record?.planned_start_at || record?.planned_start || form.start_date), completion_due_at: date(record?.completion_due_at || record?.due_date || form.due_date), status: record?.status || 'not_started' });
  };
  return <>
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="master-task-editor" aria-describedby={undefined} data-preserve-colors="true" onInteractOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => saving && event.preventDefault()}>
        <header className="mte-header">
          <div className="mte-brand"><BrandLogo className="h-[72px] w-full" /></div>
          <DialogHeader><DialogTitle>{form.title || 'Untitled task'}</DialogTitle></DialogHeader>
          <div className="mte-mango" aria-hidden="true"><img src="/brand/master-task-reference.png" alt="" /></div>
        </header>
        <form id={formId} className="mte-body" onSubmit={submit} onInvalid={() => setSaveFeedback({ success: false, message: 'Please correct the highlighted field before saving.' })}>
          <section className="mte-section mte-details">
            <SectionHeading icon={FileText} title="Task Details" description="Basic information about this master task." />
            <div className="mte-details-fields">
              <Field label="Task name" required><input name="title" required maxLength={200} value={form.title} onChange={update} /></Field>
              <Field label="Field / Department / Area"><Choice name="field_area" value={form.field_area} onChange={update} choices={['Farm A', 'Farm B', 'Farm A & B', ...[1, 2, 3, 4, 5].map((number) => `Farm A${number}`), ...[1, 2, 3, 4, 5].map((number) => `Farm B${number}`)]} icon={House} /></Field>
              <Field label="Workflow / Category"><Choice name="workflow_category" value={form.workflow_category} onChange={update} choices={['Production & Export', 'Farm Operations', 'Harvest', 'Maintenance', 'Quality Assurance', 'Administration']} icon={ClipboardList} /></Field>
            </div>
          </section>
          <section className="mte-section mte-assignment">
            <SectionHeading icon={UsersRound} title="Assignment & Classification" description="Assign responsibility and set priority." />
            <Field label="Assigned to"><div className="mte-input-icon"><UsersRound size={17} /><input name="owner_name" value={form.owner_name} onChange={update} maxLength={160} placeholder="Assign a person or team" /></div></Field>
            <Field label="Priority" required><div className="mte-input-icon"><Flag size={17} /><select name="priority" value={form.priority} onChange={update}>{[...new Set([form.priority, 'Critical', 'High', 'Medium', 'Low'])].map((value) => <option key={value}>{value}</option>)}</select><i className={`mte-dot ${form.priority.toLowerCase()}`} /></div></Field>
          </section>
          <section className="mte-section mte-schedule">
            <SectionHeading icon={CalendarDays} title="Schedule & Status" description="Set the timeline and current status." />
            <Field label="Status" required><div className="mte-status"><i className={`mte-dot ${form.status}`} /><select name="status" value={form.status} onChange={update}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></Field>
            <Field label="Planned start"><input type="date" name="start_date" value={form.start_date} onChange={update} /></Field>
            <Field label="Due date"><input type="date" name="due_date" min={form.start_date || undefined} value={form.due_date} onChange={update} /></Field>
            <div className="mte-timestamp"><Clock3 /><div><small>Created on</small><span>{stamp(task.created_date || task.created_at)}</span><small>by {creator}</small></div></div>
            <div className="mte-timestamp"><Clock3 /><div><small>Last updated</small><span>{stamp(task.updated_date || task.updated_at)}</span><small>by {updater}</small></div></div>
          </section>
          <section className="mte-section mte-progress">
            <SectionHeading icon={BarChart3} title="Progress Summary" description="Quick overview of task execution." />
            <div className="mte-metrics"><div className="mte-progress-number"><div><strong>{form.progress_percent}%</strong><progress value={form.progress_percent} max="100" /></div><span>Overall progress</span></div><div className="mte-stat"><CalendarDays /><div><strong>{completed} / {subtasks.length}</strong><span>Subtasks complete</span></div></div><div className="mte-stat"><Timer /><div><strong>{durationLabel(trackedSeconds({ time_spent_seconds: task.master_time_spent_seconds, timer_started_at: task.master_timer_started_at }, currentTime) + subtasks.reduce((sum, item) => sum + trackedSeconds(item, currentTime), 0))}</strong><span>Active time</span></div></div></div>
            <label className="mte-buyer"><input type="checkbox" name="buyer_ready_required" checked={form.buyer_ready_required} onChange={update} /><div><b>Buyer ready checklist required</b><span>Include buyer readiness checklist<br />for this task.</span></div></label>
          </section>
          <section className="mte-section mte-subtasks">
            <div className="mte-section-top"><SectionHeading icon={ListTodo} title="Subtasks" description="Add and manage subtasks for this task." /><button className="mte-button" type="button" onClick={() => openSubtask()} disabled={saving}><Plus size={16} /> Add Subtask</button></div>
            <div className="mte-table-scroll"><table><thead><tr>{['#', 'Subtask name', 'Field / Area', 'Assignee', 'Priority', 'Planned date', 'Due date', 'Created on', 'Status', 'Action'].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>
              {subtasks.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td>{item.title}</td><td><House />{item.field_area || form.field_area || '—'}</td><td><UsersRound />{item.assigned_to_name || 'Unassigned'}</td><td><i className={`mte-dot ${String(item.priority || 'medium').toLowerCase()}`} /><span className="mte-capitalize">{item.priority || 'medium'}</span></td><td>{dateLabel(item.planned_start_at || item.planned_start)}</td><td>{dateLabel(item.completion_due_at || item.due_date)}</td><td>{stamp(item.created_date || item.created_at)}</td><td><select aria-label={`Status for ${item.title}`} disabled={saving} value={item.status || 'not_started'} onChange={(event) => onSaveSubtask(item, { status: event.target.value })}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td><AdminActionButton action="edit" type="button" aria-label={`Edit ${item.title}`} onClick={() => openSubtask(item)} disabled={saving} /><AdminActionButton action="delete" type="button" aria-label={`Delete ${item.title}`} onClick={() => onArchive(item)} disabled={saving} /></td></tr>)}
              {!subtasks.length && <tr><td colSpan={10} className="mte-empty">No subtasks yet. Add the first action for this task.</td></tr>}
            </tbody></table></div>
          </section>
          <div className="mte-bottom"><section className="mte-section mte-notes"><SectionHeading icon={MessageCircle} title="Notes / Update" description="Add a note about changes, progress, or important updates." /><div className="mte-notes-input"><textarea aria-label="Notes / Update" name="notes" value={form.notes} onChange={update} maxLength={Math.max(500, form.notes.length)} placeholder="Add your notes here..." /><small>{form.notes.length}/{Math.max(500, form.notes.length)}</small></div></section>
          </div>
        </form>
        <footer className="mte-footer"><p className={`mte-save-feedback${saveFeedback && !saveFeedback.success ? ' mte-save-error' : ''}`} role={saveFeedback && !saveFeedback.success ? 'alert' : 'status'}>{saving ? 'Saving changes�' : saveFeedback?.message}</p><div><button type="button" className="mte-button" onClick={onClose} disabled={saving}>Close</button><button type="submit" form={formId} className="mte-button mte-save" disabled={saving}><Save size={18} />{saving ? 'Saving…' : 'Save Changes'}</button></div></footer>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && !saving && setDraft(null)}><DialogContent className="mte-subtask-dialog" data-preserve-colors="true"><DialogHeader><DialogTitle>{editing ? 'Edit Subtask' : 'Add Subtask'}</DialogTitle><DialogDescription>Set the action, assignment, and schedule.</DialogDescription></DialogHeader>{draft && <form onSubmit={async (event) => { event.preventDefault(); if (await onSaveSubtask(editing, { ...draft, title: draft.title.trim(), planned_start: draft.planned_start_at, due_date: draft.completion_due_at })) setDraft(null); else setSubtaskError('Could not save. Please try again.'); }}><div className="mte-subtask-fields">{[['title', 'Subtask name', 'text'], ['field_area', 'Field / Area', 'text'], ['assigned_to_name', 'Assignee', 'text'], ['planned_start_at', 'Planned date', 'date'], ['completion_due_at', 'Due date', 'date']].map(([key, label, type]) => <Field key={key} label={label} required={key === 'title'}><input type={type} value={draft[key]} required={key === 'title'} maxLength={200} min={key === 'completion_due_at' ? draft.planned_start_at : undefined} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></Field>)}<Field label="Priority"><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>{['low', 'medium', 'high', 'urgent'].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Status"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>{subtaskError && <p role="alert">{subtaskError}</p>}<div className="mte-subtask-actions"><button className="mte-button" type="button" onClick={() => setDraft(null)} disabled={saving}>Cancel</button><button className="mte-button mte-save" disabled={saving || !draft.title.trim()}>{saving ? 'Saving…' : 'Save Subtask'}</button></div></form>}</DialogContent></Dialog>
  </>;
}
