import AdminActionButton from '@/components/admin/AdminActionButton';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBrowserLayoutEffect } from '@/lib/use-browser-layout-effect';
import { BarChart3, Check, ChevronLeft, ChevronRight, ClipboardList, Clock3, Filter, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { PROGRAMME_CODE } from '@/data/dailyRoutineProgramme';
import { activities, activityForTask, activityStatuses, compareActivitySequence, filterActivities, intersectsRange, localDate, overdueActivity, synchronizeActivity } from '@/lib/farm-activities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import PageSkeleton from '@/components/shared/PageSkeleton';
import { ActivityCompletion, ActivityDateRange, ActivityEditor, ActivityStatus } from './FarmActivityControls';
import './farm-activities.css';

const defaultFilters = { tab: 'all', search: '', activity: '', status: '', start: '', end: '', completion: '' };

function ColumnFilter({ title, label, value, options, onChange, onSort }) {
  return <Popover><PopoverTrigger asChild><button type="button" className="fa-column-filter" aria-label={label} data-filter-active={value !== '' ? 'true' : undefined}>{title}<Filter size={12} aria-hidden="true" /></button></PopoverTrigger><PopoverContent className="fa-column-popover" align="start" data-preserve-colors="true"><label>{label}<select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>{onSort && <button type="button" onClick={onSort}>Toggle sort order</button>}<button type="button" onClick={() => onChange('')}>Clear filter</button></PopoverContent></Popover>;
}

function ActivityMonth({ tasks, openTask }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
  return <section className="fa-calendar" aria-label="Activities calendar"><div className="fa-calendar-head"><h2>{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2><div><button aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft /></button><button onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button><button aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight /></button></div></div>
    <div className="fa-month-grid">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <strong key={day}>{day}</strong>)}{days.map((day) => { const stamp = localDate(day); return <div key={stamp} className={`fa-day ${day.getMonth() !== month.getMonth() ? 'fa-outside' : ''} ${stamp === localDate() ? 'fa-today' : ''}`}><time dateTime={stamp}>{day.getDate()}</time>{tasks.filter((task) => intersectsRange(task, stamp, stamp)).map((task) => <button key={task.id} className={`fa-event fa-status-${task.status}`} title={task.title} onClick={() => openTask(task)}>{task.title}</button>)}</div>; })}</div>
    {tasks.some((task) => !task.start_date && !task.due_date) && <p className="fa-calendar-unscheduled">{tasks.filter((task) => !task.start_date && !task.due_date).length} unscheduled tasks appear in All Activities.</p>}
  </section>;
}

export default function FarmActivitiesPage() {
  const pageRef = useRef(null);
  const { user } = useAuth();
  const [records, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ field: 'sequence', direction: 1 });
  const [editor, setEditor] = useState(null);
  const [editorError, setEditorError] = useState('');
  const [busy, setBusy] = useState('');
  const busyRef = useRef(false);
  const [feedback, setFeedback] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const canEdit = ['super_admin', 'admin', 'farm_manager'].includes(user?.role);
  const tasks = useMemo(() => records.filter((task) => filters.tab === 'previous' ? Boolean(task.archived_at) : !task.archived_at), [records, filters.tab]);

  const load = useCallback(async () => {
    try {
      const records = await base44.entities.FarmProject.listAll('project_code', { programme_code: PROGRAMME_CODE });
      setTasks(records.filter((task) => task.programme_code === PROGRAMME_CODE));
      setLoadError('');
    } catch (error) { setLoadError(error.message || 'Activities could not be loaded.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useBrowserLayoutEffect(() => {
    const page = pageRef.current;
    const root = page?.closest('.admin-scroll-content');
    const summary = page?.querySelector('.fa-summary-row');
    const navigation = root?.querySelector('.farm-activities-sticky-nav');
    if (!root || !summary || !navigation) return undefined;
    const measure = () => {
      const top = page.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
      page.style.setProperty('--fa-summary-top', `${top}px`);
      const boardBorder = parseFloat(getComputedStyle(page.querySelector('.fa-board')).borderTopWidth) || 0;
      page.style.setProperty('--fa-columns-top', `${top + summary.getBoundingClientRect().height + 14 + boardBorder}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(navigation);
    observer.observe(summary);
    window.addEventListener('resize', measure);
    measure();
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [loading]);
  useEffect(() => { let timer; const unsubscribe = subscribeToDataChanges(() => { clearTimeout(timer); timer = setTimeout(load, 200); }, ['FarmProject', 'FarmTask']); return () => { clearTimeout(timer); unsubscribe(); }; }, [load]);


  const filtered = useMemo(() => filterActivities(tasks, filters, user).sort((left, right) => {
    if (sort.field === 'sequence') return compareActivitySequence(left, right) * sort.direction;
    const a = left[sort.field] ?? ''; const b = right[sort.field] ?? '';
    return (typeof a === 'number' ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true })) * sort.direction;
  }), [tasks, filters, user, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const summary = useMemo(() => ({ total: tasks.length, active: tasks.filter((task) => task.status === 'in_progress').length, completed: tasks.filter((task) => task.status === 'completed').length, progress: Math.round(tasks.reduce((sum, task) => sum + Number(task.progress_percent || 0), 0) / (tasks.length || 1)) }), [tasks]);
  const filter = (patch) => { setFilters((previous) => ({ ...previous, ...patch })); setPage(1); };
  const openEditor = (task = {}) => { if (busyRef.current) return; setEditorError(''); setEditor(task); };
  const replaceTask = (record) => setTasks((previous) => previous.some((task) => task.id === record.id) ? previous.map((task) => task.id === record.id ? record : task) : [...previous, record]);

  const save = async (task, patch, fromEditor = false) => {
    if (busyRef.current || !canEdit) return false;
    busyRef.current = true; setBusy(task.id || 'new'); setFeedback(null); setEditorError('');
    try {
      const synchronized = synchronizeActivity(task, patch);
      const fields = Object.fromEntries(Object.entries(synchronized).filter(([key, value]) => task[key] !== value));
      const audit = { updated_by: user.id, updated_by_name: user.full_name || user.fullName || user.email, updated_from: 'Main Activities' };
      let record;
      if (task.id) record = await base44.entities.FarmProject.update(task.id, { ...fields, ...audit });
      else {
        const code = `MS-${crypto.randomUUID().slice(0, 8)}`;
        record = await base44.entities.FarmProject.create({ ...fields, ...audit, programme_code: PROGRAMME_CODE, project_code: code, milestone_code: code, project_type: 'master_schedule_task', source: 'Main Activities', is_enabled: true, priority: 'Medium' });
      }
      replaceTask(record);
      setFeedback({ message: task.id ? 'Task updated successfully.' : 'Task created successfully.' });
      if (fromEditor) setEditor(null);
      return true;
    } catch (error) {
      setFeedback({ error: true, message: error.message || 'Changes could not be saved. Please try again.' });
      if (fromEditor) setEditorError(error.message);
      return false;
    } finally { busyRef.current = false; setBusy(''); }
  };

  const deleteTask = async () => {
    if (!deleteTarget || busyRef.current || !canEdit) return;
    busyRef.current = true; setBusy('delete');
    try {
      await base44.entities.FarmProject.delete(deleteTarget.id);
      setTasks((previous) => previous.filter((task) => task.id !== deleteTarget.id));
      setDeleteTarget(null); setFeedback({ message: 'Task deleted successfully.' });
    } catch (error) { setFeedback({ error: true, message: error.message }); }
    finally { busyRef.current = false; setBusy(''); }
  };
  const sortBy = (field) => { setSort((previous) => ({ field, direction: previous.field === field ? -previous.direction : 1 })); setPage(1); };
  const activityFilter = <ColumnFilter title="ACTION & TIMING" label="Filter activity" value={filters.activity} onChange={(activity) => filter({ activity })} options={[[ '', 'All Activities' ], ...activities.map((item) => [item.id, item.name])]} />;
  const statusFilter = <ColumnFilter title="Status" label="Filter status" value={filters.status} onChange={(status) => filter({ status })} options={[[ '', 'All Statuses' ], ...Object.entries(activityStatuses), ['overdue', 'Overdue']]} onSort={() => sortBy('status')} />;
  const completionFilter = <ColumnFilter title="Complete" label="Filter completion" value={filters.completion} onChange={(completion) => filter({ completion })} options={[[ '', 'All completion levels' ], ['partial', '1–99% (partially complete)'], ...[...new Set([0, 25, 50, 75, 100, ...tasks.map((task) => Number(task.progress_percent || 0))])].sort((a, b) => a - b).map((value) => [String(value), `${value}%`])]} onSort={() => sortBy('progress_percent')} />;
  const dateFilter = <ActivityDateRange start={filters.start} end={filters.end} triggerText="Date" label="Filter date range" onApply={(start, end) => filter({ start, end })} />;
  const actions = (task) => <div className="fa-actions"><AdminActionButton action="edit" title="Edit task" aria-label={`Edit ${task.title}`} onClick={() => openEditor(task)} />{canEdit && <AdminActionButton action="delete" title="Delete task" aria-label={`Delete ${task.title}`} disabled={Boolean(busy)} onClick={() => { setFeedback(null); setDeleteTarget(task); }} />}</div>;
  if (loading) return <PageSkeleton variant="schedule" />;

  return <div ref={pageRef} className="farm-activities-page" data-preserve-colors="true">
    <div className="fa-summary-row"><div className="fa-kpis">{[[ClipboardList, 'Total Activity', summary.total, 'green'], [Clock3, 'In Progress', summary.active, 'amber'], [Check, 'Completed', summary.completed, 'success'], [BarChart3, 'Total Cmplete', `${summary.progress}%`, 'blue']].map(([Icon, label, value, tone]) => <section className={`fa-kpi fa-${tone}`} key={label}><span className="fa-kpi-icon"><Icon /></span><div><p>{label}</p><div className="fa-kpi-value"><strong>{value}</strong>{tone === 'blue' && <progress max="100" value={summary.progress} aria-label="Total Cmplete" />}</div></div></section>)}</div>{canEdit && <button className="fa-primary fa-add" onClick={() => openEditor()}><Plus />Add Activity</button>}</div>
    {loadError && <div className="fa-error" role="alert">{loadError} <button onClick={load}>Retry</button></div>}
    {feedback && <p className={feedback.error ? 'fa-error' : 'fa-feedback'} role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p>}
    <section className="fa-board" aria-label="Farm activity tasks"><div className="fa-toolbar">
      <div className="fa-mobile-filters">{activityFilter}{dateFilter}{statusFilter}{completionFilter}</div>
    </div>
    {filters.tab === 'calendar' ? <ActivityMonth tasks={filtered} openTask={openEditor} /> : <>
    <div className="fa-table-scroll"><table className="fa-table fa-workbook-table">
      <colgroup>{['28%', 'auto', '80px', '140px', '110px', '12%', '90px'].map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
      <thead><tr><th>{activityFilter}</th><th>PHYSICAL SIGNS TO LOOK FOR</th><th>{dateFilter}</th><th>{statusFilter}</th><th>{completionFilter}</th><th>Note</th><th>Actions</th></tr></thead>
      <tbody>{visible.map((task, index) => {
        const activity = activityForTask(task);
        const timing = task.timing ?? activity?.timing;
        const readiness = task.success_criteria ?? activity?.readiness ?? '';
        const number = task.activity_sequence || (currentPage - 1) * 10 + index + 1;
        return <tr key={task.id} aria-busy={busy === task.id}>
          <td className="fa-action-timing"><button className="fa-workbook-action" onClick={() => openEditor(task)}>{number}. {task.title}</button><p>Timing: {timing || 'Not specified'}</p>{task.is_enabled === false && <small>Tracking off</small>}</td>
          <td className="fa-physical-signs">{readiness}</td>
          <td><ActivityDateRange iconOnly label={`Dates for ${task.title}`} start={task.start_date} end={task.due_date} disabled={!canEdit || Boolean(busy)} onApply={(start, end) => save(task, { start_date: start, due_date: end })} /></td>
          <td><ActivityStatus label={`Status for ${task.title}`} value={task.status} onChange={(status) => save(task, { status })} disabled={!canEdit || Boolean(busy)} />{overdueActivity(task) && <span className="fa-overdue">Overdue</span>}</td>
          <td><ActivityCompletion label={`Completion for ${task.title}`} value={task.progress_percent} onChange={(progress_percent) => save(task, { progress_percent })} disabled={!canEdit || Boolean(busy)} /></td>
          <td><button className="fa-note" aria-label={`Note for ${task.title}`} onClick={() => openEditor(task)}>{task.notes || 'Add note…'}</button></td>
          <td>{actions(task)}</td>
        </tr>;
      })}</tbody>
    </table></div>
    <div className="fa-mobile-cards">{visible.map((task, index) => {
      const activity = activityForTask(task);
      const number = task.activity_sequence || (currentPage - 1) * 10 + index + 1;
      return <article key={task.id}>
        <h3 className="fa-mobile-workbook-heading">ACTION &amp; TIMING</h3>
        <div className="fa-action-timing"><button className="fa-workbook-action" onClick={() => openEditor(task)}>{number}. {task.title}</button><p>Timing: {task.timing ?? activity?.timing ?? 'Not specified'}</p></div>
        <h3 className="fa-mobile-workbook-heading">PHYSICAL SIGNS TO LOOK FOR</h3>
        <div className="fa-physical-signs">{task.success_criteria ?? activity?.readiness ?? ''}</div>
        <div><span className="fa-mobile-field-label">Date</span><ActivityDateRange label={`Dates for ${task.title}`} start={task.start_date} end={task.due_date} disabled={!canEdit || Boolean(busy)} onApply={(start, end) => save(task, { start_date: start, due_date: end })} /></div>
        <div className="fa-mobile-status"><div><span className="fa-mobile-field-label">Status</span><ActivityStatus label={`Status for ${task.title}`} value={task.status} disabled={!canEdit || Boolean(busy)} onChange={(status) => save(task, { status })} /></div><div><span className="fa-mobile-field-label">Complete</span><ActivityCompletion label={`Completion for ${task.title}`} value={task.progress_percent} disabled={!canEdit || Boolean(busy)} onChange={(progress_percent) => save(task, { progress_percent })} /></div>{overdueActivity(task) && <span className="fa-overdue">Overdue</span>}</div>
        <div><span className="fa-mobile-field-label">Note</span><button className="fa-note" aria-label={`Note for ${task.title}`} onClick={() => openEditor(task)}>{task.notes || 'Add note…'}</button></div>
        <div className="fa-mobile-actions"><span className="fa-mobile-field-label">Actions</span>{actions(task)}</div>
      </article>;
    })}</div>
    {!filtered.length && <div className="fa-empty"><ClipboardList /><h2>No activities found</h2><p>{tasks.length ? 'Try another search or clear your filters.' : 'Add your first farm activity to get started.'}</p>{tasks.length > 0 && <button onClick={() => filter(defaultFilters)}>Clear filters</button>}</div>}
    </>}
    </section>
    {filters.tab !== 'calendar' && <footer className="fa-pagination"><span>Showing {filtered.length ? (currentPage - 1) * 10 + 1 : 0}–{Math.min(currentPage * 10, filtered.length)} of {filtered.length} tasks</span><nav aria-label="Task pagination"><button disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); }}><ChevronLeft />Previous</button>{Array.from({ length: pages }, (_, index) => index + 1).filter((number) => number === 1 || number === pages || Math.abs(number - currentPage) < 2).map((number) => <button key={number} aria-current={number === currentPage ? 'page' : undefined} onClick={() => { setPage(number); }}>{number}</button>)}<button disabled={currentPage === pages} onClick={() => { setPage(currentPage + 1); }}>Next<ChevronRight /></button></nav></footer>}
    {editor && <ActivityEditor key={editor.id || 'new'} task={editor} canEdit={canEdit} error={editorError} busy={Boolean(busy)} onClose={() => setEditor(null)} onSave={(patch) => save(editor, patch, true)} />}
    <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && !busy && setDeleteTarget(null)}><DialogContent className="fa-editor fa-confirm" data-preserve-colors="true"><DialogHeader><DialogTitle>Delete Task?</DialogTitle><DialogDescription>You are about to delete “{deleteTarget?.title}”. This action cannot be undone.</DialogDescription></DialogHeader>{feedback?.error && <p role="alert" className="fa-error">{feedback.message}</p>}<div className="fa-dialog-footer"><button disabled={Boolean(busy)} onClick={() => setDeleteTarget(null)}>Cancel</button><AdminActionButton action="delete" disabled={Boolean(busy)} onClick={deleteTask} label={busy === 'delete' ? 'Deleting…' : 'Delete Task'} /></div></DialogContent></Dialog>
  </div>;
}
