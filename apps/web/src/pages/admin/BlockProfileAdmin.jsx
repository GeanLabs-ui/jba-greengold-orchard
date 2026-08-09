import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  CalendarCheck2,
  CalendarDays,
  ClipboardList,
  Edit3,
  FileText,
  GitMerge,
  LayoutDashboard,
  Leaf,
  MapPin,
  MoreHorizontal,
  Ruler,
  Trees,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { base44 } from "@/api/base44Client";
import {
  ActivityFormDialog,
  BlockFormDialog,
  InventoryFormDialog,
  StatusActionDialog,
} from "@/components/farm/FarmManagementDialogs";
import FarmFieldLogs from "@/components/farm/FarmFieldLogs";
import FarmSeasonChecklist from "@/components/farm/FarmSeasonChecklist";
import YieldChart from "@/components/farm/YieldChart";
import EditableStatusBadge from "@/components/shared/EditableStatusBadge";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/AuthContext";
import {
  canChangeBlockStatus,
  canManageBlocks,
  formatDate,
  formatNumber,
  humanize,
} from "@/lib/farm-management";

const yearStart = () => `${new Date().getFullYear()}-01-01`;
const today = () => new Date().toISOString().slice(0, 10);
const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "activities", label: "Activities", icon: Activity },
  { id: "season", label: "Season checklist", icon: CalendarCheck2 },
  { id: "logs", label: "Field logs", icon: ClipboardList },
  { id: "details", label: "Block details", icon: FileText },
];

const Detail = ({ label, value }) => (
  <div className="border-b py-3 last:border-b-0">
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd className="mt-1 text-sm font-medium">{value ?? "No data yet"}</dd>
  </div>
);

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-4 w-4 text-emerald-700" />
        {label}
      </div>
      <p className="mt-2 truncate font-heading text-2xl font-semibold tabular-nums">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

function SectionNav({ active, counts, onChange }) {
  return (
    <nav
      className="sticky top-0 z-20 mt-4 overflow-x-auto rounded-xl border bg-background/95 p-1.5 shadow-sm backdrop-blur"
      aria-label="Block profile sections"
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

export default function BlockProfileAdmin() {
  const { farmId, blockId } = useParams();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [farm, setFarm] = useState(null);
  const [block, setBlock] = useState(null);
  const [start, setStart] = useState(yearStart());
  const [end, setEnd] = useState(today());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [statusAction, setStatusAction] = useState(null);
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
    setSearchParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [farmResponse, blockResponse] = await Promise.all([
        base44.farms.get(farmId, { start, end }),
        base44.farms.getBlock(blockId, { start, end }),
      ]);
      setFarm(farmResponse);
      setBlock(blockResponse);
    } catch (loadError) {
      setError(loadError.message || "Unable to load this block.");
    } finally {
      setLoading(false);
    }
  }, [blockId, end, farmId, start]);

  useEffect(() => {
    load();
  }, [load]);
  const mutate = async (action, message, close) => {
    setSaving(true);
    try {
      await action();
      toast.success(message);
      close?.();
      await load();
      return true;
    } catch (mutationError) {
      toast.error(mutationError.message || "The change could not be saved");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const currentInventory = useMemo(
    () => (block?.inventory || []).filter((entry) => !entry.effective_to),
    [block],
  );
  const latestActivity =
    block?.activity_periods?.find(
      (period) => period.status === "in_progress",
    ) || null;
  const activeHarvest =
    block?.harvest_periods?.find((period) => period.status === "active") ||
    null;

  if (loading && !block)
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28" />
        <Skeleton className="h-12" />
        <Skeleton className="h-80" />
      </div>
    );
  if (error && !block)
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="font-medium text-destructive">
          This block could not be loaded
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-4" variant="outline" onClick={load}>
          Try again
        </Button>
      </div>
    );
  if (!block || !farm) return null;

  const analytics = block.analytics || {};
  const canEdit = canManageBlocks(user?.role) && block.status !== "merged";

  return (
    <div className="pb-10">
      <nav
        className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link to="/admin/farms" className="hover:text-foreground">
          Farms
        </Link>
        <span>/</span>
        <Link
          to={`/admin/farms/${farm.id}?tab=blocks`}
          className="hover:text-foreground"
        >
          {farm.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{block.block_code}</span>
      </nav>
      <header className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {block.block_code}
              </span>
              <EditableStatusBadge
                status={block.status}
                canEdit={
                  canChangeBlockStatus(user?.role) && block.status !== "merged"
                }
                entityLabel={block.name}
                onClick={() =>
                  setStatusAction(
                    block.status === "active" ? "deactivate" : "reactivate",
                  )
                }
              />
            </div>
            <h1 className="mt-1.5 font-heading text-3xl font-semibold">
              {block.name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {farm.name} ·{" "}
                {farm.location || farm.region || "Location not recorded"}
              </span>
              <span>Updated {formatDate(block.updated_at)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to={`/admin/farms/${farm.id}?tab=blocks`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Farm blocks
              </Link>
            </Button>
            {canEdit ? (
              <Button onClick={() => setEditOpen(true)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit block
              </Button>
            ) : null}
            {canChangeBlockStatus(user?.role) && block.status !== "merged" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="More block actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className={
                      block.status === "active" ? "text-destructive" : ""
                    }
                    onClick={() =>
                      setStatusAction(
                        block.status === "active" ? "deactivate" : "reactivate",
                      )
                    }
                  >
                    {block.status === "active"
                      ? "Deactivate block"
                      : "Reactivate block"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </header>

      <SectionNav
        active={activeSection}
        counts={{
          activities:
            (block.activity_periods?.length || 0) +
            (block.harvest_periods?.length || 0),
        }}
        onChange={setActiveSection}
      />
      {block.status === "merged" && block.merge_info ? (
        <div className="mt-4 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <GitMerge className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">
              Merged on {formatDate(block.merge_info.effective_date)}
            </p>
            <p className="mt-1">
              Historical records remain here. New operations should use the
              destination block. Reason: {block.merge_info.reason}
            </p>
          </div>
        </div>
      ) : null}
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
              label="Block area"
              value={
                block.size_acres == null
                  ? "No data yet"
                  : `${formatNumber(block.size_acres)} ac`
              }
              detail={
                block.early_block_classification ||
                "Classification not recorded"
              }
            />
            <Metric
              icon={Trees}
              label="Current trees"
              value={
                analytics.inventory_record_count
                  ? formatNumber(analytics.total_trees, 0)
                  : "No data yet"
              }
              detail={
                analytics.inventory_record_count
                  ? `${formatNumber(analytics.productive_trees, 0)} productive`
                  : "Inventory can be added later"
              }
            />
            <Metric
              icon={TrendingUp}
              label="Yield in period"
              value={
                analytics.yield_record_count
                  ? `${formatNumber(analytics.total_yield_kg)} kg`
                  : "No data yet"
              }
              detail={
                analytics.yield_per_acre == null
                  ? "Yield per acre unavailable"
                  : `${formatNumber(analytics.yield_per_acre)} kg per acre`
              }
            />
            <Metric
              icon={Activity}
              label="Current stage"
              value={
                latestActivity
                  ? humanize(latestActivity.activity_type)
                  : "No data yet"
              }
              detail={
                activeHarvest
                  ? humanize(activeHarvest.harvest_type)
                  : "No active harvest period"
              }
            />
          </section>
          <section className="mt-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold">
                Block performance
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Yield and crop inventory for the selected period.
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
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
            <YieldChart
              records={block.yield_records}
              title="Block yield trend"
            />
            <section className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold">
                    Crop inventory
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Current tree records
                  </p>
                </div>
                {canEdit ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedInventory(null);
                      setInventoryOpen(true);
                    }}
                  >
                    <Trees className="mr-2 h-4 w-4" />
                    Record trees
                  </Button>
                ) : null}
              </div>
              {currentInventory.length ? (
                <div className="mt-4 divide-y">
                  {currentInventory.map((entry) => {
                    const productivePercent = entry.total_trees
                      ? (entry.productive_trees / entry.total_trees) * 100
                      : 0;
                    return (
                      <button
                        type="button"
                        key={entry.id}
                        disabled={!canEdit}
                        onClick={() => {
                          setSelectedInventory(entry);
                          setInventoryOpen(true);
                        }}
                        className="w-full py-3 text-left disabled:cursor-default"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{entry.variety_name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Planted {formatDate(entry.planting_date)}
                            </p>
                          </div>
                          <span className="text-sm font-semibold">
                            {formatNumber(entry.total_trees, 0)} trees
                          </span>
                        </div>
                        <Progress
                          value={productivePercent}
                          className="mt-2 h-1.5"
                        />
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {formatNumber(entry.productive_trees, 0)} productive ·{" "}
                          {formatNumber(entry.non_productive_trees, 0)} young ·{" "}
                          {formatNumber(entry.dead_trees, 0)} removed
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <Leaf className="mx-auto h-7 w-7 text-muted-foreground/60" />
                  <p className="mt-2 text-sm font-medium">
                    No inventory recorded
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {activeSection === "activities" ? (
        <div className="mt-5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          <div className="flex items-end justify-between border-b pb-4">
            <div>
              <h2 className="font-heading text-2xl font-semibold">
                Activities and harvests
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Work periods and harvest windows for this block.
              </p>
            </div>
            {canEdit ? (
              <Button
                onClick={() => {
                  setSelectedActivity(null);
                  setActivityOpen(true);
                }}
              >
                <Activity className="mr-2 h-4 w-4" />
                Record activity
              </Button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b px-5 py-4">
                <h3 className="font-heading text-lg font-semibold">
                  Land and tree activities
                </h3>
              </div>
              {block.activity_periods?.length ? (
                <div className="divide-y">
                  {block.activity_periods.map((period) => (
                    <button
                      type="button"
                      key={period.id}
                      disabled={!canEdit}
                      onClick={() => {
                        setSelectedActivity(period);
                        setActivityOpen(true);
                      }}
                      className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-muted/30 disabled:cursor-default"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {humanize(period.activity_type)}
                          </p>
                          <StatusBadge status={period.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(period.planned_start_date)} –{" "}
                          {formatDate(period.planned_end_date)}
                        </p>
                        {period.notes ? (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {period.notes}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-sm font-semibold">
                        {period.completion_percent || 0}%
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No activities recorded for this block.
                </div>
              )}
            </section>
            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h3 className="font-heading text-lg font-semibold">
                  Harvest periods
                </h3>
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
              </div>
              {block.harvest_periods?.length ? (
                <div className="divide-y">
                  {block.harvest_periods.map((period) => (
                    <div key={period.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">
                          {humanize(period.harvest_type)}
                        </p>
                        <StatusBadge status={period.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(period.expected_start_date)} –{" "}
                        {formatDate(period.expected_end_date)} ·{" "}
                        {formatNumber(period.actual_yield_kg || 0)} kg actual
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No harvest periods recorded for this block.
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {activeSection === "season" ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          <FarmSeasonChecklist
            farm={farm}
            blocks={[block]}
            initialBlockId={block.id}
            lockScope
            canEdit={canEdit}
            className="mt-5"
          />
        </div>
      ) : null}

      {activeSection === "logs" ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          <FarmFieldLogs
            farm={farm}
            blocks={[block]}
            initialBlockId={block.id}
            lockScope
            canCreate={canEdit}
            className="mt-5"
          />
        </div>
      ) : null}

      {activeSection === "details" ? (
        <section className="mt-5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="font-heading text-2xl font-semibold">
                Block details
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Farm register, land profile, crop condition, and dates.
              </p>
            </div>
            {canEdit ? (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit details
              </Button>
            ) : null}
          </div>
          <div className="mt-3 grid gap-x-10 md:grid-cols-2 xl:grid-cols-4">
            <dl>
              <Detail label="Parent farm" value={farm.name} />
              <Detail label="Block code" value={block.block_code} />
              <Detail
                label="Size"
                value={
                  block.size_acres == null
                    ? null
                    : `${formatNumber(block.size_acres)} acres`
                }
              />
              <Detail
                label="GPS coordinates"
                value={
                  block.latitude != null && block.longitude != null
                    ? `${block.latitude}, ${block.longitude}`
                    : null
                }
              />
            </dl>
            <dl>
              <Detail
                label="Early block"
                value={block.early_block_classification}
              />
              <Detail
                label="Year planted"
                value={
                  block.year_planted == null ? null : String(block.year_planted)
                }
              />
              <Detail
                label="Variety"
                value={
                  currentInventory
                    .map((entry) => entry.variety_name)
                    .join(", ") || block.variety
                }
              />
              <Detail
                label="Shoot maturity"
                value={
                  block.shoot_maturity == null
                    ? null
                    : `${formatNumber(Number(block.shoot_maturity) * 100, 0)}%`
                }
              />
            </dl>
            <dl>
              <Detail
                label="Forecast yield"
                value={
                  block.forecast_yield_kg == null
                    ? null
                    : `${formatNumber(block.forecast_yield_kg)} kg`
                }
              />
              <Detail
                label="Actual yield"
                value={
                  analytics.yield_record_count
                    ? `${formatNumber(analytics.total_yield_kg)} kg`
                    : null
                }
              />
              <Detail
                label="Fruit fly pressure"
                value={block.fruit_fly_pressure}
              />
              <Detail label="Disease rating" value={block.disease_rating} />
            </dl>
            <dl>
              <Detail
                label="Soil type / pH"
                value={`${block.soil_type || "No data yet"}${block.soil_ph == null ? "" : ` · pH ${block.soil_ph}`}`}
              />
              <Detail
                label="Operations started"
                value={formatDate(block.operations_started_on)}
              />
              <Detail
                label="Planting started"
                value={formatDate(block.planting_started_on)}
              />
              <Detail
                label="Created / updated"
                value={`${formatDate(block.created_at)} / ${formatDate(block.updated_at)}`}
              />
            </dl>
          </div>
          {block.description ? (
            <div className="mt-5 border-t pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <p className="mt-2 max-w-4xl text-sm leading-6">
                {block.description}
              </p>
            </div>
          ) : null}
          {block.soil_notes ? (
            <div className="mt-5 border-t pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Soil and land notes
              </p>
              <p className="mt-2 max-w-4xl text-sm leading-6">
                {block.soil_notes}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <BlockFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        block={block}
        saving={saving}
        unallocatedAcres={farm.analytics?.unallocatedSizeAcres}
        onSubmit={(payload) =>
          mutate(
            () => base44.farms.updateBlock(block.id, payload),
            "Block profile updated",
            () => setEditOpen(false),
          )
        }
      />
      <InventoryFormDialog
        open={inventoryOpen}
        onOpenChange={setInventoryOpen}
        inventory={selectedInventory}
        saving={saving}
        onSubmit={(payload) =>
          mutate(
            () =>
              selectedInventory
                ? base44.farms.updateInventory(selectedInventory.id, payload)
                : base44.farms.addInventory(block.id, payload),
            selectedInventory
              ? "Tree inventory updated"
              : "Tree inventory recorded",
            () => setInventoryOpen(false),
          )
        }
      />
      <ActivityFormDialog
        open={activityOpen}
        onOpenChange={setActivityOpen}
        activity={selectedActivity}
        saving={saving}
        onSubmit={(payload) =>
          mutate(
            () =>
              selectedActivity
                ? base44.farms.updateActivity(selectedActivity.id, payload)
                : base44.farms.addActivity(block.id, payload),
            selectedActivity
              ? "Activity progress updated"
              : "Land activity recorded",
            () => setActivityOpen(false),
          )
        }
      />
      <StatusActionDialog
        open={Boolean(statusAction)}
        onOpenChange={(open) => !open && setStatusAction(null)}
        entityLabel={block.name}
        action={statusAction || "deactivate"}
        saving={saving}
        onSubmit={(payload) =>
          mutate(
            () =>
              statusAction === "deactivate"
                ? base44.farms.deactivateBlock(block.id, payload)
                : base44.farms.reactivateBlock(block.id),
            `Block ${statusAction === "deactivate" ? "deactivated" : "reactivated"}`,
            () => setStatusAction(null),
          )
        }
      />
    </div>
  );
}
