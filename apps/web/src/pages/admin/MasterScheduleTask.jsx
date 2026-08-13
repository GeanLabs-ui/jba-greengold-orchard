import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckSquare, ClipboardList, Clock3, Download, Eye, History, LayoutDashboard, Loader2, MessageSquare, Paperclip, Pause, Play, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
  deferred: 'Deferred',
};

const toDate = (value) => value ? String(value).slice(0, 10) : '';
const toTime = (value) => value ? String(value).slice(11, 16) : '';
const toLocalDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const localNow = () => toLocalDateTime(new Date().toISOString());
const toIso = (value) => value ? new Date(value).toISOString() : '';
const trackedSeconds = (subtask, now = Date.now()) => {
  const stored = Number(subtask.time_spent_seconds || 0);
  if (!subtask.timer_started_at) return stored;
  return stored + Math.max(0, Math.floor((now - new Date(subtask.timer_started_at).getTime()) / 1000));
};
const durationLabel = (seconds) => {
  const totalMinutes = Math.floor(seconds / 60);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days ? `${days}d ` : ''}${hours ? `${hours}h ` : ''}${minutes}m`;
};
const summarizeSubtasks = (subtasks) => {
  const total = subtasks.length;
  const completed = subtasks.filter((item) => item.status === 'completed').length;
  const progress = Math.round(subtasks.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / (total || 1));
  const status = completed === total ? 'completed' : subtasks.some((item) => item.status === 'blocked') ? 'blocked' : subtasks.some((item) => item.status === 'in_progress') ? 'in_progress' : 'not_started';
  return { status, progress_percent: progress, rag: status === 'completed' ? 'GREEN' : status === 'blocked' ? 'RED' : 'AMBER' };
};

function TaskField({ label, children, full = false }) {
  return <label className={`grid gap-1.5 text-sm font-medium ${full ? 'md:col-span-2' : ''}`}><span>{label}</span>{children}</label>;
}

function SubtaskRow({ subtask, currentTime, onComplete, onTimerToggle, onUpdate, onArchive }) {
  const complete = subtask.status === 'completed';
  const running = Boolean(subtask.timer_started_at);
  const statusText = complete ? 'Completed' : running ? 'In progress' : 'Not started';

  return <article className="p-4 sm:p-5">
    <div className="flex flex-wrap items-start gap-3">
      <input type="checkbox" checked={complete} onChange={() => onComplete(subtask)} className="mt-1 h-4 w-4 shrink-0" aria-label={`Mark ${subtask.title} complete`} />
      <div className="min-w-0 flex-1"><p className={complete ? 'font-medium text-muted-foreground line-through' : 'font-medium'}>{subtask.title}</p><p className="mt-1 text-xs text-muted-foreground">Created {new Date(subtask.created_date || subtask.created_at).toLocaleString()} · {statusText}</p></div>
      <div className="flex items-center gap-2"><Button type="button" size="sm" variant={running ? 'outline' : 'secondary'} disabled={complete} onClick={() => onTimerToggle(subtask)}>{running ? <Pause /> : <Play />}{running ? 'Pause task' : 'Start task'}</Button><Button type="button" size="icon" variant="ghost" onClick={() => onArchive(subtask)} title="Delete subtask"><Trash2 /></Button></div>
    </div>
    <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
      <label className="grid gap-1 text-xs font-medium text-muted-foreground"><span>Priority</span><select value={subtask.priority || 'medium'} onChange={(event) => onUpdate(subtask, 'priority', event.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground"><span>Planned start</span><input type="datetime-local" value={toLocalDateTime(subtask.planned_start_at || subtask.planned_start)} onChange={(event) => onUpdate(subtask, 'planned_start_at', event.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground" /></label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground"><span>Complete by</span><input type="datetime-local" value={toLocalDateTime(subtask.completion_due_at || subtask.due_date)} onChange={(event) => onUpdate(subtask, 'completion_due_at', event.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground" /></label>
    </div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span><Clock3 className="mr-1 inline h-3.5 w-3.5" />Tracked: {durationLabel(trackedSeconds(subtask, currentTime))}</span>{subtask.started_at && <span>First started {new Date(subtask.started_at).toLocaleString()}</span>}{subtask.completed_at && <span>Completed {new Date(subtask.completed_at).toLocaleString()}</span>}</div>
  </article>;
}

function AttachmentPreview({ attachment, onClose }) {
  if (!attachment) return null;
  const previewUrl = `${attachment.url}?preview=1`;
  const type = attachment.contentType || '';
  const canPreview = type.startsWith('image/') || type.startsWith('video/') || ['application/pdf', 'text/plain'].includes(type);
  return <Dialog open={Boolean(attachment)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-5xl"><DialogHeader><DialogTitle>{attachment.name}</DialogTitle><DialogDescription>{canPreview ? 'Private preview' : 'This file type is available for download.'}</DialogDescription></DialogHeader>{type.startsWith('image/') ? <img src={previewUrl} alt={attachment.name} className="max-h-[70vh] w-full object-contain" /> : type.startsWith('video/') ? <video src={previewUrl} controls className="max-h-[70vh] w-full" /> : type === 'application/pdf' ? <iframe title={attachment.name} src={previewUrl} className="h-[70vh] w-full border" /> : type === 'text/plain' ? <iframe title={attachment.name} src={previewUrl} className="h-[60vh] w-full border" /> : <p className="text-sm text-muted-foreground">DOCX files and non-previewable formats can be downloaded for viewing in their native application.</p>}<div className="flex justify-end"><Button asChild><a href={attachment.url}><Download /> Download</a></Button></div></DialogContent></Dialog>;
}

export default function MasterScheduleTask() {
  const { taskId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const masterSchedulePath = location.pathname.startsWith('/admin/farm-daily-activities/')
    ? '/admin/farm-daily-activities/activities/master-schedule'
    : '/admin/farm-daily-activities/activities/master-schedule';
  const { toast } = useToast();
  const [task, setTask] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subtasks, setSubtasks] = useState([]);
  const [archivedSubtasks, setArchivedSubtasks] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [subtaskPriority, setSubtaskPriority] = useState('medium');
  const [subtaskStartAt, setSubtaskStartAt] = useState(localNow);
  const [subtaskDueAt, setSubtaskDueAt] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [feedbackTargetId, setFeedbackTargetId] = useState('');
  const [postingFeedback, setPostingFeedback] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [activeView, setActiveView] = useState('overview');

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      base44.entities.FarmProject.list('project_code', 250),
      base44.entities.FarmTask.list('-created_date', 250),
      base44.entities.FarmNote.list('-created_date', 250),
    ])
      .then(([projects, taskRecords, notes]) => {
        const record = (projects || []).find((project) => project.id === taskId);
        if (!active) return;
        setTask(record || null);
        const linkedSubtasks = (taskRecords || []).filter((item) => item.parent_project_id === taskId);
        setSubtasks(linkedSubtasks.filter((item) => !item.archived_at));
        setArchivedSubtasks(linkedSubtasks.filter((item) => item.archived_at));
        setFeedback((notes || []).filter((item) => item.parent_project_id === taskId));
        setForm(record ? {
          title: record.title || '',
          owner_name: record.owner_name || '',
          start_date: toDate(record.start_date),
          due_date: toDate(record.due_date),
          start_time: record.start_time || toTime(record.start_date),
          end_time: record.end_time || toTime(record.due_date),
          priority: record.priority || 'High',
          status: record.status || 'not_started',
          progress_percent: Number(record.progress_percent || 0),
          success_criteria: record.success_criteria || '',
          description: record.description || '',
          notes: record.notes || '',
        } : null);
      })
      .catch((error) => toast({ title: 'Task could not be loaded', description: error.message, variant: 'destructive' }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [taskId, toast]);

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const syncParentFromSubtasks = async (nextSubtasks) => {
    if (!task || !nextSubtasks.length) return;
    const summary = summarizeSubtasks(nextSubtasks);
    if (task.master_timer_started_at && summary.status !== 'completed') summary.status = 'in_progress';
    const updated = await base44.entities.FarmProject.update(task.id, {
      ...summary,
      updated_from: 'Master Schedule subtask rollup',
    });
    setTask(updated);
    setForm((current) => ({ ...current, ...summary }));
  };

  const toggleMasterTimer = async () => {
    if (!task || form.status === 'completed') return;
    const now = new Date().toISOString();
    const running = Boolean(task.master_timer_started_at);
    const elapsed = trackedSeconds({ time_spent_seconds: task.master_time_spent_seconds, timer_started_at: task.master_timer_started_at });
    setSaving(true);
    try {
      const updated = await base44.entities.FarmProject.update(task.id, running ? {
        status: 'in_progress',
        master_timer_started_at: '',
        master_time_spent_seconds: elapsed,
        updated_from: 'Master Schedule parent timer',
      } : {
        status: 'in_progress',
        master_started_at: task.master_started_at || now,
        master_timer_started_at: now,
        updated_from: 'Master Schedule parent timer',
      });
      setTask(updated);
      setForm((current) => ({ ...current, status: 'in_progress' }));
      toast({ title: running ? 'Master task paused' : 'Master task started' });
    } catch (error) {
      toast({ title: 'Master task timer could not be updated', description: error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const save = async (event) => {
    event.preventDefault();
    if (!task || !form) return;
    const progress = Math.max(0, Math.min(100, Number(form.progress_percent || 0)));
    const status = progress === 100 ? 'completed' : form.status;
    const payload = {
      ...form,
      status,
      progress_percent: progress,
      rag: status === 'completed' ? 'GREEN' : status === 'blocked' ? 'RED' : 'AMBER',
      updated_from: 'Master Schedule',
    };
    setSaving(true);
    try {
      const updated = await base44.entities.FarmProject.update(task.id, payload);
      await base44.entities.AuditLog.create({
        action: 'Master Schedule task updated',
        record_type: 'FarmProject',
        record_code: task.project_code || task.milestone_code || task.id,
        programme_code: task.programme_code,
        event_date: new Date().toISOString().slice(0, 10),
        comment: `${updated.title || payload.title}: ${STATUS_LABELS[status] || status} at ${progress}%`,
        source: 'Master Schedule',
      }).catch(() => null);
      setTask(updated);
      setForm({ ...payload, status, progress_percent: progress });
      toast({ title: 'Task saved', description: 'The Master Schedule has been updated.' });
    } catch (error) {
      toast({ title: 'Task could not be saved', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addSubtask = async (event) => {
    event.preventDefault();
    const title = newSubtask.trim();
    if (!title || !task) return;
    setSaving(true);
    try {
      const created = await base44.entities.FarmTask.create({
        parent_project_id: task.id,
        programme_code: task.programme_code,
        task_code: `SUB-${task.milestone_code || task.id.slice(0, 8)}-${Date.now().toString().slice(-6)}`,
        title,
        assigned_to_name: task.owner_name || '',
        priority: subtaskPriority,
        planned_start: toIso(subtaskStartAt),
        due_date: toIso(subtaskDueAt),
        planned_start_at: toIso(subtaskStartAt),
        completion_due_at: toIso(subtaskDueAt),
        status: 'not_started',
        progress_percent: 0,
        created_at: new Date().toISOString(),
        time_spent_seconds: 0,
        source: 'Master Schedule',
      });
      const nextSubtasks = [created, ...subtasks];
      setSubtasks(nextSubtasks);
      await syncParentFromSubtasks(nextSubtasks);
      setNewSubtask('');
      setSubtaskPriority('medium');
      setSubtaskStartAt(localNow());
      setSubtaskDueAt('');
      toast({ title: 'Subtask added' });
    } catch (error) {
      toast({ title: 'Subtask could not be added', description: error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const toggleSubtask = async (subtask) => {
    const completed = subtask.status !== 'completed';
    const now = new Date().toISOString();
    const elapsed = trackedSeconds(subtask);
    try {
      const updated = await base44.entities.FarmTask.update(subtask.id, {
        status: completed ? 'completed' : 'not_started',
        progress_percent: completed ? 100 : 0,
        completed_at: completed ? now : '',
        timer_started_at: '',
        time_spent_seconds: elapsed,
        updated_from: 'Master Schedule',
      });
      const nextSubtasks = subtasks.map((item) => item.id === updated.id ? updated : item);
      setSubtasks(nextSubtasks);
      await syncParentFromSubtasks(nextSubtasks);
    } catch (error) {
      toast({ title: 'Subtask could not be updated', description: error.message, variant: 'destructive' });
    }
  };

  const toggleSubtaskTimer = async (subtask) => {
    if (subtask.status === 'completed') return;
    const starting = !subtask.timer_started_at;
    const now = new Date().toISOString();
    try {
      const updated = await base44.entities.FarmTask.update(subtask.id, starting ? {
        status: 'in_progress',
        started_at: subtask.started_at || now,
        timer_started_at: now,
        updated_from: 'Master Schedule',
      } : {
        status: 'in_progress',
        timer_started_at: '',
        time_spent_seconds: trackedSeconds(subtask),
        updated_from: 'Master Schedule',
      });
      const nextSubtasks = subtasks.map((item) => item.id === updated.id ? updated : item);
      setSubtasks(nextSubtasks);
      await syncParentFromSubtasks(nextSubtasks);
    } catch (error) {
      toast({ title: 'Task timer could not be updated', description: error.message, variant: 'destructive' });
    }
  };

  const updateSubtask = async (subtask, field, value) => {
    try {
      const updated = await base44.entities.FarmTask.update(subtask.id, {
        [field]: field === 'priority' ? value : toIso(value),
        ...(field === 'planned_start_at' ? { planned_start: toIso(value) } : {}),
        ...(field === 'completion_due_at' ? { due_date: toIso(value) } : {}),
        updated_from: 'Master Schedule',
      });
      const nextSubtasks = subtasks.map((item) => item.id === updated.id ? updated : item);
      setSubtasks(nextSubtasks);
      await syncParentFromSubtasks(nextSubtasks);
    } catch (error) {
      toast({ title: 'Subtask could not be updated', description: error.message, variant: 'destructive' });
    }
  };

  const archiveSubtask = async (subtask) => {
    const archivedAt = new Date().toISOString();
    try {
      const archived = await base44.entities.FarmTask.update(subtask.id, {
        archived_at: archivedAt,
        deleted_at: archivedAt,
        archived_previous_status: subtask.status,
        archived_from: 'Master Schedule',
        timer_started_at: '',
        time_spent_seconds: trackedSeconds(subtask),
      });
      await base44.entities.AuditLog.create({
        action: 'Master Schedule subtask deleted',
        record_type: 'FarmTask',
        record_code: subtask.task_code || subtask.id,
        programme_code: task.programme_code,
        event_date: archivedAt.slice(0, 10),
        comment: JSON.stringify({ title: subtask.title, archived_at: archivedAt, snapshot: subtask }),
        source: 'Master Schedule',
      }).catch(() => null);
      const nextSubtasks = subtasks.filter((item) => item.id !== archived.id);
      setSubtasks(nextSubtasks);
      setArchivedSubtasks((current) => [archived, ...current]);
      await syncParentFromSubtasks(nextSubtasks);
      toast({ title: 'Subtask deleted', description: 'Its details and deletion time are retained in History and can be restored.' });
    } catch (error) {
      toast({ title: 'Subtask could not be archived', description: error.message, variant: 'destructive' });
    }
  };

  const restoreSubtask = async (subtask) => {
    try {
      const restored = await base44.entities.FarmTask.update(subtask.id, {
        archived_at: '',
        deleted_at: '',
        archived_from: '',
        status: subtask.archived_previous_status || 'not_started',
        updated_from: 'Master Schedule restore',
      });
      await base44.entities.AuditLog.create({
        action: 'Master Schedule subtask restored',
        record_type: 'FarmTask',
        record_code: subtask.task_code || subtask.id,
        programme_code: task.programme_code,
        event_date: new Date().toISOString().slice(0, 10),
        comment: `Restored subtask: ${subtask.title}`,
        source: 'Master Schedule',
      }).catch(() => null);
      const nextSubtasks = [restored, ...subtasks];
      setSubtasks(nextSubtasks);
      setArchivedSubtasks((current) => current.filter((item) => item.id !== restored.id));
      await syncParentFromSubtasks(nextSubtasks);
      toast({ title: 'Subtask restored' });
    } catch (error) {
      toast({ title: 'Subtask could not be restored', description: error.message, variant: 'destructive' });
    }
  };

  const postFeedback = async (event) => {
    event.preventDefault();
    if ((!feedbackText.trim() && !attachments.length) || !task) return;
    setPostingFeedback(true);
    try {
      const targetId = feedbackTargetId || task.id;
      const uploaded = await Promise.all(attachments.map((file) => base44.files.upload(file, targetId)));
      const created = await base44.entities.FarmNote.create({
        parent_project_id: task.id,
        subtask_id: feedbackTargetId || '',
        programme_code: task.programme_code,
        title: 'Daily task update',
        note: feedbackText.trim(),
        feedback_date: new Date().toISOString(),
        attachments: uploaded,
        source: 'Master Schedule',
      });
      setFeedback((current) => [created, ...current]);
      setFeedbackText('');
      setAttachments([]);
      toast({ title: 'Daily feedback posted' });
    } catch (error) {
      toast({ title: 'Feedback could not be posted', description: error.message, variant: 'destructive' });
    } finally { setPostingFeedback(false); }
  };

  if (loading) return <div className="grid min-h-[20rem] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  if (!task || !form) return <div className="mx-auto max-w-2xl py-16 text-center"><h1 className="text-xl font-semibold">Schedule task not found</h1><Button asChild className="mt-4"><Link to={masterSchedulePath}>Back to Master Schedule</Link></Button></div>;

  const completedSubtasks = subtasks.filter((subtask) => subtask.status === 'completed').length;
  const statusTone = form.status === 'completed' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : form.status === 'blocked' ? 'bg-red-50 text-red-700 ring-red-200' : form.status === 'in_progress' ? 'bg-sky-50 text-sky-700 ring-sky-200' : 'bg-muted text-muted-foreground ring-border';

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <Button variant="ghost" asChild className="-ml-3 mb-3"><Link to={masterSchedulePath}><ArrowLeft /> Master Schedule</Link></Button>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{task.milestone_code || task.project_code || 'Schedule task'}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold tracking-tight">{task.title}</h1><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusTone}`}>{STATUS_LABELS[form.status]}</span></div>
        </div>
        <div className="flex items-center gap-2"><Button type="button" variant={task.master_timer_started_at ? 'outline' : 'secondary'} disabled={saving || form.status === 'completed'} onClick={toggleMasterTimer}>{task.master_timer_started_at ? <Pause /> : <Play />}{task.master_timer_started_at ? 'Pause master task' : 'Start master task'}</Button><Button type="button" variant="outline" onClick={() => navigate(masterSchedulePath)}>Cancel</Button><Button type="submit" form="task-editor" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save task</Button></div>
      </div>

      <div className="grid divide-y overflow-hidden rounded-lg border border-border bg-card shadow-sm sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="p-4"><p className="text-xs font-medium text-muted-foreground">Completion</p><p className="mt-1 text-2xl font-semibold">{form.progress_percent}%</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, form.progress_percent))}%` }} /></div></div>
        <div className="p-4"><p className="text-xs font-medium text-muted-foreground">Schedule window</p><p className="mt-1 text-sm font-semibold">{toDate(form.start_date) || 'Not set'} <span className="text-muted-foreground">to</span> {toDate(form.due_date) || 'Not set'}</p></div>
        <div className="p-4"><p className="text-xs font-medium text-muted-foreground">Checklist</p><p className="mt-1 text-2xl font-semibold">{completedSubtasks}<span className="text-base font-medium text-muted-foreground"> / {subtasks.length}</span></p><p className="mt-1 text-xs text-muted-foreground">subtasks complete</p></div>
        <div className="p-4"><p className="text-xs font-medium text-muted-foreground">Tracked master time</p><p className="mt-1 text-2xl font-semibold">{durationLabel(trackedSeconds({ time_spent_seconds: task.master_time_spent_seconds, timer_started_at: task.master_timer_started_at }, currentTime))}</p><p className="mt-1 text-xs text-muted-foreground">{task.master_timer_started_at ? 'timer running' : 'active work time'}</p></div>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4">
        <TabsList className="w-full justify-start rounded-md border border-border bg-card p-1 shadow-sm"><TabsTrigger value="overview" className="gap-2"><LayoutDashboard className="h-4 w-4" />Overview</TabsTrigger><TabsTrigger value="plan" className="gap-2"><ClipboardList className="h-4 w-4" />Master task details</TabsTrigger><TabsTrigger value="subtasks" className="gap-2"><CheckSquare className="h-4 w-4" />Subtasks <span className="rounded bg-muted px-1.5 text-xs">{subtasks.length}</span></TabsTrigger><TabsTrigger value="feedback" className="gap-2"><MessageSquare className="h-4 w-4" />Field updates <span className="rounded bg-muted px-1.5 text-xs">{feedback.length}</span></TabsTrigger><TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" />History <span className="rounded bg-muted px-1.5 text-xs">{archivedSubtasks.length}</span></TabsTrigger></TabsList>
        <TabsContent value="overview" className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-7"><div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5"><div><h2 className="font-semibold">Task workspace</h2><p className="mt-1 text-sm text-muted-foreground">Use the dedicated views below to plan the main task, execute subtasks, and capture field evidence.</p></div><Button type="button" onClick={() => setActiveView('subtasks')}><CheckSquare /> Manage subtasks</Button></div><div className="mt-5 grid gap-4 md:grid-cols-3"><div className="rounded-md border p-4"><p className="text-xs font-semibold uppercase tracking-wide text-primary">1. Master task details</p><p className="mt-2 text-sm text-muted-foreground">Owner, priority, schedule window, success criteria, and overall status for this parent task.</p><Button type="button" variant="link" className="mt-3 h-auto px-0" onClick={() => setActiveView('plan')}>Open master task details</Button></div><div className="rounded-md border p-4"><p className="text-xs font-semibold uppercase tracking-wide text-primary">2. Subtasks</p><p className="mt-2 text-sm text-muted-foreground">The individual actions that record start, pause, completion, timing, and roll up into the parent.</p><Button type="button" variant="link" className="mt-3 h-auto px-0" onClick={() => setActiveView('subtasks')}>Open subtasks</Button></div><div className="rounded-md border p-4"><p className="text-xs font-semibold uppercase tracking-wide text-primary">3. Field updates</p><p className="mt-2 text-sm text-muted-foreground">Daily updates, private attachments, and a restoreable history of deleted subtasks.</p><Button type="button" variant="link" className="mt-3 h-auto px-0" onClick={() => setActiveView('feedback')}>Open field updates</Button></div></div></TabsContent>
        <TabsContent value="plan" className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-7"><div className="mb-6 flex items-center gap-3 border-b pb-4"><span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><CalendarDays className="h-5 w-5" /></span><div><h2 className="font-semibold">Task plan</h2><p className="text-sm text-muted-foreground">Define accountability, timing, expected outcome, and current state.</p></div></div><form id="task-editor" onSubmit={save} className="grid gap-5 md:grid-cols-2"><TaskField label="Task name" full><input name="title" value={form.title} onChange={updateForm} required maxLength="200" className="h-10 rounded-md border border-input bg-background px-3" /></TaskField><TaskField label="Task owner"><input name="owner_name" value={form.owner_name} onChange={updateForm} maxLength="160" className="h-10 rounded-md border border-input bg-background px-3" /></TaskField><TaskField label="Priority"><select name="priority" value={form.priority} onChange={updateForm} className="h-10 rounded-md border border-input bg-background px-3"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></TaskField><TaskField label="Start date"><input name="start_date" type="date" value={form.start_date} onChange={updateForm} className="h-10 rounded-md border border-input bg-background px-3" /></TaskField><TaskField label="Start time"><input name="start_time" type="time" value={form.start_time} onChange={updateForm} className="h-10 rounded-md border border-input bg-background px-3" /></TaskField><TaskField label="Due date"><input name="due_date" type="date" value={form.due_date} onChange={updateForm} className="h-10 rounded-md border border-input bg-background px-3" /></TaskField><TaskField label="End time"><input name="end_time" type="time" value={form.end_time} onChange={updateForm} className="h-10 rounded-md border border-input bg-background px-3" /></TaskField><TaskField label="Status"><select name="status" value={form.status} onChange={updateForm} className="h-10 rounded-md border border-input bg-background px-3">{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></TaskField><TaskField label="Completion (%)"><input name="progress_percent" type="number" min="0" max="100" value={form.progress_percent} onChange={updateForm} className="h-10 rounded-md border border-input bg-background px-3" /></TaskField><TaskField label="Success criteria" full><textarea name="success_criteria" value={form.success_criteria} onChange={updateForm} rows="3" maxLength="2000" className="rounded-md border border-input bg-background px-3 py-2" /></TaskField><TaskField label="Full task details" full><textarea name="description" value={form.description} onChange={updateForm} rows="5" maxLength="5000" className="rounded-md border border-input bg-background px-3 py-2" /></TaskField><TaskField label="Update notes" full><textarea name="notes" value={form.notes} onChange={updateForm} rows="4" maxLength="5000" className="rounded-md border border-input bg-background px-3 py-2" /></TaskField></form></TabsContent>
        <TabsContent value="subtasks" className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-7"><div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4"><div><h2 className="font-semibold">Execution checklist</h2><p className="mt-1 text-sm text-muted-foreground">Plan each action, track active working time, and mark it complete when finished.</p></div><p className="rounded-md bg-muted px-3 py-2 text-sm font-medium">{completedSubtasks} of {subtasks.length} done</p></div><form onSubmit={addSubtask} className="mt-5 grid gap-3 rounded-md border bg-muted/20 p-4 md:grid-cols-2"><label className="grid gap-1 text-xs font-medium text-muted-foreground md:col-span-2"><span>Subtask name</span><input value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} placeholder="Add a subtask" maxLength="200" className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" /></label><label className="grid gap-1 text-xs font-medium text-muted-foreground"><span>Priority</span><select value={subtaskPriority} onChange={(event) => setSubtaskPriority(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label className="grid gap-1 text-xs font-medium text-muted-foreground"><span>Planned start</span><input type="datetime-local" value={subtaskStartAt} onChange={(event) => setSubtaskStartAt(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" /></label><label className="grid gap-1 text-xs font-medium text-muted-foreground md:col-span-2"><span>Completion due</span><input type="datetime-local" value={subtaskDueAt} onChange={(event) => setSubtaskDueAt(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" /></label><div className="md:col-span-2"><Button type="submit" disabled={saving || !newSubtask.trim()}><Plus /> Add subtask</Button></div></form><div className="mt-5 divide-y rounded-md border">{subtasks.length ? subtasks.map((subtask) => <SubtaskRow key={subtask.id} subtask={subtask} currentTime={currentTime} onComplete={toggleSubtask} onTimerToggle={toggleSubtaskTimer} onUpdate={updateSubtask} onArchive={archiveSubtask} />) : <p className="p-5 text-sm text-muted-foreground">No subtasks yet. Add the first action above.</p>}</div></TabsContent>
        <TabsContent value="feedback" className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-7"><div className="border-b pb-4"><h2 className="font-semibold">Daily field updates</h2><p className="mt-1 text-sm text-muted-foreground">Record progress, issues, and decisions for the main task or an individual subtask.</p></div><form onSubmit={postFeedback} className="mt-5 space-y-3"><select value={feedbackTargetId} onChange={(event) => setFeedbackTargetId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3"><option value="">Main task: {task.title}</option>{subtasks.map((subtask) => <option key={subtask.id} value={subtask.id}>Subtask: {subtask.title}</option>)}</select><textarea value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} rows="4" maxLength="5000" placeholder="What happened today? Include progress, issues, or decisions." className="w-full rounded-md border border-input bg-background px-3 py-2" /><input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(event) => setAttachments(Array.from(event.target.files || []))} className="block w-full text-sm" />{attachments.length > 0 && <p className="text-xs text-muted-foreground">{attachments.map((file) => file.name).join(', ')}</p>}<Button type="submit" disabled={postingFeedback || (!feedbackText.trim() && !attachments.length)}>{postingFeedback ? <Loader2 className="animate-spin" /> : <Paperclip />} Post update</Button></form><div className="mt-7 space-y-3 border-t pt-5">{feedback.length ? feedback.map((entry) => { const subtask = subtasks.find((item) => item.id === entry.subtask_id); return <article key={entry.id} className="rounded-md border p-4">{subtask && <p className="mb-2 text-xs font-semibold text-primary">Subtask: {subtask.title}</p>}<p className="whitespace-pre-wrap text-sm">{entry.note || 'Attachment added'}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(entry.feedback_date || entry.created_date).toLocaleString()}</p>{Array.isArray(entry.attachments) && entry.attachments.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{entry.attachments.map((attachment) => <span key={attachment.id} className="inline-flex items-center gap-1 rounded border px-1 py-1 text-xs"><button type="button" onClick={() => setPreviewAttachment(attachment)} className="inline-flex items-center gap-1 px-1 font-medium text-primary hover:underline"><Eye className="h-3.5 w-3.5" />{attachment.name}</button><a href={attachment.url} title="Download attachment" className="rounded p-1 text-muted-foreground hover:bg-muted"><Download className="h-3.5 w-3.5" /></a></span>)}</div>}</article>; }) : <p className="text-sm text-muted-foreground">No daily feedback yet.</p>}</div></TabsContent>
        <TabsContent value="history" className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-7"><div className="border-b pb-4"><h2 className="font-semibold">Deleted subtask history</h2><p className="mt-1 text-sm text-muted-foreground">Deleted subtasks retain their original details and system deletion time. Restore returns them to the active checklist.</p></div><div className="mt-5 divide-y rounded-md border">{archivedSubtasks.length ? archivedSubtasks.map((subtask) => <article key={subtask.id} className="flex flex-wrap items-center justify-between gap-4 p-4"><div><p className="font-medium">{subtask.title}</p><p className="mt-1 text-xs text-muted-foreground">Deleted {new Date(subtask.deleted_at || subtask.archived_at).toLocaleString()} · Previous status: {STATUS_LABELS[subtask.archived_previous_status] || 'Not Started'}</p></div><Button type="button" variant="outline" size="sm" onClick={() => restoreSubtask(subtask)}><RotateCcw /> Restore original task</Button></article>) : <p className="p-5 text-sm text-muted-foreground">No deleted subtasks for this task.</p>}</div></TabsContent>
      </Tabs>
      <AttachmentPreview attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
    </div>
  );
}
