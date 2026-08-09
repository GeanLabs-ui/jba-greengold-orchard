import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MasterScheduleView, {
  isMasterScheduleOverdue,
  normalizeMasterScheduleStatus,
  summarizeMasterScheduleProjects,
} from '@/components/farm/MasterScheduleView';
import { useToast } from '@/components/ui/use-toast';
import { PROGRAMME_CODE } from '@/data/dailyRoutineProgramme';
import { subscribeToDataChanges } from '@/lib/data-sync';

const TODAY = new Date().toISOString().slice(0, 10);
const emptyTask = () => ({ title: '', owner_name: '', start_date: TODAY, due_date: '', priority: 'Medium', success_criteria: '' });
const emptyFilter = () => ({ period: 'all', status: 'all', search: '', start: '', end: '' });
const taskBasePath = '/admin/farm-daily-activities/activities/master-schedule';

export default function FarmDailyMasterSchedule() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [showNewMasterTask, setShowNewMasterTask] = useState(false);
  const [newMasterTask, setNewMasterTask] = useState(emptyTask);
  const [scheduleFilter, setScheduleFilter] = useState(emptyFilter);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [projectRows, taskRows] = await Promise.all([
        base44.entities.FarmProject.list('project_code', 250).catch(() => []),
        base44.entities.FarmTask.list('wbs', 500).catch(() => []),
      ]);
      setProjects(projectRows.filter((item) => item.programme_code === PROGRAMME_CODE));
      setSubtasks(taskRows.filter((item) => item.parent_project_id && !item.archived_at));
    } catch (error) {
      toast({ title: 'Master Schedule could not be loaded', description: error.message, variant: 'destructive' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let timer;
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = window.setTimeout(() => load({ silent: true }), 160);
    }, ['FarmProject', 'FarmTask']);
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [load]);

  const allScheduleProjects = useMemo(() => summarizeMasterScheduleProjects(projects, subtasks), [projects, subtasks]);
  const filterRange = useMemo(() => {
    if (scheduleFilter.period === 'custom') return { start: scheduleFilter.start ? new Date(`${scheduleFilter.start}T00:00:00`) : null, end: scheduleFilter.end ? new Date(`${scheduleFilter.end}T23:59:59`) : null };
    if (scheduleFilter.period === 'all') return { start: null, end: null };
    const start = new Date();
    const end = new Date(start);
    if (scheduleFilter.period === 'daily') end.setDate(end.getDate() + 1);
    if (scheduleFilter.period === 'weekly') end.setDate(end.getDate() + 7);
    if (scheduleFilter.period === 'monthly') end.setMonth(end.getMonth() + 1);
    if (scheduleFilter.period === 'yearly') end.setFullYear(end.getFullYear() + 1);
    return { start, end };
  }, [scheduleFilter]);
  const filteredScheduleProjects = useMemo(() => allScheduleProjects.filter((project) => {
    const search = scheduleFilter.search.trim().toLowerCase();
    if (search && !`${project.title} ${project.owner_name} ${project.milestone_code || project.project_code}`.toLowerCase().includes(search)) return false;
    if (scheduleFilter.status !== 'all' && normalizeMasterScheduleStatus(project.status) !== scheduleFilter.status) return false;
    const linked = subtasks.filter((item) => item.parent_project_id === project.id);
    const dates = [project.start_date, project.due_date, ...linked.flatMap((item) => [item.planned_start_at || item.planned_start, item.completion_due_at || item.due_date])].filter(Boolean).map((value) => new Date(value));
    if (filterRange.start && dates.length && !dates.some((value) => value >= filterRange.start && value <= filterRange.end)) return false;
    return !(filterRange.end && dates.length && !dates.some((value) => value <= filterRange.end));
  }), [allScheduleProjects, filterRange, scheduleFilter, subtasks]);
  const filteredSummary = useMemo(() => ({
    total: filteredScheduleProjects.length,
    active: filteredScheduleProjects.filter((item) => normalizeMasterScheduleStatus(item.status) === 'in_progress').length,
    completed: filteredScheduleProjects.filter((item) => normalizeMasterScheduleStatus(item.status) === 'completed').length,
    overdue: filteredScheduleProjects.filter((item) => item.overdue || isMasterScheduleOverdue(item)).length,
    progress: Math.round(filteredScheduleProjects.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / (filteredScheduleProjects.length || 1)),
  }), [filteredScheduleProjects]);

  const toggleProjectEnabled = async (project) => {
    const isEnabled = project.is_enabled === false;
    setBusyKey(project.id);
    try {
      const updated = await base44.entities.FarmProject.update(project.id, { is_enabled: isEnabled, updated_from: 'Farm Daily Activities Master Schedule' });
      setProjects((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast({ title: isEnabled ? 'Task enabled' : 'Task turned off' });
    } catch (error) {
      toast({ title: 'Task activation could not be updated', description: error.message, variant: 'destructive' });
    } finally {
      setBusyKey('');
    }
  };

  const createMasterTask = async (event) => {
    event.preventDefault();
    const title = newMasterTask.title.trim();
    if (!title) return;
    setBusyKey('new-master-task');
    try {
      const taskCode = `MS-${Date.now().toString().slice(-8)}`;
      const created = await base44.entities.FarmProject.create({
        programme_code: PROGRAMME_CODE,
        project_code: taskCode,
        milestone_code: taskCode,
        project_type: 'master_schedule_task',
        title,
        owner_name: newMasterTask.owner_name.trim(),
        start_date: newMasterTask.start_date,
        due_date: newMasterTask.due_date,
        priority: newMasterTask.priority,
        success_criteria: newMasterTask.success_criteria.trim(),
        status: 'not_started',
        progress_percent: 0,
        rag: 'AMBER',
        is_enabled: true,
        source: 'Master Schedule',
      });
      setProjects((current) => [...current, created]);
      setShowNewMasterTask(false);
      setNewMasterTask(emptyTask());
      toast({ title: 'Master task created', description: 'Add its checklist and field updates from the task workspace.' });
      navigate(`${taskBasePath}/${encodeURIComponent(created.id)}`);
    } catch (error) {
      toast({ title: 'Master task could not be created', description: error.message, variant: 'destructive' });
    } finally {
      setBusyKey('');
    }
  };

  if (loading && !projects.length) return <div className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading Master Schedule…</div>;

  return <div className="drc-page drc-embedded-schedule"><MasterScheduleView embedded busyKey={busyKey} createMasterTask={createMasterTask} filteredScheduleProjects={filteredScheduleProjects} filteredSummary={filteredSummary} newMasterTask={newMasterTask} scheduleFilter={scheduleFilter} setNewMasterTask={setNewMasterTask} setScheduleFilter={setScheduleFilter} setShowNewMasterTask={setShowNewMasterTask} showNewMasterTask={showNewMasterTask} taskBasePath={taskBasePath} toggleProjectEnabled={toggleProjectEnabled} /></div>;
}
