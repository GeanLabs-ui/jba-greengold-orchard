import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ProgrammeOverviewView from '@/components/farm/ProgrammeOverviewView';
import {
  isMasterScheduleOverdue,
  normalizeMasterScheduleStatus,
  summarizeMasterScheduleProjects,
} from '@/components/farm/MasterScheduleView';
import { useToast } from '@/components/ui/use-toast';
import { PROGRAMME_CODE } from '@/data/dailyRoutineProgramme';
import { subscribeToDataChanges } from '@/lib/data-sync';

const masterSchedulePath = '/admin/farm-daily-activities/activities/master-schedule';

export default function FarmDailyOverview() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);

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
      toast({ title: 'Programme Overview could not be loaded', description: error.message, variant: 'destructive' });
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
  const scheduleProjects = useMemo(() => allScheduleProjects.filter((item) => item.is_enabled !== false), [allScheduleProjects]);
  const metrics = useMemo(() => {
    const total = scheduleProjects.length;
    const completed = scheduleProjects.filter((item) => normalizeMasterScheduleStatus(item.status) === 'completed').length;
    const active = scheduleProjects.filter((item) => normalizeMasterScheduleStatus(item.status) === 'in_progress').length;
    const overdue = scheduleProjects.filter((item) => item.overdue || isMasterScheduleOverdue(item)).length;
    const progress = Math.round(scheduleProjects.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / (total || 1));
    return { total, completed, active, overdue, progress, subtasks: subtasks.length, disabled: allScheduleProjects.length - total };
  }, [allScheduleProjects.length, scheduleProjects, subtasks.length]);

  if (loading && !projects.length) return <div className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading Programme Overview…</div>;

  return <div className="drc-page drc-embedded-schedule"><ProgrammeOverviewView embedded metrics={metrics} onOpenSchedule={() => navigate(masterSchedulePath)} scheduleProjects={scheduleProjects} taskBasePath={masterSchedulePath} /></div>;
}
