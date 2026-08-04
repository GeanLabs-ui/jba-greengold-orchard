import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  CloudSun,
  CalendarDays,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sprout,
  Target,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { taskStatusToCalendar } from '@/lib/production-calendar';
import { useToast } from '@/components/ui/use-toast';
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
  { id: 'schedule', label: 'Master schedule' },
  { id: 'milestones', label: 'Milestones' },
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
];

const date = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const money = (value) => `GHS ${Number(value || 0).toLocaleString('en-GH', { maximumFractionDigits: 0 })}`;
const code = (prefix) => `${prefix}-${Date.now().toString().slice(-8)}`;
const normalizedStatus = (value) => {
  const next = String(value || 'not_started').trim().toLowerCase().replaceAll(' ', '_');
  return STATUS_LABELS[next] ? next : 'not_started';
};
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

  const knownBlocks = new Set(shared.blocks.filter((item) => item.programme_code === PROGRAMME_CODE).map((item) => item.block_code));
  await runBatches(
    Array.from({ length: 10 }, (_, index) => ({
      blockCode: `B${index + 1}`,
      variety: index < 4 ? 'Kent' : index < 7 ? 'Keitt' : 'Black Pearl',
      earlyHarvest: index < 3,
    })).filter((item) => !knownBlocks.has(item.blockCode)),
    (item) => base44.entities.FarmBlock.create({
      ...farmFields,
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
    || shared.blocks.filter((item) => item.programme_code === PROGRAMME_CODE).length < 10;
}

function mergeBlueprints(shared) {
  const storedTasks = new Map(shared.tasks.filter((item) => item.programme_code === PROGRAMME_CODE).map((item) => [item.task_code, item]));
  const programmeTasks = ROUTINE_TASK_BLUEPRINTS.map((blueprint) => {
    const taskCode = `DRC-${String(blueprint.wbs).padStart(3, '0')}`;
    return {
      ...blueprint,
      task_code: taskCode,
      phase_name: blueprint.phase,
      title: blueprint.activity,
      assigned_to_name: blueprint.owner,
      planned_start: blueprint.plannedStart,
      due_date: blueprint.plannedFinish,
      status: 'not_started',
      progress_percent: 0,
      ...(storedTasks.get(taskCode) || {}),
    };
  });
  const scheduledTasks = shared.tasks
    .filter((item) => item.calendar_event_id || item.source === 'Production Calendar')
    .sort((left, right) => String(left.planned_start || left.due_date).localeCompare(String(right.planned_start || right.due_date)));
  return {
    ...shared,
    tasks: [...programmeTasks, ...scheduledTasks],
    projects: shared.projects
      .filter((item) => item.programme_code === PROGRAMME_CODE)
      .sort((left, right) => String(left.milestone_code).localeCompare(String(right.milestone_code))),
    blocks: shared.blocks
      .filter((item) => item.programme_code === PROGRAMME_CODE)
      .sort((left, right) => Number(String(left.block_code).replace(/\D/g, '')) - Number(String(right.block_code).replace(/\D/g, ''))),
    logs: shared.logs.filter((item) => item.programme_code === PROGRAMME_CODE),
    financeRecords: shared.financeRecords.filter((item) => item.programme_code === PROGRAMME_CODE && item.record_type === 'programme_budget'),
    harvests: shared.harvests.filter((item) => item.programme_code === PROGRAMME_CODE),
    risks: shared.risks.filter((item) => item.programme_code === PROGRAMME_CODE),
  };
}

export default function DailyRoutineCheck() {
  const { toast } = useToast();
  const fieldDialog = useRef(null);
  const harvestDialog = useRef(null);
  const initialized = useRef(false);
  const [view, setView] = useState('dashboard');
  const [shared, setShared] = useState(() => mergeBlueprints(Object.fromEntries(entityLists.map(([key]) => [key, []]))));
  const [query, setQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [logType, setLogType] = useState('Nutrition');
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Connecting to farm operations');
  const [busyKey, setBusyKey] = useState('');

  const reload = useCallback(async ({ seed = false, silent = false } = {}) => {
    if (!silent) setLoading(true);
    setSyncStatus('Loading shared farm records');
    try {
      let data = await loadSharedData();
      if (seed) {
        setSyncStatus('Checking the 93-activity client programme');
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
    }, ['CalendarEvent', 'FarmTask', 'DailyActivity']);
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [reload]);

  const phases = useMemo(() => [...new Set(shared.tasks.map((item) => item.phase_name).filter(Boolean))], [shared.tasks]);
  const filteredTasks = useMemo(() => shared.tasks.filter((task) => {
    const text = [task.title, task.description, task.assigned_to_name, task.phase_name].join(' ').toLowerCase();
    return (!query || text.includes(query.toLowerCase()))
      && (!phaseFilter || task.phase_name === phaseFilter)
      && (!statusFilter || normalizedStatus(task.status) === statusFilter);
  }), [phaseFilter, query, shared.tasks, statusFilter]);

  const metrics = useMemo(() => {
    const total = shared.tasks.length;
    const completed = shared.tasks.filter((item) => normalizedStatus(item.status) === 'completed').length;
    const active = shared.tasks.filter((item) => normalizedStatus(item.status) === 'in_progress').length;
    const overdue = shared.tasks.filter((item) => (
      new Date(item.due_date) < PROGRAMME_TODAY
      && !['completed', 'deferred'].includes(normalizedStatus(item.status))
    )).length;
    const progress = Math.round(shared.tasks.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / (total || 1));
    return { total, completed, active, overdue, progress };
  }, [shared.tasks]);

  const phaseProgress = useMemo(() => phases.map((name) => {
    const tasks = shared.tasks.filter((item) => item.phase_name === name);
    return {
      name,
      count: tasks.length,
      progress: Math.round(tasks.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / (tasks.length || 1)),
    };
  }), [phases, shared.tasks]);

  const finance = useMemo(() => {
    const planned = shared.financeRecords.reduce((sum, item) => sum + Number(item.planned_amount || item.amount || 0), 0);
    const actual = shared.financeRecords.reduce((sum, item) => sum + Number(item.actual_amount || 0), 0);
    const kg = shared.harvests.reduce((sum, item) => sum + Number(item.quantity_harvested_kg || 0), 0);
    const gradeA = shared.harvests.reduce((sum, item) => sum + Number(item.grade_a_kg || 0), 0);
    const revenue = shared.harvests.reduce((sum, item) => sum + Number(item.quantity_harvested_kg || 0) * Number(item.price_per_kg || 0), 0);
    return { planned, actual, kg, gradePct: kg ? Math.round((gradeA / kg) * 100) : 0, revenue };
  }, [shared.financeRecords, shared.harvests]);

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
          <button type="button" onClick={() => reload({ seed: true })} disabled={loading} aria-label="Refresh programme">
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

      <section className={`drc-view ${view === 'dashboard' ? 'active' : ''}`}>
        <PageHead
          eyebrow="Executive overview"
          title="Early harvest control room"
          copy="One operating view for the agronomic, field and commercial work behind the April–May 2027 mango harvest."
          right={<div className="drc-date-chip"><b>20 Jul 2026 — 31 May 2027</b><span>Kent · Keitt · Black Pearl</span></div>}
        />
        <div className="drc-metrics">
          <Metric label="Total activities" value={metrics.total} note="Across 9 phases" icon={ClipboardCheck} />
          <Metric label="Completed" value={metrics.completed} note={`${Math.round((metrics.completed / (metrics.total || 1)) * 100)}% of programme`} icon={CheckCircle2} />
          <Metric label="In progress" value={metrics.active} note="Active field work" icon={Sprout} />
          <Metric label="Overdue" value={metrics.overdue} note="Incomplete past due date" icon={AlertTriangle} alert />
        </div>
        <div className="drc-dashboard-grid">
          <div className="drc-panel">
            <div className="drc-overall">
              <div><span>Overall project progress</span><strong>{metrics.progress}%</strong></div>
              <Progress value={metrics.progress} dark />
            </div>
            <PanelHead title="Progress by phase" copy="Weighted from activity completion values" action={<button type="button" className="drc-btn" onClick={() => go('schedule')}>View schedule</button>} />
            <div className="drc-panel-body drc-phase-list">
              {phaseProgress.map((phase) => (
                <div key={phase.name}>
                  <div className="drc-phase-meta"><b>{phase.name.replace(/^\d+\.\s*/, '')}</b><span>{phase.progress}% · {phase.count} tasks</span></div>
                  <Progress value={phase.progress} />
                </div>
              ))}
            </div>
          </div>
          <div className="drc-panel">
            <PanelHead title="Executive milestones" copy="Next programme control points" action={<button type="button" className="drc-btn" onClick={() => go('milestones')}>All 17</button>} />
            <div className="drc-panel-body drc-milestone-list">
              {shared.projects.slice(0, 6).map((milestone) => (
                <div className="drc-milestone" key={milestone.id}>
                  <i className={`drc-dot ${milestone.rag || 'RED'}`} />
                  <div><b>{milestone.title}</b><small>{date(milestone.due_date)} · {milestone.owner_name}</small></div>
                  <Pill value={normalizedStatus(milestone.status)} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="drc-focus">
          <div>
            <h3>Management focus: close harvest, restore canopy health</h3>
            <p>Complete final picking and sanitation, confirm early-harvest blocks, then protect mature terminals while recovery nutrition and irrigation servicing begin.</p>
          </div>
          <div><strong>{shared.tasks.filter((item) => item.priority === 'Critical' && normalizedStatus(item.status) !== 'completed').length}</strong><span>critical tasks</span></div>
        </div>
      </section>

      <section className={`drc-view ${view === 'schedule' ? 'active' : ''}`}>
        <PageHead eyebrow="Master project schedule" title="Programme and scheduled activities" copy="Search, filter and update field execution. Calendar activities stay synchronized with Farm Daily Activities and the wider platform." right={<Link className="drc-primary" to="/admin/calendar"><CalendarDays />Open calendar</Link>} />
        <div className="drc-toolbar">
          <label className="drc-search"><Search /><input placeholder="Search activity, phase or owner" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <select value={phaseFilter} onChange={(event) => setPhaseFilter(event.target.value)}>
            <option value="">All phases</option>
            {phases.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
          </select>
        </div>
        <div className="drc-table-shell">
          <table className="drc-table">
            <thead><tr><th>WBS</th><th>Activity</th><th>Dates</th><th>Owner</th><th>Priority</th><th>Status</th><th>Complete</th></tr></thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.task_code} className={new Date(task.due_date) < PROGRAMME_TODAY && !['completed', 'deferred'].includes(normalizedStatus(task.status)) ? 'overdue' : ''}>
                  <td>{task.wbs}</td>
                  <td className="drc-task-name"><b>{task.title}</b><small>{task.description}</small></td>
                  <td>{date(task.planned_start)}<br /><span>to {date(task.due_date)}</span></td>
                  <td>{task.assigned_to_name}</td>
                  <td><Pill value={task.priority === 'Critical' ? 'RED' : 'AMBER'} label={task.priority} /></td>
                  <td>
                    <select
                      className="drc-inline"
                      value={normalizedStatus(task.status)}
                      onChange={(event) => updateTask(task, { status: event.target.value })}
                      disabled={busyKey === task.task_code}
                    >
                      {STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                    </select>
                  </td>
                  <td className="drc-progress-cell">
                    <input
                      className="drc-inline"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={Number(task.progress_percent || 0)}
                      onBlur={(event) => Number(event.target.value) !== Number(task.progress_percent || 0) && updateTask(task, { progress_percent: Number(event.target.value) })}
                      disabled={busyKey === task.task_code}
                    />%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="drc-count-note"><span>Showing {filteredTasks.length} of {shared.tasks.length} activities</span><span>Changes are synchronized and audited</span></div>
      </section>

      <section className={`drc-view ${view === 'milestones' ? 'active' : ''}`}>
        <PageHead eyebrow="Executive milestones" title="Decision gates and outcomes" copy="Review dates, ownership and acceptance criteria at the weekly management meeting." />
        <div className="drc-table-shell">
          <table className="drc-table">
            <thead><tr><th>ID</th><th>Milestone</th><th>Window</th><th>Owner</th><th>Success criteria</th><th>Status</th><th>Complete</th></tr></thead>
            <tbody>{shared.projects.map((milestone) => (
              <tr key={milestone.id}>
                <td>{milestone.milestone_code}</td>
                <td className="drc-task-name"><b>{milestone.title}</b></td>
                <td>{date(milestone.start_date)}<br />to {date(milestone.due_date)}</td>
                <td>{milestone.owner_name}</td>
                <td>{milestone.success_criteria}</td>
                <td><select className="drc-inline" value={normalizedStatus(milestone.status)} onChange={(event) => updateProject(milestone, { status: event.target.value })}>{STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></td>
                <td className="drc-progress-cell"><input className="drc-inline" type="number" min="0" max="100" defaultValue={Number(milestone.progress_percent || 0)} onBlur={(event) => Number(event.target.value) !== Number(milestone.progress_percent || 0) && updateProject(milestone, { progress_percent: Number(event.target.value) })} />%</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className={`drc-view ${view === 'blocks' ? 'active' : ''}`}>
        <PageHead eyebrow="Block management" title="Variety performance by block" copy="Ten working blocks for Kent, Keitt and Black Pearl, with maturity and crop forecast controls." />
        <div className="drc-blocks">{shared.blocks.map((block) => (
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

      <section className={`drc-view ${view === 'finance' ? 'active' : ''}`}>
        <PageHead eyebrow="Commercial control" title="Budget and harvest returns" copy="Track planned versus actual spend, then calculate Grade A yield and sales revenue automatically." right={<button type="button" className="drc-primary gold" onClick={() => harvestDialog.current?.showModal()}><Plus /> Record harvest</button>} />
        <div className="drc-finance-grid">
          <div className="drc-table-shell">
            <table className="drc-table">
              <thead><tr><th>Cost category</th><th>Planned</th><th>Actual</th><th>Variance</th></tr></thead>
              <tbody>{shared.financeRecords.map((record) => {
                const planned = Number(record.planned_amount || record.amount || 0);
                const actual = Number(record.actual_amount || 0);
                return <tr key={record.id}><td><b>{record.category}</b></td><td>{money(planned)}</td><td><input className="drc-inline drc-money" type="number" min="0" defaultValue={actual} onBlur={(event) => Number(event.target.value) !== actual && updateBudget(record, event.target.value)} /></td><td className={planned - actual < 0 ? 'negative' : 'positive'}>{money(planned - actual)}</td></tr>;
              })}</tbody>
            </table>
          </div>
          <aside className="drc-finance-summary">
            <span>Remaining budget</span><strong>{money(finance.planned - finance.actual)}</strong>
            <FinanceRow label="Planned" value={money(finance.planned)} icon={Target} />
            <FinanceRow label="Actual" value={money(finance.actual)} icon={CircleDollarSign} />
            <FinanceRow label="Harvested" value={`${finance.kg.toLocaleString()} kg`} icon={Sprout} />
            <FinanceRow label="Grade A" value={`${finance.gradePct}%`} icon={CheckCircle2} />
            <FinanceRow label="Revenue" value={money(finance.revenue)} icon={CircleDollarSign} />
          </aside>
        </div>
        <div className="drc-panel drc-harvest-panel">
          <PanelHead title="Harvest & packhouse log" copy="Grade percentage and revenue are calculated from each lot" />
          <div className="drc-table-shell flat">{shared.harvests.length ? (
            <table className="drc-table">
              <thead><tr><th>Date</th><th>Lot</th><th>Block</th><th>Variety</th><th>Harvested</th><th>Grade A</th><th>Grade A %</th><th>Buyer</th><th>Revenue</th></tr></thead>
              <tbody>{shared.harvests.map((harvest) => {
                const harvested = Number(harvest.quantity_harvested_kg || 0);
                const gradeA = Number(harvest.grade_a_kg || 0);
                return <tr key={harvest.id}><td>{date(harvest.harvest_date)}</td><td>{harvest.lot_code || harvest.batch_number}</td><td>{harvest.block_name}</td><td>{harvest.variety || harvest.mango_variety}</td><td>{harvested} kg</td><td>{gradeA} kg</td><td>{harvested ? Math.round((gradeA / harvested) * 100) : 0}%</td><td>{harvest.buyer}</td><td>{money(harvested * Number(harvest.price_per_kg || 0))}</td></tr>;
              })}</tbody>
            </table>
          ) : <Empty title="No harvest lots recorded" copy="Grade A performance and revenue will appear here." />}</div>
        </div>
      </section>

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

      <dialog className="drc-dialog" ref={harvestDialog}>
        <div className="drc-modal-head"><div><span className="drc-eyebrow">Commercial control</span><h2>Record harvest lot</h2></div><button type="button" onClick={() => harvestDialog.current?.close()}>×</button></div>
        <form className="drc-form-grid" onSubmit={addHarvest}>
          <Field label="Harvest date"><input name="harvest_date" type="date" required defaultValue={TODAY} /></Field>
          <Field label="Block"><select name="block_id" required>{shared.blocks.map((block) => <option key={block.id} value={block.id}>{block.block_code} · {block.variety}</option>)}</select></Field>
          <Field label="Variety"><select name="variety"><option>Kent</option><option>Keitt</option><option>Black Pearl</option></select></Field>
          <Field label="Lot code"><input name="lot_code" required maxLength="80" /></Field>
          <Field label="Harvested kg"><input name="harvested_kg" type="number" min="0.01" step="0.01" required /></Field>
          <Field label="Grade A kg"><input name="grade_a_kg" type="number" min="0" step="0.01" required /></Field>
          <Field label="Price per kg (GHS)"><input name="price_per_kg" type="number" min="0" step="0.01" required /></Field>
          <Field label="Buyer"><input name="buyer" required maxLength="180" /></Field>
          <div className="drc-form-actions"><button type="button" className="drc-btn" onClick={() => harvestDialog.current?.close()}>Cancel</button><button className="drc-primary" disabled={busyKey === 'harvest'}>{busyKey === 'harvest' ? <Loader2 className="drc-spin" /> : null} Save harvest</button></div>
        </form>
      </dialog>
    </div>
  );
}

function PageHead({ eyebrow, title, copy, right }) {
  return <div className="drc-page-head"><div><span className="drc-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{right}</div>;
}

function Metric({ label, value, note, icon: Icon, alert = false }) {
  return <div className={`drc-metric ${alert ? 'alert' : ''}`}><div><span>{label}</span><Icon /></div><strong>{value}</strong><small>{note}</small></div>;
}

function PanelHead({ title, copy, action }) {
  return <div className="drc-panel-head"><div><h2>{title}</h2><p>{copy}</p></div>{action}</div>;
}

function Progress({ value, dark = false }) {
  return <div className={`drc-track ${dark ? 'dark' : ''}`}><div style={{ width: `${Math.max(0, Math.min(100, Number(value || 0)))}%` }} /></div>;
}

function Pill({ value, label }) {
  return <span className={`drc-pill ${value || ''}`}>{label || STATUS_LABELS[value] || value || '—'}</span>;
}

function FinanceRow({ label, value, icon: Icon }) {
  return <div className="drc-finance-row"><Icon /><span>{label}</span><b>{value}</b></div>;
}

function Empty({ title, copy, action }) {
  return <div className="drc-empty"><CloudSun /><b>{title}</b><p>{copy}</p>{action}</div>;
}

function Field({ label, children, full = false }) {
  return <label className={`drc-field ${full ? 'full' : ''}`}><span>{label}</span>{children}</label>;
}
