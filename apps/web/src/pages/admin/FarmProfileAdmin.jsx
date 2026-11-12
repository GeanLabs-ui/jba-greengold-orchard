import AnalyticsPie from '@/components/farm/AnalyticsPie';
import TaskLogRecords from '@/components/farm/TaskLogRecords';
import TaskLogMetrics from '@/components/farm/TaskLogMetrics';
import { farmWithTaskLog, taskLogProfile, taskLogTotals } from '@/lib/task-log-profile';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { blockLabel, scopeLabel } from '@/lib/farm-scope';
import AdminActionButton from '@/components/admin/AdminActionButton';
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Grid2X2,
  Leaf,
  Merge,
  MoreHorizontal,
  Plus,
  Ruler,
  ShoppingBasket,
  Sprout,
  SunMedium,
  Trees,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { base44 } from "@/api/base44Client";
import {
  BlockFormDialog,
  FarmFormDialog,
  MergeBlocksDialog,
  StatusActionDialog,
} from "@/components/farm/FarmManagementDialogs";
import FarmPerformanceTrends from "@/components/farm/FarmPerformanceTrends";
import BlockPerformanceChart from "@/components/farm/BlockPerformanceChart";
import "./farm-profile.css";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/AuthContext";
import {
  canManageBlocks,
  canManageFarms,
  canMergeBlocks,
  formatDate,
  formatNumber,
  humanize,
} from "@/lib/farm-management";

const fallbackFarmImage = "/pages/local-supply-header.webp";
const farmImagePreviewUrl = /^\/api\/v1\/files\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\?preview=1$/i;

const blockHarvest = (block) =>
  block.current_harvest ||
  block.harvest_periods?.find((period) => period.status === "active") ||
  block.harvest_periods?.find((period) => period.status === "planned") ||
  block.harvest_periods?.[0] ||
  null;

const periodLabel = (period) =>
  period?.expected_start_date || period?.expected_end_date
    ? `${formatDate(period.expected_start_date)} – ${formatDate(period.expected_end_date)}`
    : "Not scheduled";

function SectionBand({ number, title, subtitle, tone, children }) {
  const tones = {
    green: "bg-gradient-to-r from-emerald-950 to-emerald-800",
    gold: "bg-gradient-to-r from-amber-600 to-amber-500",
    teal: "bg-gradient-to-r from-teal-800 to-teal-500",
    blue: "bg-gradient-to-r from-blue-800 to-blue-500",
  };
  return (
    <header
      className={`flex min-h-11 flex-col justify-between gap-3 px-4 py-2.5 text-white sm:flex-row sm:items-center ${tones[tone]}`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {number ? (
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-caption font-extrabold text-slate-700">
            {number}
          </span>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-0.5">
          <h2 className="text-section-title">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-caption font-medium text-white/80">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </header>
  );
}

function ReadinessCard({ icon: Icon, title, count, total, completed, accent }) {
  const percent = total ? Math.round((count / total) * 100) : 0;
  const colors = {
    green: "bg-lime-50 text-lime-700",
    gold: "bg-amber-50 text-amber-600",
    leaf: "bg-emerald-50 text-emerald-700",
  };
  return (
    <article className="grid grid-cols-[auto_1fr] gap-x-3 rounded-lg border border-slate-100 bg-white p-3.5 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${colors[accent]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h3 className="text-slate-800 text-card-title">{title}</h3>
        <p className="mt-0.5 text-caption font-medium text-slate-600">
          {count ? `${count} of ${total} blocks scheduled` : "Not scheduled"}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Progress value={percent} className="h-1.5 flex-1 bg-slate-100" />
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-caption font-semibold text-slate-500">
            {percent}%
          </span>
        </div>
        <p className="mt-1.5 text-caption text-slate-500">
          {count ? `${completed} completed` : `0 / ${total} stages scheduled`}
        </p>
      </div>
    </article>
  );
}

function BlockStage({ icon: Icon, label, scheduled }) {
  return (
    <div className="flex items-center gap-1.5 text-caption text-slate-600">
      <Icon className="h-3 w-3 text-slate-500" />
      <span>{label}</span>
      <span className={`ml-auto h-1.5 w-1.5 rounded-full ${scheduled ? "bg-emerald-500" : "bg-amber-400"}`} />
      <span className="min-w-14 text-right text-caption text-slate-500">
        {scheduled ? "Scheduled" : "Not scheduled"}
      </span>
    </div>
  );
}

function BlockOverviewCard({ block, start, end }) {
  const activities = block.activity_periods;
  const fertilizer = activities.some((period) => /fertili/i.test(period.category || period.activity_type));
  const flowering = activities.some((period) => /flower|induction/i.test(period.category || period.activity_type));
  const harvest = Boolean(blockHarvest(block));
  const scheduled = [fertilizer, flowering, harvest].filter(Boolean).length;
  const completed = activities.filter((period) => String(period.status).toLowerCase() === "completed").length;
  return (
    <Link
      to={`/admin/farm-daily-activities/activities/farms/${block.farm_id}/blocks/${block.id}?${new URLSearchParams({ start, end })}`}
      className="group min-w-0 rounded-lg border border-slate-100 bg-white p-3 shadow-[0_2px_12px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded bg-teal-600 px-2 py-0.5 text-caption font-bold text-white">
          {block.block_code}
        </span>
        <span className="text-caption font-medium uppercase tracking-wide text-slate-400">
          {humanize(block.status)}
        </span>
      </div>
      <div className="flex gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700">
          <Sprout className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <BlockStage icon={Leaf} label="Fertilizer" scheduled={fertilizer} />
          <BlockStage icon={SunMedium} label="Flower induction" scheduled={flowering} />
          <BlockStage icon={ShoppingBasket} label="Harvest" scheduled={harvest} />
        </div>
      </div>
      <div className="mt-2 border-t border-slate-100 pt-2 text-center text-caption font-medium text-slate-500">
        {scheduled} / 3 planned&nbsp;&nbsp; • &nbsp;&nbsp;{completed} completed log entries
      </div>
    </Link>
  );
}

export default function FarmProfileAdmin() {
  const { farmId } = useParams();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [farm, setFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trendYear, setTrendYear] = useState(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [farmDialog, setFarmDialog] = useState(false);
  const [blockDialog, setBlockDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(null);
  const [mergeDialog, setMergeDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadFarm = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profile, records, blocks, farms] = await Promise.all([
        base44.farms.get(farmId, { start, end }),
        base44.entities.DailyActivity.listAll("-activity_date"),
        base44.entities.FarmBlock.listAll(),
        base44.entities.Farm.listAll(),
      ]);
      setFarm({
        ...farmWithTaskLog(profile, records, { start, end, blocks, farms }),
        performanceActivities: taskLogProfile(profile, records, { blocks, farms }).activities,
      });
    } catch (loadError) {
      setError(loadError.message || "Unable to load this farm.");
    } finally {
      setLoading(false);
    }
  }, [end, farmId, start]);

  useEffect(() => {
    loadFarm();
    return subscribeToDataChanges(loadFarm, ["DailyActivity", "Farm", "FarmBlock"]);
  }, [loadFarm]);

  useEffect(() => {
    if (searchParams.get("action") === "add-block" && canManageBlocks(user?.role)) {
      setBlockDialog(true);
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, user?.role]);

  const mutate = async (action, successMessage, close) => {
    setSaving(true);
    try {
      await action();
      toast.success(successMessage);
      close?.();
      void loadFarm();
      return true;
    } catch (mutationError) {
      toast.error(mutationError.message || "The change could not be saved");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const analytics = farm?.analytics || {};
  const activeBlocks = useMemo(
    () => (farm?.blocks || []).filter((block) => block.status === "active"),
    [farm],
  );
  const blockVarieties = useMemo(
    () =>
      [
        ...new Set(
          activeBlocks.flatMap((block) =>
            [...(block.varieties || []), block.variety].filter(Boolean),
          ),
        ),
      ].sort(),
    [activeBlocks],
  );
  const farmHarvestPeriods = farm?.harvest_periods || [];
  const activeOrPlannedHarvests = farmHarvestPeriods.filter((period) =>
    ["active", "planned"].includes(period.status),
  );
  const nextHarvest = [...activeOrPlannedHarvests].sort((left, right) =>
    String(left.expected_start_date || "9999").localeCompare(
      String(right.expected_start_date || "9999"),
    ),
  )[0];
  const harvestTypes = [
    ...new Set(farmHarvestPeriods.map((period) => period.harvest_type).filter(Boolean)),
  ];
  const activityPeriods = farm?.activity_periods || [];
  const readiness = useMemo(() => {
    const total = activeBlocks.length;
    const summarize = (matcher, source = activityPeriods) => {
      const matching = source.filter(matcher);
      return {
        count: new Set(matching.map((period) => period.block_id).filter(Boolean)).size,
        completed: matching.filter((period) => String(period.status).toLowerCase() === "completed").length,
      };
    };
    return {
      total,
      fertilizer: summarize((period) => /fertili/i.test(period.category || period.activity_type)),
      flowering: summarize((period) => /flower|induction/i.test(period.category || period.activity_type)),
      harvest: summarize(() => true, farmHarvestPeriods),
    };
  }, [activeBlocks.length, activityPeriods, farmHarvestPeriods]);
  const loadImpact = useCallback((id) => base44.farms.mergeImpact(id), []);

  if (loading && !farm) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (error && !farm) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="font-medium text-destructive">This farm could not be loaded</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-4" variant="outline" onClick={loadFarm}>Try again</Button>
      </div>
    );
  }

  if (!farm) return null;

  const unallocated = analytics.unallocatedSizeAcres;
  const farmImageUrl = farmImagePreviewUrl.test(farm.image_url || '') ? farm.image_url : fallbackFarmImage;
  const currentStage = analytics.mixedActivityStages
    ? "Mixed stages"
    : analytics.currentActivityStage
      ? humanize(analytics.currentActivityStage)
      : "No data yet";

  return (
    <div className="farm-profile-page space-y-2.5">
      <TaskLogMetrics model={farm.task_log} />
      <Button variant="ghost" asChild className="-ml-3 h-8 px-3 text-sm text-slate-600 hover:text-emerald-800">
        <Link to="/admin/farm-daily-activities/activities/farms">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to farms
        </Link>
      </Button>
      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          The latest refresh failed: {error}. The last loaded values are still shown.
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-emerald-900/10 bg-slate-50 shadow-sm">
        <SectionBand title="Farm Summary" tone="green" />
        <div className="bg-gradient-to-r from-emerald-950 to-emerald-800 px-4 pb-4 text-white">
          <div className="grid gap-4 md:grid-cols-[minmax(8rem,20%)_minmax(0,1fr)] lg:gap-5">
            <div className="relative min-h-36 overflow-hidden rounded-lg border border-white/20 shadow-sm">
              <img
                src={farmImageUrl}
                alt={scopeLabel(farm.name)}
                className="absolute inset-0 h-full w-full object-cover object-[70%_center]"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-0">
                  <h1 className="break-words text-page-title">{scopeLabel(farm.name)}</h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-emerald-50">
                    <button
                      type="button"
                      disabled={!canManageFarms(user?.role)}
                      onClick={() => setStatusDialog(farm.status === "active" ? "deactivate" : "reactivate")}
                      className="rounded-full bg-emerald-400/20 px-2.5 py-1 font-semibold text-emerald-50 disabled:cursor-default"
                    >
                      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-lime-400" />
                      {humanize(farm.status)}
                    </button>
                    <span>Updated {formatDate(farm.updated_at)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-stretch gap-2">
                  {canManageBlocks(user?.role) && farm.status === "active" ? (
                    <Button size="sm" onClick={() => setBlockDialog(true)} className="border border-lime-400/40 bg-emerald-900 text-white hover:bg-emerald-800">
                      <Plus className="mr-1.5 h-3.5 w-3.5" />Add block
                    </Button>
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="secondary" className="!h-auto !w-12 min-h-12 bg-white text-slate-800 hover:bg-slate-100" aria-label="More farm actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canManageFarms(user?.role) ? (
                        <AdminActionButton action="edit" as={DropdownMenuItem} onClick={() => setFarmDialog(true)} label="Edit farm" />
                      ) : null}
                      <DropdownMenuItem asChild>
                        <Link to="/admin/farm-daily-activities/activities/farms"><ArrowLeft className="mr-2 h-4 w-4" />All farms</Link>
                      </DropdownMenuItem>
                      {canMergeBlocks(user?.role) && activeBlocks.length > 1 ? (
                        <DropdownMenuItem onClick={() => setMergeDialog(true)}><Merge className="mr-2 h-4 w-4" />Merge blocks</DropdownMenuItem>
                      ) : null}
                      {canManageFarms(user?.role) ? (
                        <><DropdownMenuSeparator /><DropdownMenuItem className={farm.status === "active" ? "text-destructive" : ""} onClick={() => setStatusDialog(farm.status === "active" ? "deactivate" : "reactivate")}>{farm.status === "active" ? "Deactivate farm" : "Reactivate farm"}</DropdownMenuItem></>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/20 pt-3 lg:grid-cols-4">
                {[
                  { icon: Ruler, label: "Declared area", value: farm.size_acres == null ? "No data yet" : formatNumber(farm.size_acres) + " ac" },
                  { icon: Trees, label: "Current trees", value: analytics.inventoryRecordCount ? formatNumber(analytics.totalTrees, 0) : "No data yet" },
                  { icon: TrendingUp, label: "Yield in period", value: analytics.yieldRecordCount ? formatNumber(analytics.totalYieldKg) + " Kg" : "No data yet" },
                  { icon: Grid2X2, label: "Active blocks", value: activeBlocks.length },
                  { icon: Leaf, label: "Mango variety", value: blockVarieties.join(", ") || "Not recorded" },
                  { icon: ShoppingBasket, label: "Harvest type", value: harvestTypes.map(humanize).join(", ") || "Not scheduled" },
                  { icon: CalendarDays, label: "Next harvest period", value: periodLabel(nextHarvest) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex min-w-0 items-start gap-2">
                    <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-lime-200" />
                    <div className="min-w-0">
                      <dt className="text-caption leading-5 text-emerald-50">{label}</dt>
                      <dd className="break-words text-sm font-semibold leading-5 tabular-nums text-white">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-amber-100 bg-amber-50/40 shadow-sm">
        <SectionBand number="1" title="Season Readiness" tone="gold">
          <div className="flex items-center gap-2">
            <select value={start.slice(0, 4)} onChange={(event) => setStart(`${event.target.value}-01-01`)} className="h-7 rounded-md border-0 bg-white px-3 text-caption font-semibold text-slate-700 outline-none">
              {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((year) => <option key={year}>{year}</option>)}
            </select>
            <Button asChild size="sm" variant="secondary" className="h-7 bg-white text-caption text-slate-700 hover:bg-slate-100">
              <Link to="/admin/calendar"><CalendarDays className="mr-1.5 h-3.5 w-3.5" />Manage plan</Link>
            </Button>
          </div>
        </SectionBand>
        <div className="grid gap-3 p-3 lg:grid-cols-3">
          <ReadinessCard icon={Leaf} title="Fertilizer" count={readiness.fertilizer.count} total={readiness.total} completed={readiness.fertilizer.completed} accent="green" />
          <ReadinessCard icon={SunMedium} title="Flower induction" count={readiness.flowering.count} total={readiness.total} completed={readiness.flowering.completed} accent="gold" />
          <ReadinessCard icon={ShoppingBasket} title="Harvest" count={readiness.harvest.count} total={readiness.total} completed={readiness.harvest.completed} accent="leaf" />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-teal-100 bg-teal-50/30 shadow-sm">
        <SectionBand number="2" title="Blocks Overview" subtitle="Your farm blocks and their schedule status." tone="teal">
          <span className="text-caption font-medium text-white/85">{activeBlocks.length} blocks total</span>
        </SectionBand>
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5">
          {activeBlocks.map((block) => <BlockOverviewCard key={block.id} block={block} start={start} end={end} />)}
          {!activeBlocks.length ? (
            <div className="col-span-full rounded-lg border border-dashed border-teal-200 bg-white p-8 text-center text-sm text-slate-500">No active blocks have been added to this farm yet.</div>
          ) : null}
        </div>
        {farm.farmLevelRows.length > 0 ? (
          <div className="mx-3 mb-3 rounded-lg border bg-card p-3">
            <h3 className="mb-2 text-card-title">Farm-level and shared block records</h3>
            <TaskLogMetrics model={taskLogTotals(farm.farmLevelRows)} compact />
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-blue-100 bg-blue-50/30 shadow-sm">
        <SectionBand number="3" title="Production Overview" subtitle="Farm performance and land allocation." tone="blue">
          <div className="flex flex-wrap items-center gap-2 text-caption text-white/85">
            <span className="font-medium">{start || end ? "Reporting period" : "Reporting period · All dates"}</span>
            <label className="relative rounded-md bg-white/10 px-2 py-1 text-label"><span className="sr-only">Start date</span><input type="date" value={start} onChange={(event) => setStart(event.target.value)} className="bg-transparent text-white outline-none [color-scheme:dark]" /></label>
            <span>–</span>
            <label className="relative rounded-md bg-white/10 px-2 py-1 text-label"><span className="sr-only">End date</span><input type="date" value={end} onChange={(event) => setEnd(event.target.value)} className="bg-transparent text-white outline-none [color-scheme:dark]" /></label>
          </div>
        </SectionBand>
        <div className="grid min-w-0 items-start gap-3 p-3 lg:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)]">
          <FarmPerformanceTrends
            key={farm.id}
            activities={farm.performanceActivities}
            profileScope={scopeLabel(farm.name)}
            year={trendYear}
            onYearChange={setTrendYear}
            blockChart={<BlockPerformanceChart rows={farm.blocks.filter(block => block.activity_periods.length > 0).map((block) => {
              const { totalCost, totalRevenue, totalYieldKg } = taskLogTotals(block.activity_periods);
              return {
                id: block.id,
                blockLabel: blockLabel(block),
                farmName: scopeLabel(farm.name),
                cost: totalCost,
                revenue: totalRevenue,
                yieldKg: totalYieldKg,
              };
            })} />}
          />
          <article className="min-h-60 rounded-lg border border-slate-100 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
            <h3 className="text-slate-800 text-card-title">Land allocation</h3>
            <div className="mt-1 flex items-end justify-between"><p className="font-heading text-3xl font-bold text-blue-700">{formatNumber(analytics.allocationPercent || 0, 0)}%</p><Sprout className="h-7 w-7 text-teal-600" /></div>
            <AnalyticsPie title="Land allocation" unit="acres" rows={unallocated == null ? [] : [
              { name: "Allocated", value: analytics.totalAllocatedSizeAcres, color: "#16834e" },
              { name: "Unallocated", value: unallocated, color: "#94a3b8" },
            ]} emptyMessage="No land area recorded for this farm." />
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 text-caption">
              <div><dt className="text-slate-500">Allocated</dt><dd className="mt-1 font-semibold text-slate-700">{formatNumber(analytics.totalAllocatedSizeAcres || 0)} ac</dd></div>
              <div><dt className="text-slate-500">Unallocated</dt><dd className="mt-1 font-semibold text-slate-700">{unallocated == null ? "No data yet" : `${formatNumber(unallocated)} ac`}</dd></div>
              <div><dt className="text-slate-500">Yield / acre</dt><dd className="mt-1 font-semibold text-slate-700">{analytics.yieldPerAcre == null ? "No data yet" : `${formatNumber(analytics.yieldPerAcre)} Kg`}</dd></div>
              <div><dt className="text-slate-500">Current stage</dt><dd className="mt-1 font-semibold text-slate-700">{currentStage}</dd></div>
            </dl>
          </article>
        </div>
      </section>

      <TaskLogRecords activities={activityPeriods} />

      <FarmFormDialog
        open={farmDialog}
        onOpenChange={setFarmDialog}
        farm={farm}
        saving={saving}
        onSubmit={(payload) =>
          mutate(
            async () => {
              const { image_file: imageFile, ...farmPayload } = payload;
              if (imageFile) {
                const uploaded = await base44.files.upload(imageFile, farm.id);
                farmPayload.image_url = `${uploaded.url}?preview=1`;
              }
              return base44.farms.update(farm.id, farmPayload);
            },
            "Farm profile updated",
            () => setFarmDialog(false),
          )
        }
      />
      <BlockFormDialog open={blockDialog} onOpenChange={setBlockDialog} saving={saving} unallocatedAcres={unallocated} onSubmit={(payload) => mutate(() => base44.farms.createBlock(farm.id, payload), "Block created", () => setBlockDialog(false))} />
      <StatusActionDialog open={Boolean(statusDialog)} onOpenChange={(open) => !open && setStatusDialog(null)} entityLabel={scopeLabel(farm.name)} action={statusDialog || "deactivate"} saving={saving} onSubmit={(payload) => mutate(() => statusDialog === "deactivate" ? base44.farms.deactivate(farm.id, payload) : base44.farms.reactivate(farm.id), `Farm ${statusDialog === "deactivate" ? "deactivated" : "reactivated"}`, () => setStatusDialog(null))} />
      <MergeBlocksDialog open={mergeDialog} onOpenChange={setMergeDialog} farm={farm} blocks={farm.blocks || []} saving={saving} loadImpact={loadImpact} onSubmit={(payload) => mutate(() => base44.farms.mergeBlocks(payload), "Blocks merged safely", () => setMergeDialog(false))} />
    </div>
  );
}
