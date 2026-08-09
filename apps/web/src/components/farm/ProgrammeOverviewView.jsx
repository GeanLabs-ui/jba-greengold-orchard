import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Sprout } from 'lucide-react';
import { MASTER_SCHEDULE_STATUS_LABELS, normalizeMasterScheduleStatus } from '@/components/farm/MasterScheduleView';
import '@/pages/admin/DailyRoutineCheck.css';

const displayDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PageHead = ({ right }) => <div className="drc-page-head"><div><span className="drc-eyebrow">Executive overview</span><h1>Early harvest control room</h1><p>One operating view for the agronomic, field and commercial work behind the April–May 2027 mango harvest.</p></div>{right}</div>;
const Metric = ({ label, value, note, icon: Icon, alert = false }) => <div className={`drc-metric ${alert ? 'alert' : ''}`}><div><span>{label}</span><Icon /></div><strong>{value}</strong><small>{note}</small></div>;
const PanelHead = ({ title, copy, action }) => <div className="drc-panel-head"><div><h2>{title}</h2><p>{copy}</p></div>{action}</div>;
const Progress = ({ value, dark = false }) => <div className={`drc-track ${dark ? 'dark' : ''}`}><div style={{ width: `${Math.max(0, Math.min(100, Number(value || 0)))}%` }} /></div>;
const Pill = ({ value }) => <span className={`drc-pill ${value || ''}`}>{MASTER_SCHEDULE_STATUS_LABELS[value] || value || '—'}</span>;

export default function ProgrammeOverviewView({
  embedded = false,
  metrics,
  onOpenSchedule,
  scheduleProjects,
  taskBasePath = '/admin/daily-routine-check/master-schedule',
}) {
  return (
    <section className={`drc-view active ${embedded ? 'drc-embedded-view' : ''}`}>
      <PageHead right={<div className="drc-date-chip"><b>20 Jul 2026 — 31 May 2027</b><span>Kent · Keitt · Black Pearl</span></div>} />
      <div className="drc-metrics">
        <Metric label="Total schedule tasks" value={metrics.total} note={`${metrics.subtasks} linked subtasks${metrics.disabled ? ` · ${metrics.disabled} seasonal task${metrics.disabled === 1 ? '' : 's'} off` : ''}`} icon={ClipboardCheck} />
        <Metric label="Completed" value={metrics.completed} note={`${Math.round((metrics.completed / (metrics.total || 1)) * 100)}% of Master Schedule`} icon={CheckCircle2} />
        <Metric label="In progress" value={metrics.active} note="Tasks with active work" icon={Sprout} />
        <Metric label="Overdue" value={metrics.overdue} note="Incomplete past due date" icon={AlertTriangle} alert />
      </div>
      <div className="drc-dashboard-grid">
        <div className="drc-panel">
          <div className="drc-overall">
            <div><span>Overall project progress</span><strong>{metrics.progress}%</strong></div>
            <Progress value={metrics.progress} dark />
          </div>
          <PanelHead title="Live Master Schedule progress" copy="Select a task to review its checklist, time tracking, and updates." action={<button type="button" className="drc-btn" onClick={onOpenSchedule}>Open schedule</button>} />
          <div className="drc-panel-body drc-phase-list">
            {scheduleProjects.length ? scheduleProjects.map((project) => (
              <Link key={project.id} to={`${taskBasePath}/${encodeURIComponent(project.id)}`} className="block rounded-md px-2 py-2 transition-colors hover:bg-muted/60">
                <div className="drc-phase-meta"><b>{project.title}</b><span>{Number(project.progress_percent || 0)}% · {MASTER_SCHEDULE_STATUS_LABELS[normalizeMasterScheduleStatus(project.status)]}</span></div>
                <Progress value={Number(project.progress_percent || 0)} />
              </Link>
            )) : <p className="text-sm text-muted-foreground">No Master Schedule tasks have been created yet.</p>}
          </div>
        </div>
        <div className="drc-panel">
          <PanelHead title="Executive milestones" copy="Next programme control points" action={<button type="button" className="drc-btn" onClick={onOpenSchedule}>All {metrics.total}</button>} />
          <div className="drc-panel-body drc-milestone-list">
            {scheduleProjects.slice(0, 6).map((milestone) => {
              const status = normalizeMasterScheduleStatus(milestone.status);
              return (
                <Link to={`${taskBasePath}/${encodeURIComponent(milestone.id)}`} className="drc-milestone" key={milestone.id}>
                  <i className={`drc-dot ${milestone.rag || 'RED'}`} />
                  <div><b>{milestone.title}</b><small>{displayDate(milestone.due_date)} · {milestone.owner_name}</small></div>
                  <Pill value={status} />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className="drc-focus">
        <div>
          <h3>Management focus: close harvest, restore canopy health</h3>
          <p>Complete final picking and sanitation, confirm early-harvest blocks, then protect mature terminals while recovery nutrition and irrigation servicing begin.</p>
        </div>
        <div><strong>{scheduleProjects.filter((item) => String(item.priority).toLowerCase() === 'critical' && normalizeMasterScheduleStatus(item.status) !== 'completed').length}</strong><span>critical tasks</span></div>
      </div>
    </section>
  );
}
