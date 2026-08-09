import { Link } from 'react-router-dom';
import { Loader2, Plus, Power } from 'lucide-react';
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

const SchedulePageHead = ({ right }) => <div className="drc-page-head"><div><span className="drc-eyebrow">Programme management</span><h1>Master Schedule</h1><p>Create seasonal work, turn tasks on or off, and review dates, ownership and acceptance criteria.</p></div>{right}</div>;
const SchedulePill = ({ value }) => <span className={`drc-pill ${value || ''}`}>{MASTER_SCHEDULE_STATUS_LABELS[value] || value || '—'}</span>;

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
  taskBasePath = '/admin/daily-routine-check/master-schedule',
  toggleProjectEnabled,
}) {
  return (
    <section className={`drc-view active ${embedded ? 'drc-embedded-view' : ''}`}>
      <SchedulePageHead right={<button type="button" className="drc-primary gold" onClick={() => setShowNewMasterTask((current) => !current)}><Plus /> New master task</button>} />
      {showNewMasterTask && <form onSubmit={createMasterTask} className="drc-master-task-form"><label><span>Task name</span><input value={newMasterTask.title} onChange={(event) => setNewMasterTask((current) => ({ ...current, title: event.target.value }))} required maxLength="200" placeholder="e.g. Pre-flowering canopy assessment" /></label><label><span>Task owner</span><input value={newMasterTask.owner_name} onChange={(event) => setNewMasterTask((current) => ({ ...current, owner_name: event.target.value }))} maxLength="160" /></label><label><span>Priority</span><select value={newMasterTask.priority} onChange={(event) => setNewMasterTask((current) => ({ ...current, priority: event.target.value }))}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label><label><span>Start date</span><input type="date" value={newMasterTask.start_date} onChange={(event) => setNewMasterTask((current) => ({ ...current, start_date: event.target.value }))} /></label><label><span>Due date</span><input type="date" value={newMasterTask.due_date} onChange={(event) => setNewMasterTask((current) => ({ ...current, due_date: event.target.value }))} /></label><label className="wide"><span>Success criteria</span><input value={newMasterTask.success_criteria} onChange={(event) => setNewMasterTask((current) => ({ ...current, success_criteria: event.target.value }))} maxLength="2000" placeholder="What confirms this task is complete?" /></label><div className="drc-master-task-actions"><button type="button" className="drc-btn" onClick={() => setShowNewMasterTask(false)}>Cancel</button><button type="submit" className="drc-primary" disabled={busyKey === 'new-master-task'}>{busyKey === 'new-master-task' ? <Loader2 className="drc-spin" /> : <Plus />} Create and open task</button></div></form>}
      <div className="drc-schedule-filter"><input value={scheduleFilter.search} onChange={(event) => setScheduleFilter((current) => ({ ...current, search: event.target.value }))} placeholder="Search task, owner, or ID" /><select value={scheduleFilter.period} onChange={(event) => setScheduleFilter((current) => ({ ...current, period: event.target.value }))}><option value="all">All dates</option><option value="daily">Today and next day</option><option value="weekly">Next 7 days</option><option value="monthly">Next month</option><option value="yearly">Next year</option><option value="custom">Custom interval</option></select><select value={scheduleFilter.status} onChange={(event) => setScheduleFilter((current) => ({ ...current, status: event.target.value }))}><option value="all">All statuses</option>{Object.entries(MASTER_SCHEDULE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{scheduleFilter.period === 'custom' && <><input type="date" value={scheduleFilter.start} onChange={(event) => setScheduleFilter((current) => ({ ...current, start: event.target.value }))} /><input type="date" value={scheduleFilter.end} onChange={(event) => setScheduleFilter((current) => ({ ...current, end: event.target.value }))} /></>}<button type="button" className="drc-btn" onClick={() => setScheduleFilter({ period: 'all', status: 'all', search: '', start: '', end: '' })}>Reset</button></div>
      <div className="drc-schedule-analysis"><div><span>Tasks</span><strong>{filteredSummary.total}</strong></div><div><span>In progress</span><strong>{filteredSummary.active}</strong></div><div><span>Completed</span><strong>{filteredSummary.completed}</strong></div><div><span>Overdue</span><strong>{filteredSummary.overdue}</strong></div><div><span>Average progress</span><strong>{filteredSummary.progress}%</strong></div></div>
      <div className="drc-table-shell">
        <table className="drc-table">
          <thead><tr><th>ID</th><th>Task</th><th>Window</th><th>Owner</th><th>Success criteria</th><th>Tracking</th><th>Status</th><th>Complete</th><th></th></tr></thead>
          <tbody>{filteredScheduleProjects.map((milestone) => (
            <tr key={milestone.id} className={milestone.is_enabled === false ? 'drc-task-disabled' : ''}>
              <td>{milestone.milestone_code || milestone.project_code}</td>
              <td className="drc-task-name"><Link to={`${taskBasePath}/${encodeURIComponent(milestone.id)}`}><b>{milestone.title}</b></Link></td>
              <td>{displayDate(milestone.start_date)}<br />to {displayDate(milestone.due_date)}</td>
              <td>{milestone.owner_name || 'Not assigned'}</td>
              <td>{milestone.success_criteria || 'Not recorded'}{milestone.subtask_count ? <small className="block text-muted-foreground">{milestone.completed_subtask_count}/{milestone.subtask_count} subtasks complete</small> : null}</td>
              <td><button type="button" className={`drc-task-toggle ${milestone.is_enabled === false ? '' : 'on'}`} onClick={() => toggleProjectEnabled(milestone)} disabled={busyKey === milestone.id} aria-pressed={milestone.is_enabled !== false} title={milestone.is_enabled === false ? 'Turn task on' : 'Turn task off'}><Power /> {milestone.is_enabled === false ? 'Off' : 'On'}</button></td>
              <td><SchedulePill value={normalizeMasterScheduleStatus(milestone.status)} /></td>
              <td>{Number(milestone.progress_percent || 0)}%</td>
              <td><Link className="drc-btn" to={`${taskBasePath}/${encodeURIComponent(milestone.id)}`}>Open task</Link></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
