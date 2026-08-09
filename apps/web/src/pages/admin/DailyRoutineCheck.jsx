import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  CloudSun,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { taskStatusToCalendar } from '@/lib/production-calendar';
import { useToast } from '@/components/ui/use-toast';
import MasterScheduleView from '@/components/farm/MasterScheduleView';
import ProgrammeOverviewView from '@/components/farm/ProgrammeOverviewView';
import BudgetHarvestView, { summarizeBudgetHarvest } from '@/components/farm/BudgetHarvestView';
import {
  BUDGET_BLUEPRINTS,
  MILESTONE_BLUEPRINTS,
  PROGRAMME,
  PROGRAMME_CODE,
  RISK_BLUEPRINTS,
  ROUTINE_TASK_BLUEPRINTS,
  SOURCE_NOTES,
} from '@/data/dailyRoutineProgramme';
import './DailyRoutineCheck.css';

const VIEWS = [
  { id: 'dashboard', label: 'Overview', group: 'Management' },
  { id: 'milestones', label: 'Master Schedule' },
  { id: 'blocks', label: 'Farm blocks' },
  { id: 'logs', label: 'Field logs', group: 'Operations' },
  { id: 'finance', label: 'Budget & harvest' },
  { id: 'risks', label: 'Risk register' },
  { id: 'sources', label: 'Sources' },
];

const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
  deferred: 'Deferred',
};
const STATUSES = Object.keys(STATUS_LABELS);
const LOG_TYPES = ['Nutrition', 'Irrigation', 'Pest & Disease', 'Weather', 'Lesson Learned'];
const TODAY = new Date().toISOString().slice(0, 10);
const PROGRAMME_TODAY = new Date();
const FARM_LAND_BLUEPRINTS = [
  { code: 'A', name: 'Farm Land A' },
  { code: 'B', name: 'Farm Land B' },
];
const FARM_BLOCK_BLUEPRINTS = FARM_LAND_BLUEPRINTS.flatMap((farmLand, landIndex) => (
  Array.from({ length: 5 }, (_, sectionIndex) => ({
    blockCode: `${farmLand.code}${sectionIndex + 1}`,
    farmLand: farmLand.name,
    variety: landIndex === 0
      ? sectionIndex < 3 ? 'Kent' : 'Keitt'
      : sectionIndex < 2 ? 'Keitt' : 'Black Pearl',
    earlyHarvest: landIndex === 0 && sectionIndex < 3,
  }))
));

const entityLists = [
  ['farms', 'Farm', '-created_date'],
  ['tasks', 'FarmTask', 'wbs'],
  ['projects', 'FarmProject', 'project_code'],
  ['blocks', 'FarmBlock', 'block_code'],
  ['logs', 'FarmProcessLog', '-activity_date'],
  ['financeRecords', 'FarmFinanceRecord', 'category'],
  ['harvests', 'HarvestBatch', '-harvest_date'],
  ['risks', 'FarmComplianceRecord', 'record_code'],
  ['activities', 'DailyActivity', '-activity_date'],
  ['notes', 'FarmNote', '-created_date'],
];

const date = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const code = (prefix) => `${prefix}-${Date.now().toString().slice(-8)}`;
const normalizedStatus = (value) => {
  const next = String(value || 'not_started').trim().toLowerCase().replaceAll(' ', '_');
  return STATUS_LABELS[next] ? next : 'not_started';
};
const scheduleDueAt = (item) => item.completion_due_at || item.due_date;
const isOverdue = (item) => {
  const dueAt = scheduleDueAt(item);
  return Boolean(dueAt) && new Date(dueAt) < new Date() && !['completed', 'deferred'].includes(normalizedStatus(item.status));
};
const summarizeScheduleProjects = (projects, subtasks) => projects.map((project) => {
  const children = subtasks.filter((item) => item.parent_project_id === project.id);
  if (!children.length) return { ...project, subtask_count: 0, completed_subtask_count: 0 };
  const completed = children.filter((item) => normalizedStatus(item.status) === 'completed').length;
  const progress = Math.round(children.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / children.length);
  const status = completed === children.length
    ? 'completed'
    : children.some((item) => normalizedStatus(item.status) === 'blocked')
      ? 'blocked'
      : children.some((item) => normalizedStatus(item.status) === 'in_progress')
        ? 'in_progress'
        : 'not_started';
  const overdue = isOverdue(project) || children.some(isOverdue);
  return {
    ...project,
    status,
    progress_percent: progress,
    rag: status === 'completed' ? 'GREEN' : status === 'blocked' ? 'RED' : 'AMBER',
    subtask_count: children.length,
    completed_subtask_count: completed,
    overdue,
  };
});
const statusForActivity = (value) => ({
  not_started: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
  deferred: 'Deferred',
}[normalizedStatus(value)]);

async function loadSharedData() {
  const values = await Promise.all(entityLists.map(([, entityName, sortBy]) => (
    base44.entities[entityName].list(sortBy, 250).catch(() => [])
  )));
  return Object.fromEntries(entityLists.map(([key], index) => [key, values[index] || []]));
}

async function runBatches(records, createRecord, size = 10) {
  for (let index = 0; index < records.length; index += size) {
    await Promise.all(records.slice(index, index + size).map(createRecord));
  }
}

async function seedProgramme(shared, onProgress) {
  const farm = shared.farms[0];
  const farmFields = {
    farm_id: farm?.id || '',
    farm_name: farm?.name || PROGRAMME.name,
    programme_code: PROGRAMME_CODE,
    source: 'Daily Routine Check',
  };
  let created = 0;

  const knownTasks = new Set(shared.tasks.filter((item) => item.programme_code === PROGRAMME_CODE).map((item) => item.task_code));
  const missingTasks = ROUTINE_TASK_BLUEPRINTS.filter((item) => !knownTasks.has(`DRC-${String(item.wbs).padStart(3, '0')}`));
  await runBatches(missingTasks, async (task) => {
    await base44.entities.FarmTask.create({
      ...farmFields,
      task_code: `DRC-${String(task.wbs).padStart(3, '0')}`,
      wbs: task.wbs,
      phase_name: task.phase,
      title: task.activity,
      description: task.description,
      category: task.phase.replace(/^\d+\.\s*/, ''),
      assigned_to_name: task.owner,
      owner_name: task.owner,
      priority: task.priority,
      planned_start: task.plannedStart,
      due_date: task.plannedFinish,
      deliverable: task.deliverable,
      status: 'not_started',
      progress_percent: 0,
      comments: '',
    });
    created += 1;
    onProgress?.(`Syncing client routine ${created} of ${missingTasks.length}`);
  });

  const storedByCode = new Map(shared.tasks.filter((item) => item.programme_code === PROGRAMME_CODE).map((item) => [item.task_code, item]));
  const textRepairs = ROUTINE_TASK_BLUEPRINTS.map((task) => {
    const taskCode = `DRC-${String(task.wbs).padStart(3, '0')}`;
    const stored = storedByCode.get(taskCode);
    if (!stored || (stored.title === task.activity && stored.description === task.description)) return null;
    return base44.entities.FarmTask.update(stored.id, {
      title: task.activity,
      description: task.description,
      deliverable: task.deliverable,
    });
  }).filter(Boolean);
  await Promise.all(textRepairs);

  const knownProjects = new Set(shared.projects.filter((item) => item.programme_code === PROGRAMME_CODE).map((item) => item.project_code));
  await runBatches(
    MILESTONE_BLUEPRINTS.filter((item) => !knownProjects.has(`DRC-${item.code}`)),
    (item) => base44.entities.FarmProject.create({
      ...farmFields,
      project_code: `DRC-${item.code}`,
      milestone_code: item.code,
      title: item.name,
      project_type: 'programme_milestone',
      start_date: item.startDate,
      due_date: item.endDate,
      owner_name: item.owner,
      success_criteria: item.successCriteria,
      status: 'not_started',
      progress_percent: 0,
      rag: 'RED',
    }),
  );

  const programmeBlocks = shared.blocks.filter((item) => item.programme_code === PROGRAMME_CODE);
  const legacyBlockCodes = new Map(Array.from({ length: 10 }, (_, index) => [
    `B${index + 1}`,
    FARM_BLOCK_BLUEPRINTS[index].blockCode,
  ]));
  const hasLegacyBlockLayout = programmeBlocks.some((item) => /^B(?:[6-9]|10)$/.test(item.block_code));
  const legacyBlocks = hasLegacyBlockLayout
    ? programmeBlocks.filter((item) => legacyBlockCodes.has(item.block_code))
    : [];
  await Promise.all(legacyBlocks.map((block) => {
    const blockCode = legacyBlockCodes.get(block.block_code);
    const blueprint = FARM_BLOCK_BLUEPRINTS.find((item) => item.blockCode === blockCode);
    return base44.entities.FarmBlock.update(block.id, {
      block_code: blockCode,
      code: blockCode,
      name: `Block ${blockCode}`,
      farm_name: blueprint.farmLand,
    });
  }));
  const knownBlocks = new Set([
    ...programmeBlocks.filter((item) => !legacyBlocks.includes(item)).map((item) => item.block_code),
    ...legacyBlocks.map((item) => legacyBlockCodes.get(item.block_code)),
  ]);
  await runBatches(
    FARM_BLOCK_BLUEPRINTS.filter((item) => !knownBlocks.has(item.blockCode)),
    (item) => base44.entities.FarmBlock.create({
      ...farmFields,
      farm_name: item.farmLand,
      block_code: item.blockCode,
      code: item.blockCode,
      name: `Block ${item.blockCode}`,
      variety: item.variety,
      early_harvest: item.earlyHarvest,
      shoot_maturity: 0,
      forecast_yield_kg: 0,
      fruit_fly_pressure: 'Low',
      disease_rating: 'Low',
      status: 'active',
    }),
  );

  const knownBudgets = new Set(shared.financeRecords.filter((item) => item.programme_code === PROGRAMME_CODE && item.record_type === 'programme_budget').map((item) => item.category));
  await runBatches(
    BUDGET_BLUEPRINTS.filter((item) => !knownBudgets.has(item.category)),
    (item) => base44.entities.FarmFinanceRecord.create({
      ...farmFields,
      record_code: code('DRC-BUD'),
      record_date: PROGRAMME.targetStart,
      record_type: 'programme_budget',
      category: item.category,
      description: `Early harvest programme budget: ${item.category}`,
      planned_amount: item.planned,
      actual_amount: 0,
      amount: item.planned,
      currency: 'GHS',
      status: 'planned',
    }),
  );

  const knownRisks = new Set(shared.risks.filter((item) => item.programme_code === PROGRAMME_CODE).map((item) => item.risk_code));
  await runBatches(
    RISK_BLUEPRINTS.filter((item) => !knownRisks.has(item.code)),
    (item) => base44.entities.FarmComplianceRecord.create({
      ...farmFields,
      record_code: `DRC-${item.code}`,
      risk_code: item.code,
      compliance_area: 'Programme Risk',
      requirement: item.title,
      category: item.category,
      probability: item.probability,
      impact: item.impact,
      rag: item.rag,
      mitigation: item.mitigation,
      owner: item.owner,
      status: 'Open',
      due_date: PROGRAMME.targetEnd,
    }),
  );

  return created > 0
    || missingTasks.length > 0
    || shared.projects.filter((item) => item.programme_code === PROGRAMME_CODE).length < MILESTONE_BLUEPRINTS.length
    || programmeBlocks.length < FARM_BLOCK_BLUEPRINTS.length;
}

function mergeBlueprints(shared) {
  const scheduledTasks = shared.tasks
    .filter((item) => (item.calendar_event_id || item.source === 'Production Calendar') && !item.parent_project_id && !item.archived_at)
    .sort((left, right) => String(left.planned_start || left.due_date).localeCompare(String(right.planned_start || right.due_date)));
  return {
    ...shared,
    tasks: scheduledTasks,
    scheduleSubtasks: shared.tasks.filter((item) => item.parent_project_id && !item.archived_at),
    projects: shared.projects
      .filter((item) => item.programme_code === PROGRAMME_CODE)
      .sort((left, right) => String(left.milestone_code).localeCompare(String(right.milestone_code))),
    blocks: shared.blocks
      .filter((item) => item.programme_code === PROGRAMME_CODE)
      .sort((left, right) => String(left.block_code).localeCompare(String(right.block_code), undefined, { numeric: true })),
    logs: shared.logs.filter((item) => item.programme_code === PROGRAMME_CODE),
    financeRecords: shared.financeRecords.filter((item) => item.programme_code === PROGRAMME_CODE && item.record_type === 'programme_budget'),
    harvests: shared.harvests.filter((item) => item.programme_code === PROGRAMME_CODE),
    risks: shared.risks.filter((item) => item.programme_code === PROGRAMME_CODE),
  };
}

export default function DailyRoutineCheck() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fieldDialog = useRef(null);
  const harvestDialog = useRef(null);
  const initialized = useRef(false);
  const [view, setView] = useState('dashboard');
  const [shared, setShared] = useState(() => mergeBlueprints(Object.fromEntries(entityLists.map(([key]) => [key, []]))));
  const [logType, setLogType] = useState('Nutrition');
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Connecting to farm operations');
  const [busyKey, setBusyKey] = useState('');
  const [showNewMasterTask, setShowNewMasterTask] = useState(false);
  const [newMasterTask, setNewMasterTask] = useState({ title: '', owner_name: '', start_date: TODAY, due_date: '', priority: 'Medium', success_criteria: '' });
  const [showNewFarmLand, setShowNewFarmLand] = useState(false);
  const [newFarmLand, setNewFarmLand] = useState({ name: 'Farm Land C', code: 'C', variety: 'Kent' });
  const [scheduleFilter, setScheduleFilter] = useState({ period: 'all', status: 'all', search: '', start: '', end: '' });

  const reload = useCallback(async ({ seed = false, silent = false } = {}) => {
    if (!silent) setLoading(true);
    setSyncStatus('Loading shared farm records');
    try {
      let data = await loadSharedData();
      if (seed) {
        setSyncStatus('Setting up farm lands and programme records');
        await seedProgramme(data, setSyncStatus);
        data = await loadSharedData();
      }
      setShared(mergeBlueprints(data));
      setSyncStatus('All programme records are synchronized');
    } catch (error) {
      setShared((current) => mergeBlueprints(current));
      setSyncStatus('Programme loaded with local blueprint data');
      toast({
        title: 'Some shared records could not be synchronized',
        description: error.message || 'Check your connection and permissions, then retry.',
        variant: 'destructive',
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    reload({ seed: true });
  }, [reload]);

  useEffect(() => {
    let timer;
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = window.setTimeout(() => reload({ silent: true }), 160);
    }, ['CalendarEvent', 'FarmProject', 'FarmTask', 'DailyActivity', 'FarmProcessLog', 'WeatherLog']);
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [reload]);

  const phases = useMemo(() => [...new Set(shared.tasks.map((item) => item.phase_name).filter(Boolean))], [shared.tasks]);

  const allScheduleProjects = useMemo(() => summarizeScheduleProjects(shared.projects, shared.scheduleSubtasks || []), [shared.projects, shared.scheduleSubtasks]);
  const scheduleProjects = useMemo(() => allScheduleProjects.filter((item) => item.is_enabled !== false), [allScheduleProjects]);
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
    if (search && !`${project.title} ${project.owner_name} ${project.milestone_code}`.toLowerCase().includes(search)) return false;
    if (scheduleFilter.status !== 'all' && normalizedStatus(project.status) !== scheduleFilter.status) return false;
    const linked = (shared.scheduleSubtasks || []).filter((item) => item.parent_project_id === project.id);
    const dates = [project.start_date, project.due_date, ...linked.flatMap((item) => [item.planned_start_at || item.planned_start, item.completion_due_at || item.due_date])].filter(Boolean).map((value) => new Date(value));
    if (filterRange.start && dates.length && !dates.some((value) => value >= filterRange.start && value <= filterRange.end)) return false;
    return !(filterRange.end && dates.length && !dates.some((value) => value <= filterRange.end));
  }), [allScheduleProjects, filterRange, scheduleFilter, shared.scheduleSubtasks]);
  const filteredSummary = useMemo(() => ({
    total: filteredScheduleProjects.length,
    active: filteredScheduleProjects.filter((item) => normalizedStatus(item.status) === 'in_progress').length,
    completed: filteredScheduleProjects.filter((item) => normalizedStatus(item.status) === 'completed').length,
    overdue: filteredScheduleProjects.filter((item) => item.overdue || isOverdue(item)).length,
    progress: Math.round(filteredScheduleProjects.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / (filteredScheduleProjects.length || 1)),
  }), [filteredScheduleProjects]);

  const metrics = useMemo(() => {
    const total = scheduleProjects.length;
    const completed = scheduleProjects.filter((item) => normalizedStatus(item.status) === 'completed').length;
    const active = scheduleProjects.filter((item) => normalizedStatus(item.status) === 'in_progress').length;
    const overdue = scheduleProjects.filter((item) => item.overdue || isOverdue(item)).length;
    const progress = Math.round(scheduleProjects.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / (total || 1));
    return { total, completed, active, overdue, progress, subtasks: (shared.scheduleSubtasks || []).length, disabled: allScheduleProjects.length - total };
  }, [scheduleProjects, shared.scheduleSubtasks, allScheduleProjects.length]);

  const phaseProgress = useMemo(() => phases.map((name) => {
    const tasks = shared.tasks.filter((item) => item.phase_name === name);
    return {
      name,
      count: tasks.length,
      progress: Math.round(tasks.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / (tasks.length || 1)),
    };
  }), [phases, shared.tasks]);

  const finance = useMemo(() => summarizeBudgetHarvest(shared.financeRecords, shared.harvests), [shared.financeRecords, shared.harvests]);

  const farmLands = useMemo(() => {
    const lands = new Map(FARM_LAND_BLUEPRINTS.map((land) => [land.code, land]));
    shared.blocks.forEach((block) => {
      const code = String(block.block_code || '').match(/^([A-Z]+)/i)?.[1]?.toUpperCase();
      if (!code) return;
      const defaultLand = lands.get(code)?.name || `Farm Land ${code}`;
      lands.set(code, { code, name: block.farm_name || defaultLand });
    });
    return [...lands.values()].sort((left, right) => left.code.localeCompare(right.code));
  }, [shared.blocks]);

  const setTaskLocally = (next) => {
    setShared((current) => ({
      ...current,
      tasks: current.tasks.map((item) => item.task_code === next.task_code ? { ...item, ...next } : item),
    }));
  };

  const syncTaskActivity = async (task, changes) => {
    const status = normalizedStatus(changes.status ?? task.status);
    const progress = Number(changes.progress_percent ?? task.progress_percent ?? 0);
    const activityPayload = {
      programme_code: PROGRAMME_CODE,
      source: 'Daily Routine Check',
      routine_task_id: task.id,
      routine_task_code: task.task_code,
      activity_code: `DA-${task.task_code}`,
      farm_id: task.farm_id || '',
      farm_name: task.farm_name || PROGRAMME.name,
      activity_date: task.calendar_event_id ? String(task.planned_start || task.due_date || TODAY).slice(0, 10) : TODAY,
      start_time: task.calendar_event_id ? String(task.planned_start || '').slice(11, 16) : '',
      end_time: task.calendar_event_id ? String(task.due_date || '').slice(11, 16) : '',
      title: task.title,
      activity_title: task.title,
      category: task.phase_name?.replace(/^\d+\.\s*/, '') || 'Farm Operations',
      assigned_workers: task.assigned_to_name,
      supervisor_name: task.assigned_to_name,
      status: statusForActivity(status),
      progress_percent: progress,
      notes: task.comments || task.description,
    };
    const existing = shared.activities.find((item) => item.routine_task_code === task.task_code || (task.calendar_event_id && item.calendar_event_id === task.calendar_event_id));
    const activity = existing
      ? await base44.entities.DailyActivity.update(existing.id, activityPayload)
      : status !== 'not_started'
        ? await base44.entities.DailyActivity.create(activityPayload)
        : null;

    const related = [
      base44.entities.FarmProcessLog.create({
        programme_code: PROGRAMME_CODE,
        source: 'Daily Routine Check',
        log_code: code('FPL'),
        farm_id: task.farm_id || '',
        farm_name: task.farm_name || PROGRAMME.name,
        phase: 'crop_management',
        activity_title: task.title,
        performed_by_name: task.assigned_to_name,
        role_or_team: task.assigned_to_name,
        activity_date: TODAY,
        status,
        progress_percent: progress,
        notes: `${task.task_code} updated to ${STATUS_LABELS[status]} at ${progress}%.`,
        recorded_at: new Date().toISOString(),
      }),
      base44.entities.AuditLog.create({
        programme_code: PROGRAMME_CODE,
        source: 'Daily Routine Check',
        log_code: code('AUD'),
        action: 'Routine progress updated',
        record_type: 'FarmTask',
        record_code: task.task_code,
        performed_by: 'Farm operations user',
        event_date: TODAY,
        comment: `${STATUS_LABELS[status]} · ${progress}% complete`,
      }),
    ];
    if (status === 'completed' && !shared.activities.some((item) => item.routine_task_code === task.task_code && item.status === 'Completed')) {
      related.push(base44.entities.DailyReport.create({
        programme_code: PROGRAMME_CODE,
        source: 'Daily Routine Check',
        report_code: code('DR'),
        farm_id: task.farm_id || '',
        farm_name: task.farm_name || PROGRAMME.name,
        report_date: TODAY,
        supervisor: task.assigned_to_name,
        activities_completed: 1,
        activities_pending: 0,
        tomorrow_plan: task.deliverable,
        status: 'Recorded',
        routine_task_code: task.task_code,
      }));
    }
    if (['completed', 'blocked'].includes(status)) {
      related.push(base44.entities.Notification.create({
        title: status === 'completed' ? 'Routine activity completed' : 'Routine activity blocked',
        message: `${task.task_code}: ${task.title}`,
        type: 'farm_operations',
        notification_type: 'farm_operations',
        channel: 'Admin',
        status: 'new',
      }));
    }
    await Promise.allSettled(related);
    if (activity) {
      setShared((current) => ({
        ...current,
        activities: existing
          ? current.activities.map((item) => item.id === activity.id ? activity : item)
          : [activity, ...current.activities],
      }));
    }
  };

  const updateTask = async (task, changes) => {
    setBusyKey(task.task_code);
    const progress = changes.status === 'completed' ? 100 : Number(changes.progress_percent ?? task.progress_percent ?? 0);
    const status = progress === 100
      ? 'completed'
      : changes.status
        ? normalizedStatus(changes.status)
        : progress > 0 && normalizedStatus(task.status) === 'not_started'
          ? 'in_progress'
          : normalizedStatus(task.status);
    try {
      const payload = { ...changes, status, progress_percent: progress, updated_from: 'Daily Routine Check' };
      const stored = task.id
        ? await base44.entities.FarmTask.update(task.id, payload)
        : await base44.entities.FarmTask.create({ ...task, ...payload, programme_code: PROGRAMME_CODE, source: 'Daily Routine Check' });
      const next = { ...task, ...stored, ...payload };
      setTaskLocally(next);
      if (task.calendar_event_id) {
        await base44.entities.CalendarEvent.update(task.calendar_event_id, {
          status: taskStatusToCalendar(status),
          progress_percent: progress,
          updated_from: 'Daily Routine Check',
        });
      }
      await syncTaskActivity(next, payload);
      toast({ title: `${task.task_code} synchronized`, description: `${STATUS_LABELS[status]} · ${progress}% complete` });
    } catch (error) {
      toast({ title: 'Routine update failed', description: error.message, variant: 'destructive' });
    } finally {
      setBusyKey('');
    }
  };

  const updateProject = async (project, changes) => {
    setBusyKey(project.project_code);
    try {
      const progress = changes.status === 'completed' ? 100 : Number(changes.progress_percent ?? project.progress_percent ?? 0);
      const status = progress === 100 ? 'completed' : normalizedStatus(changes.status ?? project.status);
      const updated = await base44.entities.FarmProject.update(project.id, {
        ...changes,
        status,
        progress_percent: progress,
        rag: status === 'completed' ? 'GREEN' : status === 'blocked' ? 'RED' : 'AMBER',
      });
      setShared((current) => ({ ...current, projects: current.projects.map((item) => item.id === updated.id ? updated : item) }));
      toast({ title: `${project.milestone_code} synchronized` });
    } catch (error) {
      toast({ title: 'Milestone update failed', description: error.message, variant: 'destructive' });
    } finally {
      setBusyKey('');
    }
  };

  const toggleProjectEnabled = async (project) => {
    const isEnabled = project.is_enabled === false;
    setBusyKey(project.id);
    try {
      const updated = await base44.entities.FarmProject.update(project.id, {
        is_enabled: isEnabled,
        updated_from: 'Master Schedule seasonal activation',
      });
      setShared((current) => ({ ...current, projects: current.projects.map((item) => item.id === updated.id ? updated : item) }));
      toast({ title: isEnabled ? 'Task enabled' : 'Task turned off', description: isEnabled ? 'It is now included in live dashboard tracking.' : 'It remains in the schedule but is excluded from live dashboard tracking.' });
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
      setShared((current) => ({ ...current, projects: [...current.projects, created] }));
      setShowNewMasterTask(false);
      setNewMasterTask({ title: '', owner_name: '', start_date: TODAY, due_date: '', priority: 'Medium', success_criteria: '' });
      toast({ title: 'Master task created', description: 'Add its checklist and field updates from the task workspace.' });
      navigate(`/admin/daily-routine-check/master-schedule/${encodeURIComponent(created.id)}`);
    } catch (error) {
      toast({ title: 'Master task could not be created', description: error.message, variant: 'destructive' });
    } finally {
      setBusyKey('');
    }
  };

  const updateBlock = async (block, changes) => {
    setBusyKey(block.block_code);
    try {
      const updated = await base44.entities.FarmBlock.update(block.id, changes);
      setShared((current) => ({ ...current, blocks: current.blocks.map((item) => item.id === updated.id ? updated : item) }));
      toast({ title: `${block.block_code} synchronized` });
    } catch (error) {
      toast({ title: 'Block update failed', description: error.message, variant: 'destructive' });
    } finally {
      setBusyKey('');
    }
  };

  const createFarmLand = async (event) => {
    event.preventDefault();
    const code = newFarmLand.code.trim().toUpperCase();
    const name = newFarmLand.name.trim();
    if (!/^[A-Z]+$/.test(code) || !name) {
      toast({ title: 'Enter a land name and letters for its section prefix', variant: 'destructive' });
      return;
    }
    if (farmLands.some((land) => land.code === code || land.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: 'This farm land already exists', variant: 'destructive' });
      return;
    }
    setBusyKey('new-farm-land');
    try {
      const farm = shared.farms[0];
      const created = await base44.entities.FarmBlock.create({
        farm_id: farm?.id || '',
        farm_name: name,
        programme_code: PROGRAMME_CODE,
        source: 'Daily Routine Check',
        block_code: `${code}1`,
        code: `${code}1`,
        name: `Block ${code}1`,
        variety: newFarmLand.variety,
        early_harvest: false,
        shoot_maturity: 0,
        forecast_yield_kg: 0,
        fruit_fly_pressure: 'Low',
        disease_rating: 'Low',
        status: 'active',
      });
      setShared((current) => ({ ...current, blocks: [...current.blocks, created] }));
      setShowNewFarmLand(false);
      setNewFarmLand({ name: `Farm Land ${String.fromCharCode(code.charCodeAt(0) + 1)}`, code: String.fromCharCode(code.charCodeAt(0) + 1), variety: 'Kent' });
      toast({ title: `${name} created`, description: `${code}1 is ready for field records.` });
    } catch (error) {
      toast({ title: 'Farm land could not be created', description: error.message, variant: 'destructive' });
    } finally {
      setBusyKey('');
    }
  };

  const createBlock = async (land) => {
    const blockNumbers = shared.blocks
      .map((block) => String(block.block_code || '').match(new RegExp(`^${land.code}(\\d+)$`, 'i'))?.[1])
      .filter(Boolean)
      .map(Number);
    const blockCode = `${land.code}${Math.max(0, ...blockNumbers) + 1}`;
    setBusyKey(`new-block-${land.code}`);
    try {
      const farm = shared.farms[0];
      const created = await base44.entities.FarmBlock.create({
        farm_id: farm?.id || '',
        farm_name: land.name,
        programme_code: PROGRAMME_CODE,
        source: 'Daily Routine Check',
        block_code: blockCode,
        code: blockCode,
        name: `Block ${blockCode}`,
        variety: 'Kent',
        early_harvest: false,
        shoot_maturity: 0,
        forecast_yield_kg: 0,
        fruit_fly_pressure: 'Low',
        disease_rating: 'Low',
        status: 'active',
      });
      setShared((current) => ({ ...current, blocks: [...current.blocks, created] }));
      toast({ title: `${blockCode} added to ${land.name}` });
    } catch (error) {
      toast({ title: 'Block could not be created', description: error.message, variant: 'destructive' });
    } finally {
      setBusyKey('');
    }
  };

  const updateBudget = async (record, actual) => {
    setBusyKey(record.id);
    try {
      const updated = await base44.entities.FarmFinanceRecord.update(record.id, {
        actual_amount: Math.max(0, Number(actual || 0)),
        status: Number(actual || 0) > 0 ? 'active' : 'planned',
      });
      setShared((current) => ({ ...current, financeRecords: current.financeRecords.map((item) => item.id === updated.id ? updated : item) }));
      toast({ title: 'Budget actual synchronized' });
    } catch (error) {
      toast({ title: 'Budget update failed', description: error.message, variant: 'destructive' });
    } finally {
      setBusyKey('');
    }
  };

  const updateRisk = async (risk, status) => {
    setBusyKey(risk.risk_code);
    try {
      const updated = await base44.entities.FarmComplianceRecord.update(risk.id, {
        status,
        completed_date: status === 'Closed' ? TODAY : '',
      });
      setShared((current) => ({ ...current, risks: current.risks.map((item) => item.id === updated.id ? updated : item) }));
      toast({ title: `${risk.risk_code} synchronized` });
    } catch (error) {
      toast({ title: 'Risk update failed', description: error.message, variant: 'destructive' });
    } finally {
      setBusyKey('');
    }
  };

  const addFieldLog = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusyKey('field-log');
    try {
      const block = shared.blocks.find((item) => item.id === form.get('block_id'));
      const payload = {
        programme_code: PROGRAMME_CODE,
        source: 'Daily Routine Check',
        log_code: code('FPL'),
        type: form.get('type'),
        log_type: form.get('type'),
        activity_date: form.get('entry_date'),
        entry_date: form.get('entry_date'),
        block_id: block?.id || '',
        block_name: block?.name || 'Farm-wide',
        farm_id: block?.farm_id || shared.farms[0]?.id || '',
        farm_name: block?.farm_name || shared.farms[0]?.name || PROGRAMME.name,
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
        await base44.entities.WeatherLog.create({
          programme_code: PROGRAMME_CODE,
          source: 'Daily Routine Check',
          weather_date: form.get('entry_date'),
          ...payload,
        }).catch(() => null);
      }
      setShared((current) => ({ ...current, logs: [created, ...current.logs] }));
      fieldDialog.current?.close();
      event.currentTarget.reset();
      toast({ title: 'Field evidence synchronized' });
    } catch (error) {
      toast({ title: 'Field entry failed', description: error.message, variant: 'destructive' });
    } finally {
      setBusyKey('');
    }
  };

  const addHarvest = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const harvestedKg = Number(form.get('harvested_kg'));
    const gradeAKg = Number(form.get('grade_a_kg'));
    if (gradeAKg > harvestedKg) {
      toast({ title: 'Grade A weight cannot exceed harvested weight', variant: 'destructive' });
      return;
    }
    setBusyKey('harvest');
    try {
      const block = shared.blocks.find((item) => item.id === form.get('block_id'));
      const lotCode = String(form.get('lot_code'));
      const payload = {
        programme_code: PROGRAMME_CODE,
        source: 'Daily Routine Check',
        harvest_code: code('HB'),
        harvest_date: form.get('harvest_date'),
        lot_code: lotCode,
        batch_number: lotCode,
        block_id: block?.id || '',
        block_name: block?.name || '',
        farm_id: block?.farm_id || shared.farms[0]?.id || '',
        farm_name: block?.farm_name || shared.farms[0]?.name || PROGRAMME.name,
        mango_variety: form.get('variety'),
        variety: form.get('variety'),
        quantity_harvested_kg: harvestedKg,
        grade_a_kg: gradeAKg,
        grade_b_kg: Math.max(0, harvestedKg - gradeAKg),
        rejected_kg: 0,
        price_per_kg: Number(form.get('price_per_kg')),
        buyer: form.get('buyer'),
        destination: 'Packhouse',
        qr_code: `QR-${lotCode}`,
        status: 'QC Pending',
      };
      const created = await base44.entities.HarvestBatch.create(payload);
      await Promise.allSettled([
        base44.entities.Harvest.create({
          ...payload,
          quantity_kg: harvestedKg,
          grade: 'Mixed',
          status: 'harvested',
        }),
        base44.entities.HarvestGrade.create({
          programme_code: PROGRAMME_CODE,
          batch_number: lotCode,
          grade: 'Grade A',
          quantity_kg: gradeAKg,
          destination: 'Export/Warehouse',
        }),
        base44.entities.HarvestGrade.create({
          programme_code: PROGRAMME_CODE,
          batch_number: lotCode,
          grade: 'Grade B',
          quantity_kg: Math.max(0, harvestedKg - gradeAKg),
          destination: 'Local Sales/Processing',
        }),
        base44.entities.QualityCheck.create({
          programme_code: PROGRAMME_CODE,
          qc_code: code('QC'),
          inspection_date: form.get('harvest_date'),
          batch_number: lotCode,
          block_id: block?.id || '',
          block_name: block?.name || '',
          total_quantity: harvestedKg,
          grade_a_kg: gradeAKg,
          grade_b_kg: Math.max(0, harvestedKg - gradeAKg),
          rejected_kg: 0,
          status: 'Pending',
          notes: 'Auto-created by Daily Routine Check.',
        }),
        base44.entities.StockMovement.create({
          programme_code: PROGRAMME_CODE,
          product_name: `${form.get('variety')} harvest ${lotCode}`,
          warehouse_name: 'Main Packhouse',
          movement_type: 'in',
          quantity: harvestedKg,
          movement_date: form.get('harvest_date'),
        }),
      ]);
      setShared((current) => ({ ...current, harvests: [created, ...current.harvests] }));
      harvestDialog.current?.close();
      event.currentTarget.reset();
      toast({ title: 'Harvest synchronized across operations' });
    } catch (error) {
      toast({ title: 'Harvest entry failed', description: error.message, variant: 'destructive' });
    } finally {
      setBusyKey('');
    }
  };

  const go = (next) => {
    setView(next);
    document.querySelector('.drc-page')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading && !shared.tasks.length) {
    return (
      <div className="drc-boot">
        <Loader2 className="drc-spin" />
        <strong>Preparing Daily Routine Check</strong>
        <span>{syncStatus}</span>
      </div>
    );
  }

  return (
    <div className="drc-page">
      <div className="drc-programme-bar">
        <div>
          <span className="drc-eyebrow">Daily Routine Check</span>
          <strong>2026–2027 Early Harvest Programme</strong>
        </div>
        <div className="drc-sync-state">
          {loading ? <Loader2 className="drc-spin" /> : <CheckCircle2 />}
          <span>{syncStatus}</span>
          <button type="button" onClick={() => reload()} disabled={loading} aria-label="Refresh programme">
            <RefreshCw />
          </button>
        </div>
      </div>

      <nav className="drc-view-nav" aria-label="Daily Routine Check sections">
        {VIEWS.map((item) => (
          <div key={item.id}>
            {item.group && <span>{item.group}</span>}
            <button type="button" className={view === item.id ? 'active' : ''} onClick={() => go(item.id)}>
              {item.label}
            </button>
          </div>
        ))}
      </nav>

      {view === 'dashboard' ? <ProgrammeOverviewView metrics={metrics} onOpenSchedule={() => go('milestones')} scheduleProjects={scheduleProjects} /> : null}

      {view === 'milestones' ? <MasterScheduleView busyKey={busyKey} createMasterTask={createMasterTask} filteredScheduleProjects={filteredScheduleProjects} filteredSummary={filteredSummary} newMasterTask={newMasterTask} scheduleFilter={scheduleFilter} setNewMasterTask={setNewMasterTask} setScheduleFilter={setScheduleFilter} setShowNewMasterTask={setShowNewMasterTask} showNewMasterTask={showNewMasterTask} toggleProjectEnabled={toggleProjectEnabled} /> : null}

      <section className={`drc-view ${view === 'blocks' ? 'active' : ''}`}>
        <PageHead eyebrow="Block management" title="Farm land sections" copy="Two farm lands in the same geographical area, each divided into five working sections with maturity and crop forecast controls." right={<button type="button" className="drc-primary gold" onClick={() => setShowNewFarmLand((current) => !current)}><Plus /> Add farm land</button>} />
        {showNewFarmLand && <form className="drc-farm-land-form" onSubmit={createFarmLand}>
          <label><span>Farm land name</span><input value={newFarmLand.name} onChange={(event) => setNewFarmLand((current) => ({ ...current, name: event.target.value }))} maxLength="100" required /></label>
          <label><span>Section prefix</span><input value={newFarmLand.code} onChange={(event) => setNewFarmLand((current) => ({ ...current, code: event.target.value.toUpperCase().replace(/[^A-Z]/g, '') }))} maxLength="3" required /></label>
          <label><span>First-block variety</span><select value={newFarmLand.variety} onChange={(event) => setNewFarmLand((current) => ({ ...current, variety: event.target.value }))}><option>Kent</option><option>Keitt</option><option>Black Pearl</option></select></label>
          <div className="drc-form-actions"><button type="button" className="drc-btn" onClick={() => setShowNewFarmLand(false)}>Cancel</button><button className="drc-primary" disabled={busyKey === 'new-farm-land'}>{busyKey === 'new-farm-land' ? <Loader2 className="drc-spin" /> : <Plus />} Create land and first block</button></div>
        </form>}
        <div className="drc-farm-lands">{farmLands.map((farmLand) => (
          <section className="drc-farm-land" key={farmLand.code}>
            <header><div><span>{farmLand.name}</span></div><button type="button" className="drc-btn drc-add-block" onClick={() => createBlock(farmLand)} disabled={busyKey === `new-block-${farmLand.code}`}>{busyKey === `new-block-${farmLand.code}` ? <Loader2 className="drc-spin" /> : <Plus />} Add block</button></header>
            <div className="drc-blocks">{shared.blocks.filter((block) => block.block_code?.startsWith(farmLand.code)).map((block) => (
          <article className="drc-block" key={block.id}>
            <div className="drc-block-top"><div>{block.block_code}</div><Pill value="GREEN" label={block.variety} /></div>
            <dl>
              <div><dt>Early block?</dt><dd><select className="drc-inline" value={block.early_harvest ? 'yes' : 'no'} onChange={(event) => updateBlock(block, { early_harvest: event.target.value === 'yes' })}><option value="yes">Yes</option><option value="no">No</option></select></dd></div>
              <div><dt>Acres</dt><dd><input type="number" min="0" defaultValue={block.acres || ''} onBlur={(event) => updateBlock(block, { acres: Number(event.target.value || 0) })} /></dd></div>
              <div><dt>Shoot maturity</dt><dd><input type="number" min="0" max="100" defaultValue={Number(block.shoot_maturity || 0)} onBlur={(event) => updateBlock(block, { shoot_maturity: Number(event.target.value) })} />%</dd></div>
              <div><dt>Forecast yield</dt><dd><input type="number" min="0" defaultValue={Number(block.forecast_yield_kg || 0)} onBlur={(event) => updateBlock(block, { forecast_yield_kg: Number(event.target.value) })} /> kg</dd></div>
            </dl>
            <Progress value={Number(block.shoot_maturity || 0)} />
            <div className="drc-block-foot"><span>Fruit fly: {block.fruit_fly_pressure || 'Low'}</span><span>Disease: {block.disease_rating || 'Low'}</span></div>
          </article>
            ))}</div>
          </section>
        ))}</div>
      </section>

      <section className={`drc-view ${view === 'logs' ? 'active' : ''}`}>
        <PageHead eyebrow="Operational evidence" title="Field logs" copy="Capture dated observations and interventions, tied to a block and responsible person." right={<button type="button" className="drc-primary gold" onClick={() => fieldDialog.current?.showModal()}><Plus /> New entry</button>} />
        <div className="drc-log-tabs">{LOG_TYPES.map((type) => <button type="button" key={type} className={logType === type ? 'active' : ''} onClick={() => setLogType(type)}>{type} · {shared.logs.filter((item) => (item.type || item.log_type) === type).length}</button>)}</div>
        <div className="drc-table-shell">
          {shared.logs.filter((item) => (item.type || item.log_type) === logType).length ? (
            <table className="drc-table">
              <thead><tr><th>Date</th><th>Block</th><th>Responsible</th><th>Observation / action</th><th>Result / follow-up</th></tr></thead>
              <tbody>{shared.logs.filter((item) => (item.type || item.log_type) === logType).map((log) => (
                <tr key={log.id}><td>{date(log.entry_date || log.activity_date)}</td><td>{log.block_name || 'Farm-wide'}</td><td>{log.owner || log.performed_by_name}</td><td>{log.activity_title || log.notes}</td><td>{log.result || '—'}</td></tr>
              ))}</tbody>
            </table>
          ) : <Empty title={`No ${logType.toLowerCase()} entries yet`} copy="The first dated record will appear here." action={<button type="button" className="drc-primary" onClick={() => fieldDialog.current?.showModal()}><Plus /> Add entry</button>} />}
        </div>
      </section>

      {view === 'finance' ? <BudgetHarvestView blocks={shared.blocks} busyKey={busyKey} finance={finance} financeRecords={shared.financeRecords} harvestDialog={harvestDialog} harvests={shared.harvests} onAddHarvest={addHarvest} onUpdateBudget={updateBudget} today={TODAY} /> : null}

      <section className={`drc-view ${view === 'risks' ? 'active' : ''}`}>
        <PageHead eyebrow="Risk register" title="Keep the early crop protected" copy="Prioritized agronomic, operational, compliance, weather and commercial threats." />
        <div className="drc-table-shell">
          <table className="drc-table">
            <thead><tr><th>ID</th><th>Risk</th><th>Category</th><th>Probability</th><th>Impact</th><th>RAG</th><th>Mitigation</th><th>Owner</th><th>Status</th></tr></thead>
            <tbody>{shared.risks.map((risk) => (
              <tr key={risk.id}><td>{risk.risk_code}</td><td className="drc-task-name"><b>{risk.requirement}</b></td><td>{risk.category}</td><td>{risk.probability}</td><td>{risk.impact}</td><td><Pill value={risk.rag} label={risk.rag} /></td><td>{risk.mitigation}</td><td>{risk.owner}</td><td><select className="drc-inline" value={risk.status || 'Open'} onChange={(event) => updateRisk(risk, event.target.value)}><option>Open</option><option>Monitoring</option><option>Closed</option></select></td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className={`drc-view ${view === 'sources' ? 'active' : ''}`}>
        <PageHead eyebrow="Planning basis" title="Sources and assumptions" copy="This schedule is a working agronomic control plan and must be adapted using field observations and qualified local advice." />
        <div className="drc-panel drc-sources">{SOURCE_NOTES.map((source) => (
          <div key={source.title}><b>{source.title}</b><p>{source.copy}</p>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">Open source ↗</a> : <span />}</div>
        ))}</div>
      </section>

      <footer className="drc-footer">JBA Green Gold Organic Farms · Daily Routine Check · Synchronized with platform operations</footer>

      <dialog className="drc-dialog" ref={fieldDialog}>
        <div className="drc-modal-head"><div><span className="drc-eyebrow">Operational evidence</span><h2>Add field entry</h2></div><button type="button" onClick={() => fieldDialog.current?.close()}>×</button></div>
        <form className="drc-form-grid" onSubmit={addFieldLog}>
          <Field label="Log type"><select name="type" required>{LOG_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
          <Field label="Date"><input name="entry_date" type="date" required defaultValue={TODAY} /></Field>
          <Field label="Block"><select name="block_id"><option value="">Farm-wide</option>{shared.blocks.map((block) => <option key={block.id} value={block.id}>{block.block_code} · {block.variety}</option>)}</select></Field>
          <Field label="Responsible person"><input name="owner" required minLength="2" maxLength="120" /></Field>
          <Field label="Observation / action" full><textarea name="notes" rows="4" required minLength="3" maxLength="4000" /></Field>
          <Field label="Result / follow-up" full><input name="result" maxLength="2000" /></Field>
          <div className="drc-form-actions"><button type="button" className="drc-btn" onClick={() => fieldDialog.current?.close()}>Cancel</button><button className="drc-primary" disabled={busyKey === 'field-log'}>{busyKey === 'field-log' ? <Loader2 className="drc-spin" /> : null} Save entry</button></div>
        </form>
      </dialog>

    </div>
  );
}

function PageHead({ eyebrow, title, copy, right }) {
  return <div className="drc-page-head"><div><span className="drc-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{right}</div>;
}

function Progress({ value, dark = false }) {
  return <div className={`drc-track ${dark ? 'dark' : ''}`}><div style={{ width: `${Math.max(0, Math.min(100, Number(value || 0)))}%` }} /></div>;
}

function Pill({ value, label }) {
  return <span className={`drc-pill ${value || ''}`}>{label || STATUS_LABELS[value] || value || '—'}</span>;
}

function Empty({ title, copy, action }) {
  return <div className="drc-empty"><CloudSun /><b>{title}</b><p>{copy}</p>{action}</div>;
}

function Field({ label, children, full = false }) {
  return <label className={`drc-field ${full ? 'full' : ''}`}><span>{label}</span>{children}</label>;
}
