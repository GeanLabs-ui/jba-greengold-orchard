import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarRange,
  ChevronRight,
  ClipboardList,
  Edit3,
  FileText,
  Layers3,
  LayoutDashboard,
  MapPin,
  Merge,
  MoreHorizontal,
  Plus,
  Ruler,
  Sprout,
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
import FarmFieldLogs from "@/components/farm/FarmFieldLogs";
import FarmSeasonChecklist, {
  FarmSeasonSummary,
} from "@/components/farm/FarmSeasonChecklist";
import EditableStatusBadge from "@/components/shared/EditableStatusBadge";
import YieldChart from "@/components/farm/YieldChart";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/AuthContext";
import {
  canChangeBlockStatus,
  canManageBlocks,
  canManageFarms,
  canMergeBlocks,
  formatDate,
  formatNumber,
  humanize,
} from "@/lib/farm-management";

const currentYearStart = () => `${new Date().getFullYear()}-01-01`;
const today = () => new Date().toISOString().slice(0, 10);
const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "blocks", label: "Blocks", icon: Layers3 },
  { id: "season", label: "Season checklist", icon: CalendarCheck2 },
  { id: "logs", label: "Field logs", icon: ClipboardList },
  { id: "details", label: "Farm details", icon: FileText },
];

const Detail = ({ label, value }) => (
  <div className="border-b py-3 last:border-b-0">
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd className="mt-1 text-sm font-medium">{value || "No data yet"}</dd>
  </div>
);

function Metric({ icon: Icon, label, value, detail }) {
  const isYield = /yield/i.test(label);
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-4 w-4 text-emerald-700" />
        {label}
      </div>
      <p className={`mt-2 truncate font-heading text-2xl font-semibold tabular-nums ${isYield ? 'text-emerald-700' : ''}`}>
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function SectionNav({ active, counts, onChange }) {
  return (
    <nav
      className="sticky top-0 z-20 mt-4 overflow-x-auto rounded-xl border bg-background/95 p-1.5 shadow-sm backdrop-blur"
      aria-label="Farm profile sections"
    >
      <div className="flex min-w-max gap-1">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={active === id ? "page" : undefined}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${active === id ? "bg-emerald-950 text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {counts[id] != null ? (
              <span
                className={`rounded-full px-1.5 text-[10px] ${active === id ? "bg-white/15" : "bg-muted"}`}
              >
                {counts[id]}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </nav>
  );
}

const maturityPercent = (block) =>
  block.shoot_maturity == null
    ? null
    : Math.round(Number(block.shoot_maturity) * 100);

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

function CardDatum({ label, value, accent = false }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm font-semibold ${accent ? "text-emerald-800" : "text-foreground"}`}
      >
        {value ?? "Not recorded"}
      </dd>
    </div>
  );
}

function BlockDecisionCard({ block, farm, canChangeStatus, onStatusChange }) {
  const maturity = maturityPercent(block);
  const harvest = blockHarvest(block);
  const varieties = block.varieties?.length
    ? block.varieties.join(", ")
    : block.variety || "Mango · variety not recorded";

  return (
    <article className="group relative flex min-h-full flex-col overflow-hidden rounded-xl border bg-card transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
      <Link
        to={`/admin/farm-daily-activities/activities/farms/${farm.id}/blocks/${block.id}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        aria-label={`Open ${block.name} profile to view or update details`}
      />
      <div className="h-1 bg-emerald-800" />
      <div className="pointer-events-none relative z-[1] flex flex-1 flex-col p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              {block.block_code}
            </p>
            <h3 className="mt-1 truncate font-heading text-xl font-semibold">
              {block.name}
            </h3>
          </div>
          <EditableStatusBadge
            status={block.status}
            canEdit={canChangeStatus && block.status !== "merged"}
            entityLabel={block.name}
            className="pointer-events-auto"
            onClick={() => onStatusChange(block)}
          />
        </header>
        <p className="mt-2 min-h-10 line-clamp-2 text-sm leading-5 text-muted-foreground">
          {block.description || "Description not recorded"}
        </p>

        <dl className="mt-4 grid grid-cols-3 divide-x rounded-lg bg-emerald-50/60 py-3 text-center">
          <div className="px-2">
            <dt className="text-[10px] uppercase text-emerald-800/70">Trees</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-emerald-950">
              {block.inventory_record_count
                ? formatNumber(block.total_trees, 0)
                : "—"}
            </dd>
          </div>
          <div className="min-w-0 px-2">
            <dt className="text-[10px] uppercase text-emerald-800/70">
              Harvest
            </dt>
            <dd className="mt-1 truncate text-sm font-semibold text-emerald-950">
              {harvest?.harvest_type
                ? humanize(harvest.harvest_type)
                : "Not planned"}
            </dd>
          </div>
          <div className="px-2">
            <dt className="text-[10px] uppercase text-emerald-800/70">
              Maturity
            </dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-emerald-950">
              {maturity == null ? "—" : `${maturity}%`}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              Shoot maturity
            </span>
            <span className="font-semibold">
              {maturity == null ? "Not recorded" : `${maturity}%`}
            </span>
          </div>
          <Progress className="mt-2 h-1.5" value={maturity || 0} />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
          <CardDatum
            label="Early block"
            value={block.early_block_classification}
          />
          <CardDatum label="Year planted" value={block.year_planted} />
          <CardDatum
            label="Area"
            value={
              block.size_acres == null
                ? null
                : `${formatNumber(block.size_acres)} ac`
            }
          />
          <CardDatum label="Mango varieties" value={varieties} accent />
          <CardDatum
            label="Forecast yield"
            value={
              block.forecast_yield_kg == null
                ? null
                : `${formatNumber(block.forecast_yield_kg)} kg`
            }
          />
          <CardDatum
            label="Actual yield"
            value={
              block.yield_record_count
                ? `${formatNumber(block.period_yield_kg)} kg`
                : null
            }
          />
          <CardDatum label="Fruit flies" value={block.fruit_fly_pressure} />
          <CardDatum label="Disease" value={block.disease_rating} />
          <CardDatum
            label="Farm status"
            value={farm.status ? humanize(farm.status) : null}
          />
        </dl>

        <div className="mt-5 rounded-lg border border-dashed px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Harvest season / period
          </p>
          <div className="mt-1 flex items-center gap-2 text-sm font-medium">
            <CalendarRange className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>{periodLabel(harvest)}</span>
            {harvest?.status ? <StatusBadge status={harvest.status} /> : null}
          </div>
        </div>

        <footer className="mt-auto flex items-center justify-between border-t pt-4 text-sm">
          <span className="font-medium text-emerald-800">
            View or update block
          </span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </footer>
      </div>
    </article>
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
  const [filters, setFilters] = useState({
    status: "active",
    variety: "all",
    stage: "all",
    harvest: "all",
  });
  const [farmDialog, setFarmDialog] = useState(false);
  const [blockDialog, setBlockDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(null);
  const [blockStatusDialog, setBlockStatusDialog] = useState(null);
  const [mergeDialog, setMergeDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const requestedSection = searchParams.get("tab");
  const activeSection = SECTIONS.some(
    (section) => section.id === requestedSection,
  )
    ? requestedSection
    : "overview";
  const setActiveSection = (section) => {
    const next = new URLSearchParams(searchParams);
    if (section === "overview") next.delete("tab");
    else next.set("tab", section);
    next.delete("action");
    setSearchParams(next, { replace: true });
  };

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
    if (
      searchParams.get("action") === "add-block" &&
      canManageBlocks(user?.role)
    ) {
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
  const unallocated = analytics.unallocatedSizeAcres;
  const blockVarieties = useMemo(
    () =>
      [
        ...new Set(
          (farm?.blocks || []).flatMap((block) =>
            [...(block.varieties || []), block.variety].filter(Boolean),
          ),
        ),
      ].sort(),
    [farm],
  );
  const stages = useMemo(
    () =>
      [
        ...new Set(
          (farm?.blocks || [])
            .map((block) => block.current_activity?.activity_type)
            .filter(Boolean),
        ),
      ].sort(),
    [farm],
  );
  const harvests = useMemo(
    () =>
      [
        ...new Set(
          (farm?.blocks || [])
            .map((block) => blockHarvest(block)?.harvest_type)
            .filter(Boolean),
        ),
      ].sort(),
    [farm],
  );
  const farmHarvestPeriods = farm?.harvest_periods || [];
  const farmHarvestTypes = [
    ...new Set(
      farmHarvestPeriods.map((period) => period.harvest_type).filter(Boolean),
    ),
  ];
  const activeOrPlannedHarvests = farmHarvestPeriods.filter((period) =>
    ["active", "planned"].includes(period.status),
  );
  const nextHarvest = [...activeOrPlannedHarvests].sort((left, right) =>
    String(left.expected_start_date || "9999").localeCompare(
      String(right.expected_start_date || "9999"),
    ),
  )[0];
  const filteredBlocks = useMemo(
    () =>
      (farm?.blocks || []).filter(
        (block) =>
          (filters.status === "all" || block.status === filters.status) &&
          (filters.variety === "all" ||
            block.varieties?.includes(filters.variety) ||
            block.variety === filters.variety) &&
          (filters.stage === "all" ||
            block.current_activity?.activity_type === filters.stage) &&
          (filters.harvest === "all" ||
            blockHarvest(block)?.harvest_type === filters.harvest),
      ),
    [farm, filters],
  );
  const loadImpact = useCallback((id) => base44.farms.mergeImpact(id), []);

  if (loading && !farm)
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  if (error && !farm)
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="font-medium text-destructive">
          This farm could not be loaded
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-4" variant="outline" onClick={loadFarm}>
          Try again
        </Button>
      </div>
    );
  if (!farm) return null;

  return (
    <div className="pb-10">
      <Button variant="ghost" asChild className="-ml-3 mb-3">
        <Link to="/admin/farm-daily-activities/activities/farms">
          <ArrowLeft className="mr-2 h-4 w-4" />
          All farms
        </Link>
      </Button>
      <header className="overflow-hidden rounded-xl bg-emerald-950 text-white">
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                {farm.farm_code}
              </span>
            </div>
            <h1 className="mt-1.5 font-heading text-3xl font-semibold">
              {farm.name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-100">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {farm.location || farm.region || "Location not recorded"}
              </span>
              <span>Updated {formatDate(farm.updated_at)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManageBlocks(user?.role) && farm.status === "active" ? (
              <Button onClick={() => setBlockDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add block
              </Button>
            ) : null}
            {canManageFarms(user?.role) ? (
              <Button variant="secondary" onClick={() => setFarmDialog(true)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit farm
              </Button>
            ) : null}
            {canManageFarms(user?.role) || canMergeBlocks(user?.role) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="More farm actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canMergeBlocks(user?.role) &&
                  farm.blocks?.filter((block) => block.status === "active")
                    .length > 1 ? (
                    <DropdownMenuItem onClick={() => setMergeDialog(true)}>
                      <Merge className="mr-2 h-4 w-4" />
                      Merge blocks
                    </DropdownMenuItem>
                  ) : null}
                  {canManageFarms(user?.role) ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className={
                          farm.status === "active" ? "text-destructive" : ""
                        }
                        onClick={() =>
                          setStatusDialog(
                            farm.status === "active"
                              ? "deactivate"
                              : "reactivate",
                          )
                        }
                      >
                        {farm.status === "active"
                          ? "Deactivate farm"
                          : "Reactivate farm"}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        <div
          className="grid border-t border-white/10 bg-black/10 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Farm decision snapshot"
        >
          <div className="border-b border-white/10 px-5 py-4 sm:border-r xl:border-b-0 sm:px-7">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200/75">
              Farm status
            </p>
            <div className="mt-2">
              <EditableStatusBadge
                status={farm.status}
                canEdit={canManageFarms(user?.role)}
                entityLabel={farm.name}
                onClick={() =>
                  setStatusDialog(
                    farm.status === "active" ? "deactivate" : "reactivate",
                  )
                }
              />
            </div>
            {canManageFarms(user?.role) ? (
              <p className="mt-1.5 text-[10px] text-emerald-100/65">
                Click status to change
              </p>
            ) : null}
          </div>
          <div className="border-b border-white/10 px-5 py-4 xl:border-b-0 xl:border-r xl:border-white/10 sm:px-7">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200/75">
              Mango varieties
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {blockVarieties.length
                ? blockVarieties.join(", ")
                : "Not recorded"}
            </p>
          </div>
          <div className="border-b border-white/10 px-5 py-4 sm:border-r xl:border-b-0 sm:px-7">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200/75">
              Harvest types
            </p>
            <p className="mt-2 text-sm font-semibold">
              {farmHarvestTypes.length
                ? farmHarvestTypes.map(humanize).join(", ")
                : "Not scheduled"}
            </p>
            <p className="mt-1 text-xs text-emerald-100/65">
              {activeOrPlannedHarvests.length} active or planned period
              {activeOrPlannedHarvests.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="px-5 py-4 sm:px-7">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200/75">
              Next harvest period
            </p>
            <p className="mt-2 flex items-start gap-2 text-sm font-semibold">
              <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <span>{periodLabel(nextHarvest)}</span>
            </p>
          </div>
        </div>
      </header>

      <SectionNav
        active={activeSection}
        counts={{ blocks: farm.blocks?.length || 0 }}
        onChange={setActiveSection}
      />
      {error ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          The latest refresh failed: {error}. The last loaded values are still
          shown.
        </div>
      ) : null}

      {activeSection === "overview" ? (
        <div className="mt-5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          <section className="grid overflow-hidden rounded-xl border bg-card sm:grid-cols-2 sm:divide-x xl:grid-cols-4">
            <Metric
              icon={Ruler}
              label="Declared area"
              value={
                farm.size_acres == null
                  ? "No data yet"
                  : `${formatNumber(farm.size_acres)} ac`
              }
              detail={`${formatNumber(analytics.totalAllocatedSizeAcres || 0)} acres allocated`}
            />
            <Metric
              icon={Layers3}
              label="Active blocks"
              value={formatNumber(analytics.blockCounts?.active || 0, 0)}
              detail={`${analytics.blockCounts?.inactive || 0} inactive · ${analytics.blockCounts?.merged || 0} merged`}
            />
            <Metric
              icon={Trees}
              label="Current trees"
              value={
                analytics.inventoryRecordCount
                  ? formatNumber(analytics.totalTrees, 0)
                  : "No data yet"
              }
              detail={
                analytics.inventoryRecordCount
                  ? `${formatNumber(analytics.productiveTrees, 0)} productive`
                  : "Inventory can be added later"
              }
            />
            <Metric
              icon={TrendingUp}
              label="Yield in period"
              value={
                analytics.yieldRecordCount
                  ? `${formatNumber(analytics.totalYieldKg)} kg`
                  : "No data yet"
              }
              detail={
                analytics.yieldRecordCount
                  ? `${formatNumber(analytics.forecastYieldKg)} kg forecast`
                  : "Yield records can be added later"
              }
            />
          </section>
          <FarmSeasonSummary
            farm={farm}
            blocks={farm.blocks || []}
            onManage={() => setActiveSection("season")}
          />
          <section className="mt-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold">
                Production overview
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Yield and allocation for the selected reporting period.
              </p>
            </div>
            <div className="flex gap-2">
              <label className="text-[11px] font-medium text-muted-foreground">
                From
                <Input
                  className="mt-1 h-9"
                  type="date"
                  value={start}
                  max={end}
                  onChange={(event) => setStart(event.target.value)}
                />
              </label>
              <label className="text-[11px] font-medium text-muted-foreground">
                To
                <Input
                  className="mt-1 h-9"
                  type="date"
                  value={end}
                  min={start}
                  max={today()}
                  onChange={(event) => setEnd(event.target.value)}
                />
              </label>
            </div>
          </section>
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.75fr)]">
            <YieldChart records={farm.yield_records} title="Farm yield trend" />
            <section className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Land allocation
                  </p>
                  <p className="mt-1 font-heading text-3xl font-semibold">
                    {formatNumber(analytics.allocationPercent || 0)}%
                  </p>
                </div>
                <Sprout className="h-8 w-8 text-emerald-700" />
              </div>
              <Progress
                className="mt-5 h-2"
                value={Math.min(100, analytics.allocationPercent || 0)}
              />
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Allocated</dt>
                  <dd className="mt-1 font-semibold">
                    {formatNumber(analytics.totalAllocatedSizeAcres || 0)} ac
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Unallocated</dt>
                  <dd className="mt-1 font-semibold">
                    {formatNumber(unallocated)} ac
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Yield / acre
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {analytics.yieldPerAcre == null
                      ? "No data yet"
                      : `${formatNumber(analytics.yieldPerAcre)} kg`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Current stage
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {analytics.mixedActivityStages
                      ? "Mixed stages"
                      : analytics.currentActivityStage
                        ? humanize(analytics.currentActivityStage)
                        : "No data yet"}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      ) : null}

      {activeSection === "blocks" ? (
        <section className="mt-5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-heading text-2xl font-semibold">
                Block register
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredBlocks.length} of {farm.blocks?.length || 0} blocks
                shown. Select a card to view or update its full profile.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((current) => ({ ...current, status: value }))
                }
              >
                <SelectTrigger className="sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="merged">Merged</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.variety}
                onValueChange={(value) =>
                  setFilters((current) => ({ ...current, variety: value }))
                }
              >
                <SelectTrigger className="sm:w-36">
                  <SelectValue placeholder="Variety" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All varieties</SelectItem>
                  {blockVarieties.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.stage}
                onValueChange={(value) =>
                  setFilters((current) => ({ ...current, stage: value }))
                }
              >
                <SelectTrigger className="sm:w-36">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {stages.map((item) => (
                    <SelectItem key={item} value={item}>
                      {humanize(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.harvest}
                onValueChange={(value) =>
                  setFilters((current) => ({ ...current, harvest: value }))
                }
              >
                <SelectTrigger className="sm:w-36">
                  <SelectValue placeholder="Harvest" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All harvests</SelectItem>
                  {harvests.map((item) => (
                    <SelectItem key={item} value={item}>
                      {humanize(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {filteredBlocks.length ? (
            <div className="mt-4 grid items-stretch gap-4 xl:grid-cols-2">
              {filteredBlocks.map((block) => (
                <BlockDecisionCard
                  key={block.id}
                  block={block}
                  farm={farm}
                  canChangeStatus={canChangeBlockStatus(user?.role)}
                  onStatusChange={(selectedBlock) =>
                    setBlockStatusDialog({
                      block: selectedBlock,
                      action:
                        selectedBlock.status === "active"
                          ? "deactivate"
                          : "reactivate",
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed p-10 text-center">
              <Layers3 className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 font-medium">No blocks match these filters</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Change a filter or add the first operational block.
              </p>
              {canManageBlocks(user?.role) && farm.status === "active" ? (
                <Button className="mt-4" onClick={() => setBlockDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add block
                </Button>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {activeSection === "season" ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          <FarmSeasonChecklist
            farm={farm}
            blocks={farm.blocks || []}
            canEdit={canManageBlocks(user?.role)}
            className="mt-5"
          />
        </div>
      ) : null}

      {activeSection === "logs" ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          <FarmFieldLogs
            farm={farm}
            blocks={farm.blocks || []}
            canCreate={canManageBlocks(user?.role)}
            className="mt-5"
          />
        </div>
      ) : null}

      {activeSection === "details" ? (
        <section className="mt-5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="font-heading text-2xl font-semibold">
                Farm details
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Registration, ownership, location, and soil information.
              </p>
            </div>
            {canManageFarms(user?.role) ? (
              <Button variant="outline" onClick={() => setFarmDialog(true)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit details
              </Button>
            ) : null}
          </div>
          <div className="mt-3 grid gap-x-10 md:grid-cols-2 xl:grid-cols-3">
            <dl>
              <Detail label="Farm code" value={farm.farm_code} />
              <Detail label="Location" value={farm.location} />
              <Detail label="Region" value={farm.region} />
              <Detail
                label="GPS coordinates"
                value={
                  farm.latitude != null && farm.longitude != null
                    ? `${farm.latitude}, ${farm.longitude}`
                    : null
                }
              />
            </dl>
            <dl>
              <Detail
                label="Operations started"
                value={formatDate(farm.operations_started_on)}
              />
              <Detail
                label="Planting started"
                value={formatDate(farm.planting_started_on)}
              />
              <Detail label="Ownership reference" value={farm.owner_name} />
              <Detail label="Soil type" value={farm.soil_type} />
            </dl>
            <dl>
              <Detail label="Created" value={formatDate(farm.created_at)} />
              <Detail
                label="Last updated"
                value={formatDate(farm.updated_at)}
              />
              <Detail label="Country" value={farm.country} />
              <Detail
                label="Soil pH"
                value={farm.soil_ph == null ? null : String(farm.soil_ph)}
              />
            </dl>
          </div>
          {farm.description ? (
            <div className="mt-5 border-t pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <p className="mt-2 max-w-4xl text-sm leading-6">
                {farm.description}
              </p>
            </div>
          ) : null}
          {farm.soil_notes ? (
            <div className="mt-5 border-t pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Soil profile notes
              </p>
              <p className="mt-2 max-w-4xl text-sm leading-6">
                {farm.soil_notes}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <FarmFormDialog
        open={farmDialog}
        onOpenChange={setFarmDialog}
        farm={farm}
        saving={saving}
        onSubmit={(payload) =>
          mutate(
            () => base44.farms.update(farm.id, payload),
            "Farm profile updated",
            () => setFarmDialog(false),
          )
        }
      />
      <BlockFormDialog
        open={blockDialog}
        onOpenChange={setBlockDialog}
        saving={saving}
        unallocatedAcres={unallocated}
        onSubmit={(payload) =>
          mutate(
            () => base44.farms.createBlock(farm.id, payload),
            "Block created",
            () => setBlockDialog(false),
          )
        }
      />
      <StatusActionDialog
        open={Boolean(statusDialog)}
        onOpenChange={(open) => !open && setStatusDialog(null)}
        entityLabel={farm.name}
        action={statusDialog || "deactivate"}
        saving={saving}
        onSubmit={(payload) =>
          mutate(
            () =>
              statusDialog === "deactivate"
                ? base44.farms.deactivate(farm.id, payload)
                : base44.farms.reactivate(farm.id),
            `Farm ${statusDialog === "deactivate" ? "deactivated" : "reactivated"}`,
            () => setStatusDialog(null),
          )
        }
      />
      <StatusActionDialog
        open={Boolean(blockStatusDialog)}
        onOpenChange={(open) => !open && setBlockStatusDialog(null)}
        entityLabel={blockStatusDialog?.block?.name || "block"}
        action={blockStatusDialog?.action || "deactivate"}
        saving={saving}
        onSubmit={(payload) =>
          mutate(
            () =>
              blockStatusDialog?.action === "deactivate"
                ? base44.farms.deactivateBlock(
                    blockStatusDialog.block.id,
                    payload,
                  )
                : base44.farms.reactivateBlock(blockStatusDialog.block.id),
            `Block ${blockStatusDialog?.action === "deactivate" ? "deactivated" : "reactivated"}`,
            () => setBlockStatusDialog(null),
          )
        }
      />
      <MergeBlocksDialog
        open={mergeDialog}
        onOpenChange={setMergeDialog}
        farm={farm}
        blocks={farm.blocks || []}
        saving={saving}
        loadImpact={loadImpact}
        onSubmit={(payload) =>
          mutate(
            () => base44.farms.mergeBlocks(payload),
            "Blocks merged safely",
            () => setMergeDialog(false),
          )
        }
      />
    </div>
  );
}
