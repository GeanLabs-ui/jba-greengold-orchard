import TaskLogRecords from '@/components/farm/TaskLogRecords';
import TaskLogMetrics from '@/components/farm/TaskLogMetrics';
import { taskLogProfile } from '@/lib/task-log-profile';
import { blockLabel, scopeLabel } from '@/lib/farm-scope';
import AdminActionButton from '@/components/admin/AdminActionButton';
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Activity, ArrowLeft, ArrowRight, CalendarCheck2, CalendarDays, CheckCircle2, MapPin, MoreHorizontal, Ruler, Sprout, Trees, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import { base44 } from "@/api/base44Client";
import { BlockFormDialog, InventoryFormDialog, StatusActionDialog } from "@/components/farm/FarmManagementDialogs";
import BlockActivityAnalytics from "@/components/farm/BlockActivityAnalytics";
import { SEASON_STAGES } from "@/components/farm/FarmSeasonChecklist";
import YieldChart from "@/components/farm/YieldChart";
import EditableStatusBadge from "@/components/shared/EditableStatusBadge";
import { formatNumber as formatLogNumber } from "@/components/shared/format";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/AuthContext";
import { subscribeToDataChanges } from "@/lib/data-sync";
import { canChangeBlockStatus, canManageBlocks, formatDate, formatNumber, humanize } from "@/lib/farm-management";
import { cn } from "@/lib/utils";

const hasValue = (value) => value !== undefined && value !== null && value !== "";
const textValue = (value, fallback = "No data yet") => hasValue(value) ? value : fallback;

function MetricCard({ icon: Icon, label, value, tone = "green" }) {
  const tones = { green: "bg-emerald-50 text-emerald-700", gold: "bg-amber-50 text-amber-700", blue: "bg-sky-50 text-sky-700" };
  return <article className="min-w-0 rounded-xl border border-slate-200/80 bg-white px-3 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.025)] sm:px-4"><div className="flex gap-2.5"><span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", tones[tone])}><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-caption font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-0.5 truncate text-sm font-bold text-slate-800">{value}</p></div></div></article>;
}

function Panel({ title, icon: Icon, action, children, className }) {
  return <section className={cn("overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.025)]", className)}><header className="flex min-h-11 flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-3 py-2.5 sm:px-4"><div className="flex min-w-0 flex-1 items-start gap-2">{Icon ? <Icon className="h-4 w-4 shrink-0 text-emerald-700" /> : null}<h2 className="min-w-0 text-slate-800 text-section-title">{title}</h2></div>{action}</header>{children}</section>;
}

function ProfileDatum({ label, value }) {
  return <div className="min-w-0"><dt className="text-caption font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-0.5 truncate text-caption font-semibold text-slate-700" title={String(value)}>{textValue(value)}</dd></div>;
}

const CURRENT_YEAR = new Date().getFullYear();
const SEASON_YEARS = Array.from({ length: 16 }, (_, index) => CURRENT_YEAR - 5 + index);

const BLOCK_SEASON_STAGES = [
  { ...SEASON_STAGES[0], label: "Paklo application" },
  { id: "pruning", label: "Pruning" },
  { id: "fertilizer", label: "Fertilizer application" },
  ...SEASON_STAGES.slice(1),
];

const SEASON_STATUS = {
  planned: { label: "Upcoming", style: "bg-slate-100 text-slate-600" },
  in_progress: { label: "In progress", style: "bg-sky-100 text-sky-800" },
  completed: { label: "Completed", style: "bg-emerald-100 text-emerald-800" },
};

function checklistProgress(record) {
  const total = Math.max(Number(record?.total_tasks || record?.task_count) || 1, 1);
  const count = Math.max(0, Math.min(Number(record?.completed_tasks) || 0, total));
  const storedStatus = String(record?.status || "").toLowerCase();
  const status = record?.completed || storedStatus === "completed" || count === total ? "completed"
    : storedStatus === "in_progress" || count > 0 ? "in_progress" : "planned";
  return { total, count: status === "completed" ? total : count, status };
}

function CompactSeasonChecklist({ farm, block, canEdit, initialOpen }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [year, setYear] = useState(CURRENT_YEAR);
  const [open, setOpen] = useState(initialOpen);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = await base44.entities.FarmSeasonChecklist.filter(
          { farm_id: farm.id, block_id: block.id, season_year: year }, "-updated_date", 250,
        );
        if (active) {
          setRecords(rows);
          setLoadError("");
        }
      } catch (error) {
        if (active) setLoadError(error.message || "Unable to load the seasonal checklist");
      } finally {
        if (active) setLoading(false);
      }
    };
    setLoading(true);
    setLoadError("");
    void load();
    const unsubscribe = subscribeToDataChanges(load, ["FarmSeasonChecklist"]);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [block.id, farm.id, year]);

  const recordForStage = (id) => records.find((record) => record.stage === id);
  const openEditor = (id) => {
    const record = recordForStage(id);
    const { total, count, status } = checklistProgress(record);
    setForm({
      stage: id,
      status,
      total_tasks: total,
      completed_tasks: count,
      start_date: record?.start_date || "",
      end_date: record?.end_date || "",
    });
  };

  const saveActivity = async (event) => {
    event.preventDefault();
    if (!canEdit || saving || loading || loadError) return;
    const stage = BLOCK_SEASON_STAGES.find(({ id }) => id === form.stage);
    const existing = recordForStage(stage.id);
    const total = Number(form.total_tasks);
    const completed = form.status === "completed";
    const values = {
      ...form,
      total_tasks: total,
      completed_tasks: completed ? total : Number(form.completed_tasks),
      completed,
      completed_at: completed ? existing?.completed_at || new Date().toISOString() : "",
    };
    if (form.start_date !== (existing?.start_date || "") || form.end_date !== (existing?.end_date || "")) {
      values.window_code = form.start_date || form.end_date ? "custom" : "";
      values.window_label = [form.start_date, form.end_date].filter(Boolean).join(" – ");
    }

    setSaving(true);
    try {
      const record = existing
        ? await base44.entities.FarmSeasonChecklist.update(existing.id, values)
        : await base44.entities.FarmSeasonChecklist.create({
          ...values,
          farm_id: farm.id,
          farm_name: farm.name,
          block_id: block.id,
          block_name: block.name,
          block_code: block.block_code,
          season_year: year,
          stage_label: stage.label,
          source: "farm_season_checklist",
        });
      setRecords((current) => [record, ...current.filter((row) => row.id !== record.id)]);
      setForm(null);
      toast.success(`${stage.label} updated`);
    } catch (error) {
      toast.error(error.message || "The seasonal activity could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateStatus = (status) => setForm((current) => ({
    ...current,
    status,
    completed_tasks: status === "planned" || current.status === "completed" ? 0 : current.completed_tasks,
  }));
  const rows = BLOCK_SEASON_STAGES.map((stage) => ({ ...stage, ...checklistProgress(recordForStage(stage.id)) }));
  const statusBadge = (status) => <span className={cn("justify-self-start whitespace-nowrap rounded-full px-2 py-0.5 text-caption font-semibold", SEASON_STATUS[status].style)}>{SEASON_STATUS[status].label}</span>;
  const currentStage = BLOCK_SEASON_STAGES.find(({ id }) => id === form?.stage);
  const fieldClass = "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (saving) return;
      setOpen(nextOpen);
      if (!nextOpen) setForm(null);
    }}>
      <section className="overflow-hidden rounded-md border border-blue-200 bg-white">
        <header className="flex items-center justify-between gap-2 px-3 pt-3">
          <h2 className="flex min-w-0 items-center gap-2 text-blue-700 text-section-title">
            <CalendarCheck2 className="h-3.5 w-3.5 shrink-0 text-blue-600" /> Season Checklist Progress
          </h2>
          <select aria-label="Season checklist year" className="h-7 rounded border border-slate-200 bg-white px-1.5 text-caption font-semibold text-slate-600" value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {SEASON_YEARS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </header>
        <div className="px-3 py-2">
          {loading || loadError ? <p role={loadError ? "alert" : "status"} className="py-3 text-sm text-slate-600">{loadError || "Loading checklist…"}</p> : (
            <table className="w-full text-left text-caption">
              <thead className="border-b border-slate-100 text-slate-500">
                <tr><th scope="col" className="pb-1.5">Activity</th><th scope="col" className="pb-1.5">Progress</th><th scope="col" className="pb-1.5">Status</th></tr>
              </thead>
              <tbody>
                {rows.map((stage) => (
                  <tr key={stage.id}>
                    <th scope="row" className="py-1.5 pr-2 font-medium">{stage.label}</th>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-2 text-slate-500">
                        <span>{stage.count}/{stage.total}</span>
                        <progress className="hidden h-1.5 w-full max-w-32 accent-emerald-700 sm:block" aria-label={`${stage.label} progress`} value={stage.count} max={stage.total} />
                        <span className="hidden sm:inline">{Math.round(stage.count / stage.total * 100)}%</span>
                      </div>
                    </td>
                    <td className="py-1.5">{statusBadge(stage.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="border-t border-slate-100 px-3 py-1 text-center">
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="gap-1 text-blue-600">
              View full seasonal checklist <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Button>
          </DialogTrigger>
        </div>
      </section>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Seasonal checklist</DialogTitle>
          <DialogDescription>{blockLabel(block)} · {year}</DialogDescription>
        </DialogHeader>
        {loading || loadError ? <p role={loadError ? "alert" : "status"} className="text-sm">{loadError || "Loading checklist…"}</p> : form && canEdit ? (
          <form onSubmit={saveActivity} className="space-y-4">
            <h3 className="font-semibold">{currentStage.label}</h3>
            <label className="grid gap-1.5 text-label">
              Status
              <select className={fieldClass} value={form.status} onChange={(event) => updateStatus(event.target.value)}>
                {Object.entries(SEASON_STATUS).map(([status, { label }]) => <option key={status} value={status}>{label}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-1.5 text-label">
                Total tasks
                <input className={fieldClass} type="number" min="1" required value={form.total_tasks} onChange={(event) => updateForm("total_tasks", event.target.value)} />
              </label>
              <label className="grid gap-1.5 text-label">
                Completed tasks
                <input className={fieldClass} type="number" min="0" max={Math.max(Number(form.total_tasks) - 1, 0)} required disabled={form.status !== "in_progress"} value={form.status === "completed" ? form.total_tasks : form.completed_tasks} onChange={(event) => updateForm("completed_tasks", event.target.value)} />
              </label>
              <label className="grid gap-1.5 text-label">
                Start date
                <input className={fieldClass} type="date" max={form.end_date || undefined} value={form.start_date} onChange={(event) => updateForm("start_date", event.target.value)} />
              </label>
              <label className="grid gap-1.5 text-label">
                End date
                <input className={fieldClass} type="date" min={form.start_date || undefined} value={form.end_date} onChange={(event) => updateForm("end_date", event.target.value)} />
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save activity"}</Button>
            </DialogFooter>
          </form>
        ) : (
          <ul className="divide-y rounded-md border px-3">
            {rows.map((stage) => {
              const record = recordForStage(stage.id);
              const dates = record?.window_label || [record?.start_date, record?.end_date].filter(Boolean).join(" – ");
              return (
                <li key={stage.id} className="flex items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">{stage.label}</p>
                    <p className="text-caption text-slate-500">{stage.count}/{stage.total} tasks complete{dates && ` · ${dates}`}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {statusBadge(stage.status)}
                    {canEdit && <Button type="button" variant="outline" size="sm" aria-label={`Edit ${stage.label}`} onClick={() => openEditor(stage.id)}>Edit</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function BlockProfileAdmin() {
  const { farmId, blockId } = useParams(); const navigate = useNavigate(); const { user } = useAuth();
  const [params] = useSearchParams();
  const start = params.get('start') ?? '';
  const end = params.get('end') ?? '';
  const [farm, setFarm] = useState(null);
  const [block, setBlock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false); const [inventoryOpen, setInventoryOpen] = useState(false); const [selectedInventory, setSelectedInventory] = useState(null); const [statusAction, setStatusAction] = useState(null); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [farmResponse, blockResponse, dailyActivities, blocks, farms] = await Promise.all([
        base44.farms.get(farmId, { start, end }),
        base44.farms.getBlock(blockId, { start, end }),
        base44.entities.DailyActivity.listAll('-activity_date'),
        base44.entities.FarmBlock.listAll(),
        base44.entities.Farm.listAll(),
      ]);
      if (String(blockResponse.farm_id) !== String(farmResponse.id)) {
        throw new Error("This block does not belong to the selected farm.");
      }
      const model = taskLogProfile(farmResponse, dailyActivities, { start, end, blockId, blocks, farms });
      setFarm(farmResponse);
      setBlock({
        ...blockResponse,
        activity_periods: model.activities,
        yield_records: model.yieldRecords,
        task_log: model,
      });
    } catch (loadError) {
      setError(loadError.message || "Unable to load this block.");
    } finally {
      setLoading(false);
    }
  }, [blockId, end, farmId, start]);
  useEffect(() => { load(); return subscribeToDataChanges(load, ['Farm', 'FarmBlock', 'DailyActivity']); }, [load]);
  const mutate = async (action, message, close) => { setSaving(true); try { await action(); toast.success(message); close?.(); void load(); return true; } catch (mutationError) { toast.error(mutationError.message || "The change could not be saved"); return false; } finally { setSaving(false); } };
  const currentInventory = useMemo(() => (block?.inventory || []).filter((entry) => !entry.effective_to), [block]);
  const saveBlock = async (payload) => {
    const saved = await mutate(() => base44.farms.updateBlock(block.id, payload), "Block profile updated", () => setEditOpen(false));
    if (saved && payload.farm_id && payload.farm_id !== farmId) navigate(`/admin/farm-daily-activities/activities/farms/${payload.farm_id}/blocks/${block.id}`);
    return saved;
  };
  const latestActivity = block?.activity_periods?.find((period) => String(period.status || "").toLowerCase() === "in_progress") || block?.activity_periods?.[0] || null;
  const activeHarvest = block?.harvest_periods?.find((period) => period.status === "active") || block?.harvest_periods?.[0] || null;
  if (loading && !block) return <div className="space-y-4"><Skeleton className="h-5 w-48" /><Skeleton className="h-14" /><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-20 rounded-xl" />)}</div><Skeleton className="h-80 rounded-xl" /></div>;
  if (error) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"><p className="font-medium text-destructive">This block could not be loaded</p><p className="mt-1 text-sm text-muted-foreground">{error}</p><Button className="mt-4" variant="outline" onClick={load}>Try again</Button></div>;
  if (!block || !farm) return null;
  const analytics = block.analytics || {}; const canEdit = canManageBlocks(user?.role) && block.status !== "merged"; const blockTitle = blockLabel(block); const lastActivityDate = latestActivity?.activity_date || latestActivity?.actual_start_date || latestActivity?.planned_start_date;
  return <div className="block-profile-page mx-auto max-w-[1280px] pb-10 text-slate-700"><nav className="mb-3 flex flex-wrap items-center gap-1 text-caption font-semibold text-slate-500" aria-label="Breadcrumb"><Link to="/admin/farm-daily-activities/activities/farms" className="hover:text-emerald-800">Farms</Link><span>/</span><Link to={`/admin/farm-daily-activities/activities/farms/${farm.id}?tab=blocks`} className="hover:text-emerald-800">{scopeLabel(farm.name)}</Link><span>/</span><span className="text-slate-700">{block.block_code}</span></nav>
    <header className="rounded bg-[#2e7d32] px-5 py-4 text-white shadow-none"><div className="grid gap-4 lg:grid-cols-[170px_auto_minmax(0,1fr)] lg:items-center"><div><p className="text-caption font-bold uppercase tracking-[0.16em] text-emerald-100/75">{block.block_code}</p><h1 className="mt-1 text-page-title">{blockTitle}</h1><div className="mt-1 flex flex-wrap gap-x-3 text-caption text-emerald-100/80"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{farm.location || farm.region || "Location not recorded"}</span><span>Updated {formatDate(block.updated_at)}</span></div></div><div className="flex gap-2"><Button variant="secondary" size="sm" className="h-8 border-0 bg-white/10 text-caption text-white hover:bg-white/20" asChild><Link to={`/admin/farm-daily-activities/activities/farms/${farm.id}?tab=blocks`}><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back to blocks</Link></Button>{(canEdit || (canChangeBlockStatus(user?.role) && block.status !== "merged")) ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="secondary" size="icon" className="h-8 w-8 border-0 bg-[#66bb6a] text-white hover:bg-[#c8e6c9] hover:text-[#123524]" aria-label="More block actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{canEdit ? <AdminActionButton action="edit" as={DropdownMenuItem} onClick={() => setEditOpen(true)} label="Edit block" /> : null}{canChangeBlockStatus(user?.role) && block.status !== "merged" ? <DropdownMenuItem className={block.status === "active" ? "text-destructive" : ""} onClick={() => setStatusAction(block.status === "active" ? "deactivate" : "reactivate")}>{block.status === "active" ? "Deactivate block" : "Reactivate block"}</DropdownMenuItem> : null}</DropdownMenuContent></DropdownMenu> : null}</div><div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-3 sm:grid-cols-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0"><div><p className="text-caption font-bold uppercase tracking-wide text-emerald-100/65">Block status</p><div className="mt-1"><EditableStatusBadge status={block.status} canEdit={canChangeBlockStatus(user?.role) && block.status !== "merged"} entityLabel={blockLabel(block)} onClick={() => setStatusAction(block.status === "active" ? "deactivate" : "reactivate")} /></div></div><div><p className="text-caption font-bold uppercase tracking-wide text-emerald-100/65">Mango varieties</p><p className="mt-1 truncate text-caption font-bold">{currentInventory.map((entry) => entry.variety_name).filter(Boolean).join(", ") || block.variety || "Not recorded"}</p></div><div><p className="text-caption font-bold uppercase tracking-wide text-emerald-100/65">Harvest types</p><p className="mt-1 text-caption font-bold">{activeHarvest ? humanize(activeHarvest.harvest_type) : "Not scheduled"}</p></div><div><p className="text-caption font-bold uppercase tracking-wide text-emerald-100/65">Next harvest</p><p className="mt-1 flex items-center gap-1 text-caption font-bold"><CalendarDays className="h-3.5 w-3.5 text-emerald-100" />{activeHarvest?.expected_start_date ? formatDate(activeHarvest.expected_start_date) : "Not scheduled"}</p></div></div></div></header>
    {block.status === "merged" && block.merge_info ? <div className="mt-4 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><CheckCircle2 className="h-5 w-5 shrink-0" /><div><p className="font-medium">Merged on {formatDate(block.merge_info.effective_date)}</p><p className="mt-1">Historical records remain here. New operations should use the destination block.</p></div></div> : null}{error ? <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">The latest refresh failed: {error}. The last loaded values are still shown.</div> : null}
    <TaskLogMetrics model={block.task_log} /><section className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"><MetricCard icon={Ruler} label="Area" value={hasValue(block.size_acres) ? `${formatNumber(block.size_acres)} ac` : "No data yet"} /><MetricCard icon={Trees} label="Trees" value={analytics.inventory_record_count ? formatNumber(analytics.total_trees, 0) : "No data yet"} /><MetricCard icon={TrendingUp} label="Actual yield" value={`${formatLogNumber(block.task_log.totalYieldKg, 3)} Kg`} /><MetricCard icon={Activity} label="Current stage" value={latestActivity ? humanize(latestActivity.category || latestActivity.activity_type) : "No data yet"} /><MetricCard icon={CalendarDays} label="Harvest window" value={activeHarvest ? humanize(activeHarvest.harvest_type) : "No data yet"} /><MetricCard icon={CalendarCheck2} label="Last activity" value={lastActivityDate ? formatDate(lastActivityDate) : "No data yet"} /></section>
    <TaskLogRecords activities={block.activity_periods} />
    <div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="space-y-4"><Panel className="border-l-2 border-l-emerald-700" title="Block profile" icon={Sprout} action={canEdit ? <AdminActionButton action="edit" onClick={() => setEditOpen(true)} label="Edit details" /> : null}><dl className="grid gap-x-3 gap-y-4 px-3 py-4 sm:grid-cols-5 sm:px-4"><ProfileDatum label="Block code" value={block.block_code} /><ProfileDatum label="Early block" value={block.early_block_classification} /><ProfileDatum label="Variety" value={currentInventory.map((entry) => entry.variety_name).filter(Boolean).join(", ") || block.variety} /><ProfileDatum label="Size" value={hasValue(block.size_acres) ? `${formatNumber(block.size_acres)} acres` : null} /><ProfileDatum label="Soil / pH" value={`${block.soil_type || "No data yet"}${hasValue(block.soil_ph) ? ` · pH ${block.soil_ph}` : ""}`} /><ProfileDatum label="Fruit fly pressure" value={block.fruit_fly_pressure} /><ProfileDatum label="Disease rating" value={block.disease_rating} /><ProfileDatum label="Shoot maturity" value={hasValue(block.shoot_maturity) ? `${formatNumber(Number(block.shoot_maturity) * 100, 0)}%` : null} /><ProfileDatum label="Operations started" value={formatDate(block.operations_started_on)} /><ProfileDatum label="Planting started" value={formatDate(block.planting_started_on)} /></dl><div className="border-t border-slate-100 px-3 py-3 sm:px-4"><p className="text-caption font-bold uppercase tracking-wide text-slate-500">Description</p><p className="mt-1 text-caption leading-5 text-slate-600">{block.description || block.soil_notes || "No description recorded for this block."}</p></div></Panel><BlockActivityAnalytics activities={block.activity_periods} /></div>
      <aside className="space-y-4"><CompactSeasonChecklist key={block.id} farm={farm} block={block} canEdit={canEdit} initialOpen={params.get("tab") === "season"} /><Panel title="Harvest periods" icon={CalendarDays} action={<span className="text-caption font-semibold text-emerald-700">{block.harvest_periods?.length ? `${block.harvest_periods.length} recorded` : ""}</span>}>{block.harvest_periods?.length ? <div className="divide-y divide-slate-100">{block.harvest_periods.slice(0, 3).map((period) => <div key={period.id} className="flex items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><p className="truncate text-caption font-semibold text-slate-700">{humanize(period.harvest_type)}</p><p className="mt-0.5 text-caption text-slate-500">{formatDate(period.expected_start_date)} – {formatDate(period.expected_end_date)}</p></div><StatusBadge status={period.status} /></div>)}</div> : <div className="grid min-h-20 place-items-center px-4 text-center"><div><CalendarDays className="mx-auto h-5 w-5 text-slate-300" /><p className="mt-1.5 text-caption font-semibold text-slate-600">No harvest periods recorded</p><p className="mt-0.5 text-caption text-slate-500">Harvest windows will appear here.</p></div></div>}</Panel><Panel title="Crop inventory" icon={Trees} action={canEdit ? <Button variant="ghost" size="sm" className="h-7 px-1.5 text-caption text-emerald-700" onClick={() => { setSelectedInventory(null); setInventoryOpen(true); }}>Record inventory</Button> : null}>{currentInventory.length ? <div className="divide-y divide-slate-100">{currentInventory.slice(0, 3).map((entry) => <button type="button" key={entry.id} disabled={!canEdit} onClick={() => { setSelectedInventory(entry); setInventoryOpen(true); }} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:cursor-default"><div className="min-w-0"><p className="truncate text-caption font-semibold text-slate-700">{entry.variety_name || "Tree inventory"}</p><p className="mt-0.5 text-caption text-slate-500">{formatNumber(entry.productive_trees || 0, 0)} productive · planted {formatDate(entry.planting_date)}</p></div><span className="text-caption font-bold text-emerald-700">{formatNumber(entry.total_trees || 0, 0)}</span></button>)}</div> : <div className="grid min-h-20 place-items-center px-4 text-center"><div><Trees className="mx-auto h-5 w-5 text-slate-300" /><p className="mt-1.5 text-caption font-semibold text-slate-600">No inventory recorded</p><p className="mt-0.5 text-caption text-slate-500">Add tree inventory to track stock and usage.</p></div></div>}</Panel><YieldChart records={block.yield_records || []} title="Yield performance" /></aside></div>
    <BlockFormDialog open={editOpen} onOpenChange={setEditOpen} block={block} parentFarm={farm} saving={saving} unallocatedAcres={farm.analytics?.unallocatedSizeAcres} onSubmit={saveBlock} /><InventoryFormDialog open={inventoryOpen} onOpenChange={setInventoryOpen} inventory={selectedInventory} saving={saving} onSubmit={(payload) => mutate(() => selectedInventory ? base44.farms.updateInventory(selectedInventory.id, payload) : base44.farms.addInventory(block.id, payload), selectedInventory ? "Tree inventory updated" : "Tree inventory recorded", () => setInventoryOpen(false))} /><StatusActionDialog open={Boolean(statusAction)} onOpenChange={(open) => !open && setStatusAction(null)} entityLabel={blockLabel(block)} action={statusAction || "deactivate"} saving={saving} onSubmit={(payload) => mutate(() => statusAction === "deactivate" ? base44.farms.deactivateBlock(block.id, payload) : base44.farms.reactivateBlock(block.id), `Block ${statusAction === "deactivate" ? "deactivated" : "reactivated"}`, () => setStatusAction(null))} />
  </div>;
}
