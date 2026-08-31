import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  LandPlot,
  Leaf,
  List,
  PackageCheck,
  Pickaxe,
  Scissors,
  Sprout,
  UserRoundCheck,
} from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import PageSkeleton from '@/components/shared/PageSkeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate, formatNumber } from '@/components/shared/format';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/shared/DataTable';
import HarvestCalendar from '@/components/harvest/HarvestCalendar';
import AdminCreateDialog from '@/components/admin/AdminCreateDialog';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';

const phases = [
  {
    key: 'land_clearing',
    label: 'Land Clearing',
    shortLabel: 'Clearing',
    icon: LandPlot,
    description: 'Clearing, ploughing, mapping, soil checks, and field preparation.',
  },
  {
    key: 'seedling',
    label: 'Seedling',
    shortLabel: 'Seedling',
    icon: Sprout,
    description: 'Nursery work, seedling health, watering, grafting, and hardening.',
  },
  {
    key: 'transplanting',
    label: 'Transplanting',
    shortLabel: 'Transplant',
    icon: Leaf,
    description: 'Field planting, spacing, staking, first irrigation, and survival checks.',
  },
  {
    key: 'crop_management',
    label: 'Crop Management',
    shortLabel: 'Management',
    icon: ClipboardList,
    description: 'Irrigation, pruning, fertilizer, pest control, labor, and field observations.',
  },
  {
    key: 'harvest',
    label: 'Harvest',
    shortLabel: 'Harvest',
    icon: Scissors,
    description: 'Picking, grading, weighing, batching, and field-to-packhouse transfer.',
  },
  {
    key: 'post_harvest',
    label: 'Post Harvest',
    shortLabel: 'Post Harvest',
    icon: PackageCheck,
    description: 'Sorting, washing, packing, cold chain, dispatch, storage, and losses.',
  },
];

const phaseOptions = phases.map((phase) => ({ value: phase.key, label: phase.label }));

const logFields = [
  {
    name: 'phase',
    label: 'Phase',
    type: 'select',
    defaultValue: 'land_clearing',
    options: phaseOptions,
    required: true,
  },
  { name: 'farm_name', label: 'Farm', required: true },
  { name: 'block_name', label: 'Block / Plot' },
  { name: 'activity_title', label: 'Activity', required: true },
  { name: 'performed_by_name', label: 'Who Is Doing It', required: true },
  { name: 'role_or_team', label: 'Role / Team' },
  { name: 'activity_date', label: 'Date', type: 'date', required: true },
  { name: 'start_time', label: 'Start Time', type: 'time' },
  { name: 'end_time', label: 'End Time', type: 'time' },
  { name: 'quantity', label: 'Quantity', type: 'number' },
  { name: 'unit_of_measure', label: 'Unit', placeholder: 'acres, seedlings, kg' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    defaultValue: 'in_progress',
    options: [
      { value: 'planned', label: 'Planned' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'blocked', label: 'Blocked' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
];

const harvestFields = [
  { name: 'farm_name', label: 'Farm', required: true },
  { name: 'harvest_date', label: 'Harvest Date', type: 'date', required: true },
  { name: 'harvest_season', label: 'Season' },
  { name: 'total_quantity', label: 'Quantity (kg)', type: 'number', required: true },
  { name: 'quality_grade', label: 'Quality Grade', defaultValue: 'Premium' },
  { name: 'team_lead', label: 'Team Lead' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    defaultValue: 'in_progress',
    options: [
      { value: 'planned', label: 'Planned' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
];

const codeField = {
  FarmTask: 'task_code',
  CropPlan: 'plan_code',
  FarmProject: 'project_code',
};

const processCodePrefix = {
  FarmTask: 'FT',
  CropPlan: 'CP',
  FarmProject: 'FP',
};

const asNumber = (value) => Number(value || 0);

const makeCode = (prefix) => `${prefix}-${Date.now().toString().slice(-6)}`;

const makeEntityCode = (entityName) => `${processCodePrefix[entityName] || 'FM'}-${Date.now().toString().slice(-6)}`;

const displayDateTime = (date, time) => {
  if (!date && !time) return '';
  return `${formatDate(date)}${time ? `, ${time}` : ''}`;
};

const phaseProgress = (logs, phaseKey) => {
  const phaseLogs = logs.filter((log) => log.phase === phaseKey);
  if (phaseLogs.length === 0) return 0;
  const completed = phaseLogs.filter((log) => log.status === 'completed').length;
  return Math.round((completed / phaseLogs.length) * 100);
};

const buildProcessFields = (type, farmOptions, blockOptions) => {
  const farmSelect = {
    name: 'farm_id',
    label: 'Farm',
    type: 'select',
    required: true,
    defaultValue: farmOptions[0]?.value,
    options: farmOptions,
  };
  const blockSelect = {
    name: 'block_id',
    label: 'Block',
    type: 'select',
    defaultValue: blockOptions[0]?.value,
    options: blockOptions,
  };

  const fieldSets = {
    tasks: [
      farmSelect,
      blockSelect,
      { name: 'title', label: 'Task Title', required: true },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        defaultValue: 'general',
        options: [
          { value: 'irrigation', label: 'Irrigation' },
          { value: 'planting', label: 'Planting' },
          { value: 'harvest', label: 'Harvest' },
          { value: 'pest_control', label: 'Pest Control' },
          { value: 'fertilizer', label: 'Fertilizer' },
          { value: 'maintenance', label: 'Maintenance' },
          { value: 'general', label: 'General' },
        ],
      },
      {
        name: 'priority',
        label: 'Priority',
        type: 'select',
        defaultValue: 'medium',
        options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'urgent', label: 'Urgent' },
        ],
      },
      { name: 'assigned_to_name', label: 'Assigned To' },
      { name: 'due_date', label: 'Due Date', type: 'date' },
      { name: 'weather_trigger', label: 'Weather Trigger' },
      { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    'crop-plans': [
      farmSelect,
      blockSelect,
      { name: 'crop_variety', label: 'Crop Variety', required: true },
      { name: 'season', label: 'Season', required: true },
      { name: 'planting_date', label: 'Planting Date', type: 'date' },
      { name: 'expected_harvest_start', label: 'Expected Harvest Start', type: 'date' },
      { name: 'expected_harvest_end', label: 'Expected Harvest End', type: 'date' },
      { name: 'target_yield_kg', label: 'Target Yield (kg)', type: 'number' },
      { name: 'budget_amount', label: 'Budget', type: 'number' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        defaultValue: 'planned',
        options: [
          { value: 'planned', label: 'Planned' },
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
      },
    ],
    projects: [
      farmSelect,
      { name: 'title', label: 'Project Title', required: true },
      { name: 'project_type', label: 'Project Type', defaultValue: 'infrastructure' },
      { name: 'start_date', label: 'Start Date', type: 'date' },
      { name: 'due_date', label: 'Due Date', type: 'date' },
      { name: 'budget_amount', label: 'Budget', type: 'number' },
      { name: 'actual_cost', label: 'Actual Cost', type: 'number' },
      { name: 'progress_percent', label: 'Progress %', type: 'number' },
      { name: 'owner_name', label: 'Owner' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        defaultValue: 'planned',
        options: [
          { value: 'planned', label: 'Planned' },
          { value: 'active', label: 'Active' },
          { value: 'blocked', label: 'Blocked' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
      },
    ],
  };

  return fieldSets[type] || [];
};

const processEntityConfig = {
  tasks: {
    entity: 'FarmTask',
    title: 'New Task',
    button: 'New Task',
    icon: ClipboardCheck,
    columns: [
      { key: 'task_code', label: 'Code' },
      { key: 'title', label: 'Task' },
      { key: 'farm_name', label: 'Farm' },
      { key: 'category', label: 'Category' },
      { key: 'assigned_to_name', label: 'Assigned' },
      { key: 'due_date', label: 'Due', format: formatDate },
      { key: 'priority', label: 'Priority', render: (value) => <StatusBadge status={value} /> },
      { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
    ],
  },
  'crop-plans': {
    entity: 'CropPlan',
    title: 'New Crop Plan',
    button: 'New Crop Plan',
    icon: CalendarDays,
    columns: [
      { key: 'plan_code', label: 'Code' },
      { key: 'crop_variety', label: 'Variety' },
      { key: 'season', label: 'Season' },
      { key: 'farm_name', label: 'Farm' },
      { key: 'planting_date', label: 'Planting', format: formatDate },
      { key: 'expected_harvest_start', label: 'Harvest Start', format: formatDate },
      { key: 'target_yield_kg', label: 'Target kg', align: 'right', format: formatNumber },
      { key: 'budget_amount', label: 'Budget Cost', semantic: 'cost', align: 'right', format: formatCurrency },
      { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
    ],
  },
  projects: {
    entity: 'FarmProject',
    title: 'New Project',
    button: 'New Project',
    icon: Pickaxe,
    columns: [
      { key: 'project_code', label: 'Code' },
      { key: 'title', label: 'Project' },
      { key: 'project_type', label: 'Type' },
      { key: 'farm_name', label: 'Farm' },
      { key: 'due_date', label: 'Due', format: formatDate },
      { key: 'budget_amount', label: 'Budget Cost', semantic: 'cost', align: 'right', format: formatCurrency },
      { key: 'progress_percent', label: 'Progress', render: (value) => <Progress value={asNumber(value)} className="h-2 min-w-24" /> },
      { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
    ],
  },
};

export default function Harvests({ embedded = false }) {
  const [farms, setFarms] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [cropPlans, setCropPlans] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('process');
  const [activePhase, setActivePhase] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Farm.list('-created_date').catch(() => []),
      base44.entities.FarmBlock.list('-created_date').catch(() => []),
      base44.entities.Harvest.list('-harvest_date').catch(() => []),
      base44.entities.HarvestBatch.list('-harvest_date').catch(() => []),
      base44.entities.FarmProcessLog.list('-created_date').catch(() => []),
      base44.entities.FarmTask.list('-due_date').catch(() => []),
      base44.entities.CropPlan.list('-created_date').catch(() => []),
      base44.entities.FarmProject.list('-due_date').catch(() => []),
      base44.auth.me().catch(() => null),
    ])
      .then(([farmData, blockData, harvestData, batchData, logData, taskData, cropPlanData, projectData, user]) => {
        setFarms(farmData || []);
        setBlocks(blockData || []);
        setHarvests([
          ...(harvestData || []),
          ...(batchData || []).map((batch) => ({
            ...batch,
            total_quantity: batch.total_quantity ?? batch.quantity_harvested_kg,
            quality_grade: batch.quality_grade || 'Processed ledger',
            team_lead: batch.team_lead || batch.supervisor || batch.team,
            harvest_season: batch.harvest_season || (batch.harvest_date ? `${String(batch.harvest_date).slice(0, 4)} harvest` : ''),
          })),
        ]);
        setLogs(logData || []);
        setTasks(taskData || []);
        setCropPlans(cropPlanData || []);
        setProjects(projectData || []);
        setCurrentUser(user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createHarvest = (payload) => base44.entities.Harvest.create({
    ...payload,
    harvest_code: makeCode('HAR'),
  });

  const createLog = (payload) => base44.entities.FarmProcessLog.create({
    ...payload,
    log_code: makeCode('FPL'),
    created_by_name: currentUser?.full_name || currentUser?.email || payload.performed_by_name,
    recorded_at: new Date().toISOString(),
  });

  const createOperationalRecord = (entityName) => (payload) => {
    const farm = farms.find((item) => item.id === payload.farm_id);
    const block = blocks.find((item) => item.id === payload.block_id);
    const nextPayload = {
      ...payload,
      farm_name: farm?.name || payload.farm_name || 'Unassigned Farm',
      block_name: block?.name || payload.block_name || '',
    };

    if (payload.farm_id === 'unassigned_farm') {
      nextPayload.farm_id = '';
      nextPayload.farm_name = 'Unassigned Farm';
    }

    if (payload.block_id === 'unassigned_block') {
      nextPayload.block_id = '';
      nextPayload.block_name = '';
    }

    const generatedCodeField = codeField[entityName];
    if (generatedCodeField && !nextPayload[generatedCodeField]) {
      nextPayload[generatedCodeField] = makeEntityCode(entityName);
    }

    return base44.entities[entityName].create(nextPayload);
  };

  const filteredLogs = activePhase === 'all' ? logs : logs.filter((log) => log.phase === activePhase);
  const openTasks = tasks.filter((task) => !['completed', 'cancelled'].includes(task.status)).length;
  const targetYield = cropPlans.reduce((sum, plan) => sum + asNumber(plan.target_yield_kg), 0);
  const activeProjects = projects.filter((project) => !['completed', 'cancelled'].includes(project.status)).length;

  const recentLogs = useMemo(() => logs.slice(0, 5), [logs]);
  const farmOptions = useMemo(() => (
    farms.length > 0
      ? farms.map((farm) => ({ value: farm.id, label: farm.name }))
      : [{ value: 'unassigned_farm', label: 'Unassigned Farm' }]
  ), [farms]);

  const blockOptions = useMemo(() => (
    blocks.length > 0
      ? blocks.map((block) => ({ value: block.id, label: `${block.name} (${block.farm_name || 'Farm'})` }))
      : [{ value: 'unassigned_block', label: 'No Block' }]
  ), [blocks]);

  const activeProcessConfig = processEntityConfig[view];
  const processItems = {
    tasks,
    'crop-plans': cropPlans,
    projects,
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            {[
              { key: 'process', label: 'Process', icon: ClipboardList },
              { key: 'logs', label: 'Logs', icon: List },
              { key: 'tasks', label: 'Tasks', icon: ClipboardCheck },
              { key: 'crop-plans', label: 'Crop Plans', icon: CalendarDays },
              { key: 'projects', label: 'Projects', icon: Pickaxe },
              { key: 'calendar', label: 'Calendar', icon: Calendar },
              { key: 'harvests', label: 'Harvests', icon: Scissors },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.key}
                  variant={view === item.key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView(item.key)}
                  className={view === item.key ? 'gradient-mango text-white' : ''}
                >
                  <Icon className="mr-1.5 h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>
          <AdminCreateDialog
            title="Add Phase Log"
            description="Record who did what, where, and when for any farm process phase."
            buttonLabel="Add Phase Log"
            fields={logFields}
            onCreate={createLog}
            onCreated={load}
            submitLabel="Save Log"
            buttonIcon={UserRoundCheck}
          />
          <AdminCreateDialog
            title="Record Harvest"
            description="Create a harvest batch for calendar and table tracking."
            buttonLabel="Record Harvest"
            fields={harvestFields}
            onCreate={createHarvest}
            onCreated={load}
            submitLabel="Record Harvest"
            buttonIcon={Scissors}
            buttonVariant="outline"
            buttonClassName=""
          />
          {activeProcessConfig && (
            <AdminCreateDialog
              title={activeProcessConfig.title}
              description={`Create a ${activeProcessConfig.button.toLowerCase()} record for this farm process workspace.`}
              buttonLabel={activeProcessConfig.button}
              fields={buildProcessFields(view, farmOptions, blockOptions)}
              onCreate={createOperationalRecord(activeProcessConfig.entity)}
              onCreated={load}
              submitLabel="Save Record"
              buttonIcon={activeProcessConfig.icon}
              buttonVariant="outline"
              buttonClassName=""
            />
          )}
        </div>
  );

  return (
    <div>
      {embedded ? (
        <div className="mb-5 flex justify-end">
          {actions}
        </div>
      ) : (
        <PageHeader
          title="Farm Process Management"
          description="Track farm work from land clearing through seedling, transplanting, crop management, harvest, and post-harvest practice."
        >
          {actions}
        </PageHeader>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <ClipboardList className="h-5 w-5 text-primary" />
          <p className="mt-2 font-heading text-2xl font-bold">{logs.length}</p>
          <p className="text-xs text-muted-foreground">Process Logs</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <ClipboardCheck className="h-5 w-5 text-emerald-500" />
          <p className="mt-2 font-heading text-2xl font-bold">{openTasks}</p>
          <p className="text-xs text-muted-foreground">Open Tasks</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <CalendarDays className="h-5 w-5 text-emerald-600" />
          <p className="mt-2 font-heading text-2xl font-bold text-emerald-700">{formatNumber(targetYield)} kg</p>
          <p className="text-xs text-emerald-700">Crop Plan Target</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Pickaxe className="h-5 w-5 text-amber-500" />
          <p className="mt-2 font-heading text-2xl font-bold">{activeProjects}</p>
          <p className="text-xs text-muted-foreground">Active Projects</p>
        </div>
      </div>

      {loading ? (
        <PageSkeleton contentOnly />
      ) : view === 'process' ? (
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-bold">Farm Process Phases</h2>
                <p className="text-sm text-muted-foreground">Each phase has its own activity log and completion progress.</p>
              </div>
              <StatusBadge status={logs.some((log) => log.status === 'blocked') ? 'blocked' : 'active'} />
            </div>
            <div className="mt-5 space-y-4">
              {phases.map((phase, index) => {
                const Icon = phase.icon;
                const phaseLogs = logs.filter((log) => log.phase === phase.key);
                const progress = phaseProgress(logs, phase.key);
                const lastLog = phaseLogs[0];

                return (
                  <button
                    key={phase.key}
                    type="button"
                    onClick={() => {
                      setActivePhase(phase.key);
                      setView('logs');
                    }}
                    className="w-full rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">Phase {index + 1}</span>
                          <h3 className="font-heading text-base font-bold">{phase.label}</h3>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{phase.description}</p>
                        <div className="mt-3">
                          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                            <span>{phaseLogs.length} logs</span>
                            <span>{progress}% complete</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </div>
                      <div className="text-sm md:min-w-48">
                        <p className="font-medium">{lastLog?.activity_title || 'No activity logged'}</p>
                        <p className="text-xs text-muted-foreground">
                          {lastLog ? `${lastLog.performed_by_name || 'Unassigned'} - ${displayDateTime(lastLog.activity_date, lastLog.start_time)}` : 'Add a log to start tracking'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-heading text-lg font-bold">Recent Activity</h2>
            <div className="mt-4 space-y-3">
              {recentLogs.map((log) => {
                const phase = phases.find((item) => item.key === log.phase);
                const Icon = phase?.icon || ClipboardList;
                return (
                  <div key={log.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-md bg-muted p-2">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{log.activity_title}</p>
                            <p className="text-xs text-muted-foreground">{phase?.label || log.phase}</p>
                          </div>
                          <StatusBadge status={log.status} />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {log.performed_by_name} at {displayDateTime(log.activity_date, log.start_time)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Recorded by {log.created_by_name || 'system'} {log.recorded_at ? `on ${formatDate(log.recorded_at)}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {recentLogs.length === 0 && (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No phase activity has been recorded yet.
                </p>
              )}
            </div>
          </aside>
        </div>
      ) : view === 'logs' ? (
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              variant={activePhase === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActivePhase('all')}
              className={activePhase === 'all' ? 'gradient-mango text-white' : ''}
            >
              All Phases
            </Button>
            {phases.map((phase) => (
              <Button
                key={phase.key}
                variant={activePhase === phase.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivePhase(phase.key)}
                className={activePhase === phase.key ? 'gradient-mango text-white' : ''}
              >
                {phase.shortLabel}
              </Button>
            ))}
          </div>
          <DataTable
            items={filteredLogs}
            emptyMessage="No phase logs found."
            columns={[
              { key: 'log_code', label: 'Code' },
              { key: 'phase', label: 'Phase', render: (value) => phases.find((phase) => phase.key === value)?.label || value },
              { key: 'activity_title', label: 'Activity' },
              { key: 'farm_name', label: 'Farm' },
              { key: 'block_name', label: 'Block' },
              { key: 'performed_by_name', label: 'Who' },
              { key: 'activity_date', label: 'Date', render: (value, item) => displayDateTime(value, item.start_time) },
              { key: 'quantity', label: 'Qty', align: 'right', render: (value, item) => value ? `${formatNumber(value)} ${item.unit_of_measure || ''}` : '' },
              { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
              { key: 'created_by_name', label: 'Recorded By' },
            ]}
          />
        </div>
      ) : activeProcessConfig ? (
        <DataTable
          items={processItems[view]}
          emptyMessage={`No ${activeProcessConfig.button.toLowerCase()} records found.`}
          columns={activeProcessConfig.columns}
        />
      ) : view === 'calendar' ? (
        <HarvestCalendar harvests={harvests} />
      ) : (
        <DataTable
          items={harvests}
          emptyMessage="No harvest batches found."
          columns={[
            { key: 'harvest_code', label: 'Code' },
            { key: 'farm_name', label: 'Farm' },
            { key: 'harvest_date', label: 'Date', format: formatDate },
            { key: 'harvest_season', label: 'Season' },
            { key: 'team_lead', label: 'Team Lead' },
            { key: 'total_quantity', label: 'Qty (kg)', align: 'right', format: (v) => formatNumber(v) },
            { key: 'quality_grade', label: 'Grade' },
            { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
          ]}
        />
      )}
    </div>
  );
}
