import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ClipboardList, Loader2, Plus, Power, SquareCheckBig, Target } from 'lucide-react';
import MasterScheduleTask from '@/pages/admin/MasterScheduleTask';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import '@/pages/admin/DailyRoutineCheck.css';

export const MASTER_SCHEDULE_STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
  deferred: 'Deferred',
};

export const normalizeMasterScheduleStatus = (value) => {
  const next = String(value || 'not_started').trim().toLowerCase().replaceAll(' ', '_');
  return MASTER_SCHEDULE_STATUS_LABELS[next] ? next : 'not_started';
};

export const masterScheduleDueAt = (item) => item.completion_due_at || item.due_date;

export const isMasterScheduleOverdue = (item) => {
  const dueAt = masterScheduleDueAt(item);
  return Boolean(dueAt) && new Date(dueAt) < new Date() && !['completed', 'deferred'].includes(normalizeMasterScheduleStatus(item.status));
};

export const summarizeMasterScheduleProjects = (projects, subtasks) => projects.map((project) => {
  const children = subtasks.filter((item) => item.parent_project_id === project.id);
  if (!children.length) return { ...project, subtask_count: 0, completed_subtask_count: 0, overdue: isMasterScheduleOverdue(project) };
  const completed = children.filter((item) => normalizeMasterScheduleStatus(item.status) === 'completed').length;
  const progress = Math.round(children.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / children.length);
  const status = completed === children.length
    ? 'completed'
    : children.some((item) => normalizeMasterScheduleStatus(item.status) === 'blocked')
      ? 'blocked'
      : children.some((item) => normalizeMasterScheduleStatus(item.status) === 'in_progress')
        ? 'in_progress'
        : 'not_started';
  return {
    ...project,
    status,
    progress_percent: progress,
    rag: status === 'completed' ? 'GREEN' : status === 'blocked' ? 'RED' : 'AMBER',
    subtask_count: children.length,
    completed_subtask_count: completed,
    overdue: isMasterScheduleOverdue(project) || children.some(isMasterScheduleOverdue),
  };
});

const displayDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const SchedulePageHead = ({ right }) => <div className="drc-page-head drc-page-actions">{right}</div>;
const SchedulePill = ({ value }) => <span className={`drc-pill ${value || ''}`}>{MASTER_SCHEDULE_STATUS_LABELS[value] || value || '—'}</span>;

const MasterTaskField = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-slate-700">{label}</Label>
    {children}
  </div>
);

const MasterTaskSection = ({ icon: Icon, title, children }) => (
  <section className="rounded-xl border border-slate-200/90 bg-white p-3">
    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#316f2b]"><Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />{title}</h3>
    {children}
  </section>
);

const NewMasterTaskDialog = ({ busy, form, onChange, onOpenChange, onSubmit, open }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="z-[70] max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none gap-0 overflow-y-auto rounded-xl border border-slate-200 bg-[#fdfdfc] p-0 shadow-[0_24px_80px_rgba(0,0,0,0.38)] sm:max-w-[1080px] [&>button]:right-3 [&>button]:top-3 [&>button]:grid [&>button]:h-8 [&>button]:w-8 [&>button]:place-items-center [&>button]:rounded-md [&>button]:bg-slate-100 [&>button]:text-slate-600 [&>button]:opacity-100 [&>button:hover]:bg-slate-200 [&>button_svg]:h-[18px] [&>button_svg]:w-[18px]">
      <DialogHeader className="flex-row items-center gap-3 space-y-0 px-4 pb-3 pt-4 text-left sm:px-5 sm:pb-4 sm:pt-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#edf6ec] text-[#397b32]">
          <SquareCheckBig className="h-[22px] w-[22px]" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 pr-10">
          <DialogTitle className="text-xl font-semibold leading-6 text-slate-900">Create task</DialogTitle>
          <DialogDescription className="mt-1 text-[13px] leading-4 text-slate-500">Add or update a task with clear ownership, timing, and completion criteria.</DialogDescription>
        </div>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
        <MasterTaskSection icon={ClipboardList} title="Task details">
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-6">
            <MasterTaskField label="Task name">
              <Input className="h-9 border-slate-200 bg-white text-sm shadow-sm" value={form.title} onChange={(event) => onChange('title', event.target.value)} required maxLength="200" placeholder="e.g. Pre-flowering canopy assessment" autoFocus />
            </MasterTaskField>
            <MasterTaskField label="Task owner">
              <Input className="h-9 border-slate-200 bg-white text-sm shadow-sm" value={form.owner_name} onChange={(event) => onChange('owner_name', event.target.value)} maxLength="160" placeholder="Enter task owner" />
            </MasterTaskField>
            <MasterTaskField label="Priority">
              <Select value={form.priority} onValueChange={(value) => onChange('priority', value)}>
                <SelectTrigger className="h-9 border-slate-200 bg-white text-sm shadow-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </MasterTaskField>
          </div>
        </MasterTaskSection>
        <MasterTaskSection icon={CalendarDays} title="Dates">
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-6">
            <MasterTaskField label="Start date">
              <Input className="h-9 border-slate-200 bg-white text-sm shadow-sm" type="date" value={form.start_date} onChange={(event) => onChange('start_date', event.target.value)} />
            </MasterTaskField>
            <MasterTaskField label="Due date">
              <Input className="h-9 border-slate-200 bg-white text-sm shadow-sm" type="date" value={form.due_date} onChange={(event) => onChange('due_date', event.target.value)} />
            </MasterTaskField>
          </div>
        </MasterTaskSection>
        <MasterTaskSection icon={Target} title="Success criteria">
          <MasterTaskField label="Success criteria">
            <Textarea className="min-h-[64px] resize-y border-slate-200 bg-white text-sm leading-5 shadow-sm" value={form.success_criteria} onChange={(event) => onChange('success_criteria', event.target.value)} maxLength="2000" rows={2} placeholder="What confirms this task is complete?" />
          </MasterTaskField>
        </MasterTaskSection>
        <DialogFooter className="pt-1 sm:space-x-3">
          <Button className="h-10 px-4 text-sm" type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="h-10 bg-[#397b26] px-5 text-sm text-white hover:bg-[#2f6720]" type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{busy ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);

export default function MasterScheduleView({
  busyKey,
  createMasterTask,
  embedded = false,
  filteredScheduleProjects,
  filteredSummary,
  newMasterTask,
  scheduleFilter,
  setNewMasterTask,
  setScheduleFilter,
  setShowNewMasterTask,
  showNewMasterTask,
  taskBasePath = '/admin/farm-daily-activities/activities/master-schedule',
  toggleProjectEnabled,
}) {
  const pageSize = 10;
  const [openTaskId, setOpenTaskId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredScheduleProjects.length / pageSize));
  const visibleScheduleProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredScheduleProjects.slice(start, start + pageSize);
  }, [currentPage, filteredScheduleProjects]);

  useEffect(() => {
    setCurrentPage(1);
  }, [scheduleFilter.end, scheduleFilter.period, scheduleFilter.search, scheduleFilter.start, scheduleFilter.status]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const taskButton = <button type="button" className="drc-primary gold" onClick={() => setShowNewMasterTask(true)}><Plus /> New master task</button>;
  const filterBar = <div className="drc-schedule-filter"><input value={scheduleFilter.search} onChange={(event) => setScheduleFilter((current) => ({ ...current, search: event.target.value }))} placeholder="Search task, owner, or ID" /><select value={scheduleFilter.period} onChange={(event) => setScheduleFilter((current) => ({ ...current, period: event.target.value }))}><option value="all">All dates</option><option value="daily">Today and next day</option><option value="weekly">Next 7 days</option><option value="monthly">Next month</option><option value="yearly">Next year</option><option value="custom">Custom interval</option></select><select value={scheduleFilter.status} onChange={(event) => setScheduleFilter((current) => ({ ...current, status: event.target.value }))}><option value="all">All statuses</option>{Object.entries(MASTER_SCHEDULE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{scheduleFilter.period === 'custom' && <><input type="date" value={scheduleFilter.start} onChange={(event) => setScheduleFilter((current) => ({ ...current, start: event.target.value }))} /><input type="date" value={scheduleFilter.end} onChange={(event) => setScheduleFilter((current) => ({ ...current, end: event.target.value }))} /></>}{!embedded && <button type="button" className="drc-btn" onClick={() => setScheduleFilter({ period: 'all', status: 'all', search: '', start: '', end: '' })}>Reset</button>}</div>;
  const analysisBar = <div className="drc-schedule-analysis"><div className="drc-metric-total"><span>Total tasks</span><strong>{filteredSummary.total}</strong></div><div className="drc-metric-progress"><span>In progress</span><strong>{filteredSummary.active}</strong></div><div className="drc-metric-completed"><span>Completed</span><strong>{filteredSummary.completed}</strong></div><div className="drc-metric-overdue"><span>Overdue</span><strong>{filteredSummary.overdue}</strong></div><div className="drc-metric-average"><span>Average progress</span><strong>{filteredSummary.progress}%</strong></div></div>;
  const submitMasterTask = async (event) => {
    const created = await createMasterTask(event);
    if (embedded && created?.id) setOpenTaskId(created.id);
  };
  const updateNewMasterTask = (key, value) => setNewMasterTask((current) => ({ ...current, [key]: value }));

  return (
    <section className={`drc-view active ${embedded ? 'drc-embedded-view' : ''}`}>
      {embedded ? <div className="drc-schedule-sticky"><div className="drc-page-head drc-page-actions drc-schedule-toolbar">{filterBar}{taskButton}</div>{analysisBar}</div> : <SchedulePageHead right={taskButton} />}
      <NewMasterTaskDialog busy={busyKey === 'new-master-task'} form={newMasterTask} onChange={updateNewMasterTask} onOpenChange={setShowNewMasterTask} onSubmit={submitMasterTask} open={showNewMasterTask} />
      {!embedded ? filterBar : null}
      {!embedded ? analysisBar : null}
      <div className="drc-table-shell">
        <table className="drc-table">
          <thead><tr><th>ID</th><th>Task</th><th>Window</th><th>Owner</th><th>Success criteria</th><th>Tracking</th><th>Status</th><th>Complete</th><th></th></tr></thead>
          <tbody>{visibleScheduleProjects.map((milestone) => (
            <tr key={milestone.id} className={milestone.is_enabled === false ? 'drc-task-disabled' : ''}>
              <td>{milestone.milestone_code || milestone.project_code}</td>
              <td className="drc-task-name">{embedded ? <button type="button" className="drc-task-link" onClick={() => setOpenTaskId(milestone.id)}><b>{milestone.title}</b></button> : <Link to={`${taskBasePath}/${encodeURIComponent(milestone.id)}`}><b>{milestone.title}</b></Link>}</td>
              <td>{displayDate(milestone.start_date)}<br />to {displayDate(milestone.due_date)}</td>
              <td>{milestone.owner_name || 'Not assigned'}</td>
              <td>{milestone.success_criteria || 'Not recorded'}{milestone.subtask_count ? <small className="block text-muted-foreground">{milestone.completed_subtask_count}/{milestone.subtask_count} subtasks complete</small> : null}</td>
              <td><button type="button" className={`drc-task-toggle ${milestone.is_enabled === false ? '' : 'on'}`} onClick={() => toggleProjectEnabled(milestone)} disabled={busyKey === milestone.id} aria-pressed={milestone.is_enabled !== false} title={milestone.is_enabled === false ? 'Turn task on' : 'Turn task off'}><Power /> {milestone.is_enabled === false ? 'Off' : 'On'}</button></td>
              <td><SchedulePill value={normalizeMasterScheduleStatus(milestone.status)} /></td>
              <td>{Number(milestone.progress_percent || 0)}%</td>
              <td>{embedded ? <button type="button" className="drc-btn" onClick={() => setOpenTaskId(milestone.id)}>Open task</button> : <Link className="drc-btn" to={`${taskBasePath}/${encodeURIComponent(milestone.id)}`}>Open task</Link>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="drc-schedule-pagination" aria-label="Master Schedule pagination">
        <span>Showing {filteredScheduleProjects.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredScheduleProjects.length)} of {filteredScheduleProjects.length}</span>
        <div><button type="button" className="drc-btn" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>Previous</button><strong>Page {currentPage} of {totalPages}</strong><button type="button" className="drc-btn" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>Next</button></div>
      </div>
      {embedded && openTaskId ? <MasterScheduleTask key={openTaskId} modal taskId={openTaskId} onClose={() => setOpenTaskId('')} /> : null}
    </section>
  );
}
