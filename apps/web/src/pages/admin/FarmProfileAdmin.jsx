import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Edit3,
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
import YieldChart from "@/components/farm/YieldChart";
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

const currentYearStart = () => `${new Date().getFullYear()}-01-01`;
const today = () => new Date().toISOString().slice(0, 10);
const fallbackFarmImage = "/pages/local-supply-header.webp";

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
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[11px] font-extrabold text-slate-700">
            {number}
          </span>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-0.5">
          <h2 className="font-heading text-sm font-semibold tracking-wide">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-[10px] font-medium text-white/80">{subtitle}</p>
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
        <h3 className="text-xs font-semibold text-slate-800">{title}</h3>
        <p className="mt-0.5 text-[10px] font-medium text-slate-600">
          {count ? `${count} of ${total} blocks scheduled` : "Not scheduled"}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Progress value={percent} className="h-1.5 flex-1 bg-slate-100" />
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
            {percent}%
          </span>
        </div>
        <p className="mt-1.5 text-[9px] text-slate-500">
          {count ? `${completed} completed` : `0 / ${total} stages scheduled`}
        </p>
      </div>
    </article>
  );
}

function BlockStage({ icon: Icon, label, scheduled }) {
  return (
    <div className="flex items-center gap-1.5 text-[9px] text-slate-600">
      <Icon className="h-3 w-3 text-slate-500" />
      <span>{label}</span>
      <span className={`ml-auto h-1.5 w-1.5 rounded-full ${scheduled ? "bg-emerald-500" : "bg-amber-400"}`} />
      <span className="min-w-14 text-right text-[8px] text-slate-500">
        {scheduled ? "Scheduled" : "Not scheduled"}
      </span>
    </div>
  );
}

function BlockOverviewCard({ block, activityPeriods }) {
  const activities = activityPeriods.filter((period) => period.block_id === block.id);
  const fertilizer = activities.some((period) => /fertili/i.test(period.activity_type));
  const flowering = activities.some((period) => /flower|induction/i.test(period.activity_type));
  const harvest = Boolean(blockHarvest(block));
  const scheduled = [fertilizer, flowering, harvest].filter(Boolean).length;
  const completed = activities.filter((period) => period.status === "completed").length;
  return (
    <Link
      to={`/admin/farm-daily-activities/activities/farms/${block.farm_id}/blocks/${block.id}`}
      className="group min-w-0 rounded-lg border border-slate-100 bg-white p-3 shadow-[0_2px_12px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded bg-teal-600 px-2 py-0.5 text-[9px] font-bold text-white">
          {block.block_code}
        </span>
        <span className="text-[8px] font-medium uppercase tracking-wide text-slate-400">
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
      <div className="mt-2 border-t border-slate-100 pt-2 text-center text-[8px] font-medium text-slate-500">
        {scheduled} / 3 planned&nbsp;&nbsp; • &nbsp;&nbsp;{completed} / 3 completed
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
  const [start, setStart] = useState(currentYearStart());
  const [end, setEnd] = useState(today());
  const [farmDialog, setFarmDialog] = useState(false);
  const [blockDialog, setBlockDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(null);
  const [mergeDialog, setMergeDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadFarm = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setFarm(await base44.farms.get(farmId, { start, end }));
    } catch (loadError) {
      setError(loadError.message || "Unable to load this farm.");
    } finally {
      setLoading(false);
    }
  }, [end, farmId, start]);

  useEffect(() => {
    loadFarm();
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
      await loadFarm();
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
        completed: matching.filter((period) => period.status === "completed").length,
      };
    };
    return {
      total,
      fertilizer: summarize((period) => /fertili/i.test(period.activity_type)),
      flowering: summarize((period) => /flower|induction/i.test(period.activity_type)),
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
  const currentStage = analytics.mixedActivityStages
    ? "Mixed stages"
    : analytics.currentActivityStage
      ? humanize(analytics.currentActivityStage)
      : "No data yet";

  return (
    <div className="space-y-2.5 pb-10">
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

      <section className="overflow-hidden rounded-xl border border-emerald-900/10 bg-slate-50 shadow-sm lg:sticky lg:top-16 lg:z-30 lg:shadow-lg">
        <SectionBand title="Farm Summary" tone="green" />
        <div className="bg-gradient-to-r from-emerald-950 to-emerald-800 px-4 pb-4 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <img
              src={farm.image_url || fallbackFarmImage}
              alt={`${farm.name} farm`}
              className="h-28 w-full rounded-lg border border-white/20 object-cover object-[70%_center] shadow-sm sm:w-60 lg:h-28 lg:w-60"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <h1 className="shrink-0 font-heading text-2xl font-semibold sm:text-3xl">{farm.name}</h1>
                <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2 text-[9px] sm:grid-cols-3">
                  <div className="flex gap-1.5">
                    <span className="text-lime-300"><Ruler className="h-4 w-4" /></span>
                    <div><dt className="text-emerald-100/80">Declared area</dt><dd className="font-semibold">{farm.size_acres == null ? "No data yet" : `${formatNumber(farm.size_acres)} ac`}</dd></div>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="text-lime-300"><Trees className="h-4 w-4" /></span>
                    <div><dt className="text-emerald-100/80">Current trees</dt><dd className="font-semibold">{analytics.inventoryRecordCount ? formatNumber(analytics.totalTrees, 0) : "No data yet"}</dd></div>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="text-lime-300"><TrendingUp className="h-4 w-4" /></span>
                    <div><dt className="text-emerald-100/80">Yield in period</dt><dd className="font-semibold">{analytics.yieldRecordCount ? `${formatNumber(analytics.totalYieldKg)} kg` : "No data yet"}</dd></div>
                  </div>
                </dl>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-emerald-100">
                <button
                  type="button"
                  disabled={!canManageFarms(user?.role)}
                  onClick={() => setStatusDialog(farm.status === "active" ? "deactivate" : "reactivate")}
                  className="rounded-full bg-emerald-400/20 px-2.5 py-1 font-semibold text-emerald-200 disabled:cursor-default"
                >
                  <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-lime-400" />
                  {humanize(farm.status)}
                </button>
                <span className="text-white/35">|</span>
                <span>Updated {formatDate(farm.updated_at)}</span>
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-3 text-[9px] sm:grid-cols-4">
                <div className="flex gap-2">
                  <span className="text-amber-300"><Leaf className="h-5 w-5" /></span>
                  <div><dt className="text-emerald-100/80">Mango variety</dt><dd className="mt-0.5 font-semibold">{blockVarieties.join(", ") || "Not recorded"}</dd></div>
                </div>
                <div className="flex gap-2">
                  <span className="text-lime-300"><ShoppingBasket className="h-5 w-5" /></span>
                  <div><dt className="text-emerald-100/80">Harvest type</dt><dd className="mt-0.5 font-semibold">{harvestTypes.map(humanize).join(", ") || "Not scheduled"}</dd></div>
                </div>
                <div className="flex gap-2">
                  <span className="text-amber-300"><CalendarDays className="h-5 w-5" /></span>
                  <div><dt className="text-emerald-100/80">Next harvest period</dt><dd className="mt-0.5 font-semibold">{periodLabel(nextHarvest)}</dd></div>
                </div>
                <div className="flex gap-2">
                  <span className="text-emerald-200"><Grid2X2 className="h-5 w-5" /></span>
                  <div><dt className="text-emerald-100/80">Active blocks</dt><dd className="mt-0.5 font-semibold">{activeBlocks.length}</dd></div>
                </div>
              </dl>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-start">
              {canManageBlocks(user?.role) && farm.status === "active" ? (
                <Button size="sm" onClick={() => setBlockDialog(true)} className="border border-lime-400/40 bg-emerald-900 text-white hover:bg-emerald-800">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />Add block
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="secondary" className="h-9 w-9 bg-white text-slate-800 hover:bg-slate-100" aria-label="More farm actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canManageFarms(user?.role) ? (
                    <DropdownMenuItem onClick={() => setFarmDialog(true)}>
                      <Edit3 className="mr-2 h-4 w-4" />Edit farm
                    </DropdownMenuItem>
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
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-amber-100 bg-amber-50/40 shadow-sm">
        <SectionBand number="1" title="Season Readiness" subtitle="Farm and block windows at a glance for faster planning" tone="gold">
          <div className="flex items-center gap-2">
            <select value={start.slice(0, 4)} onChange={(event) => setStart(`${event.target.value}-01-01`)} className="h-7 rounded-md border-0 bg-white px-3 text-[10px] font-semibold text-slate-700 outline-none">
              {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((year) => <option key={year}>{year}</option>)}
            </select>
            <Button asChild size="sm" variant="secondary" className="h-7 bg-white text-[10px] text-slate-700 hover:bg-slate-100">
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
          <span className="text-[10px] font-medium text-white/85">{activeBlocks.length} blocks total</span>
        </SectionBand>
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5">
          {activeBlocks.map((block) => <BlockOverviewCard key={block.id} block={block} activityPeriods={activityPeriods} />)}
          {!activeBlocks.length ? (
            <div className="col-span-full rounded-lg border border-dashed border-teal-200 bg-white p-8 text-center text-sm text-slate-500">No active blocks have been added to this farm yet.</div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-blue-100 bg-blue-50/30 shadow-sm">
        <SectionBand number="3" title="Production Overview" subtitle="Yield and allocation for the selected reporting period." tone="blue">
          <div className="flex flex-wrap items-center gap-2 text-[9px] text-white/85">
            <span className="font-medium">Reporting period</span>
            <label className="rounded-md bg-white/10 px-2 py-1"><span className="sr-only">Start date</span><input type="date" value={start} onChange={(event) => setStart(event.target.value)} className="bg-transparent text-white outline-none [color-scheme:dark]" /></label>
            <span>–</span>
            <label className="rounded-md bg-white/10 px-2 py-1"><span className="sr-only">End date</span><input type="date" value={end} onChange={(event) => setEnd(event.target.value)} className="bg-transparent text-white outline-none [color-scheme:dark]" /></label>
          </div>
        </SectionBand>
        <div className="grid gap-3 p-3 lg:grid-cols-[1.7fr_1fr]">
          <article className="min-h-60 rounded-lg border border-slate-100 bg-white p-3 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-xs font-semibold text-slate-800">Farm yield trend</h3><p className="mt-0.5 text-[9px] text-slate-500">Actual and forecast harvest weight in kilograms.</p></div><span className="rounded-md border px-2 py-1 text-[9px] font-medium text-slate-600">Monthly</span></div>
            {farm.yield_records?.length ? (
              <div className="mt-3"><YieldChart records={farm.yield_records} title="" /></div>
            ) : (
              <div className="grid min-h-36 place-items-center text-center"><div><span className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-400"><TrendingUp className="h-5 w-5" /></span><p className="mt-2 text-[10px] font-semibold text-slate-700">No yield data for this period</p><p className="mt-1 text-[9px] text-slate-500">Once block yield records are added, actual and forecast trends will appear here.</p></div></div>
            )}
          </article>
          <article className="min-h-60 rounded-lg border border-slate-100 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
            <h3 className="text-xs font-semibold text-slate-800">Land allocation</h3>
            <div className="mt-1 flex items-end justify-between"><p className="font-heading text-3xl font-bold text-blue-700">{formatNumber(analytics.allocationPercent || 0, 0)}%</p><Sprout className="h-7 w-7 text-teal-600" /></div>
            <Progress value={Math.min(100, analytics.allocationPercent || 0)} className="mt-3 h-1.5 bg-slate-100" />
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 text-[9px]">
              <div><dt className="text-slate-500">Allocated</dt><dd className="mt-1 font-semibold text-slate-700">{formatNumber(analytics.totalAllocatedSizeAcres || 0)} ac</dd></div>
              <div><dt className="text-slate-500">Unallocated</dt><dd className="mt-1 font-semibold text-slate-700">{unallocated == null ? "No data yet" : `${formatNumber(unallocated)} ac`}</dd></div>
              <div><dt className="text-slate-500">Yield / acre</dt><dd className="mt-1 font-semibold text-slate-700">{analytics.yieldPerAcre == null ? "No data yet" : `${formatNumber(analytics.yieldPerAcre)} kg`}</dd></div>
              <div><dt className="text-slate-500">Current stage</dt><dd className="mt-1 font-semibold text-slate-700">{currentStage}</dd></div>
            </dl>
          </article>
        </div>
      </section>

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
      <StatusActionDialog open={Boolean(statusDialog)} onOpenChange={(open) => !open && setStatusDialog(null)} entityLabel={farm.name} action={statusDialog || "deactivate"} saving={saving} onSubmit={(payload) => mutate(() => statusDialog === "deactivate" ? base44.farms.deactivate(farm.id, payload) : base44.farms.reactivate(farm.id), `Farm ${statusDialog === "deactivate" ? "deactivated" : "reactivated"}`, () => setStatusDialog(null))} />
      <MergeBlocksDialog open={mergeDialog} onOpenChange={setMergeDialog} farm={farm} blocks={farm.blocks || []} saving={saving} loadImpact={loadImpact} onSubmit={(payload) => mutate(() => base44.farms.mergeBlocks(payload), "Blocks merged safely", () => setMergeDialog(false))} />
    </div>
  );
}
