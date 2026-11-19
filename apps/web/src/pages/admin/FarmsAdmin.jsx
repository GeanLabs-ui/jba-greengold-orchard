import CardSurface from "@/components/shared/CardSurface";
import { groupTaskLog, taskLogTotals } from '@/lib/task-log-profile';
import { subscribeToDataChanges } from '@/lib/data-sync';
import TaskLogMetrics from '@/components/farm/TaskLogMetrics';
import TaskLogRecords from '@/components/farm/TaskLogRecords';
import { scopeLabel } from '@/lib/farm-scope';
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Grid2X2,
  LandPlot,
  Layers3,
  MapPin,
  Plus,
  Sprout,
  Trees,
} from "lucide-react";
import toast from "react-hot-toast";
import { base44 } from "@/api/base44Client";
import {
  FarmFormDialog,
} from "@/components/farm/FarmManagementDialogs";
import { Button } from "@/components/ui/button";
import FarmActivationToggle from "@/components/farm/FarmActivationToggle";
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
  canManageBlocks,
  canManageFarms,
  farmLocationOptions,
  farmVarietyOptions,
  formatDate,
  formatNumber,
  humanize,
} from "@/lib/farm-management";

const FarmSkeleton = () => (
  <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
    <Skeleton className="h-1 w-full rounded-none" />
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-14 w-full" />
      <Skeleton className="mt-4 h-14 w-full rounded-lg" />
      <div className="mt-4 flex justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  </div>
);

const activeFarmPalette = {
  accent: "bg-emerald-700",
  icon: "bg-emerald-50 text-emerald-700",
  metric: "text-emerald-700",
  panel: "bg-emerald-50/80",
  button: "border-emerald-300 text-emerald-800 hover:bg-emerald-50",
};

const cardNumber = (value, digits = 1) => (
  value === null || value === undefined ? "—" : formatNumber(value, digits)
);

const FarmMetric = ({ icon: Icon, label, value, detail, palette }) => (
  <div className="flex min-w-0 items-start gap-1 px-1 first:pl-0 last:pr-0">
    <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${palette.metric}`} />
    <div className="min-w-0">
      <p className="truncate text-caption font-medium leading-3 text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-caption font-semibold leading-4 text-foreground">{value}</p>
      <p className="truncate text-caption leading-3 tracking-tight text-muted-foreground">{detail}</p>
    </div>
  </div>
);

async function listAllFarmCards() {
  const limit = 250;
  const farms = [];
  for (let offset = 0; ; offset += limit) {
    const page = await base44.farms.list({ limit, offset });
    farms.push(...page);
    if (page.length < limit) return farms;
  }
}

export default function FarmsAdmin() {
  const { user } = useAuth();
  const [farms, setFarms] = useState([]);
  const [otherRecords, setOtherRecords] = useState([]);
  const [catalogVarieties, setCatalogVarieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [location, setLocation] = useState("all");
  const [variety, setVariety] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadFarms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [response, varietyResponse, records, blocks] = await Promise.all([
        listAllFarmCards(),
        base44.farms.cropVarieties().catch(() => []),
        base44.entities.DailyActivity.listAll("-activity_date"),
        base44.entities.FarmBlock.listAll(),
      ]);
      const ledger = groupTaskLog(records, { farms: response, blocks });
      setFarms(response.map((farm) => ({
        ...farm,
        task_log: taskLogTotals(ledger.byFarm.get(String(farm.id)) || []),
      })));
      setOtherRecords([
        { title: 'Shared farm records', activities: ledger.shared },
        { title: 'Unassigned records', activities: ledger.unassigned },
      ]);
      setCatalogVarieties(varietyResponse || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load farms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFarms();
    return subscribeToDataChanges(loadFarms, ["DailyActivity", "Farm", "FarmBlock"]);
  }, [loadFarms]);
  const locations = useMemo(() => farmLocationOptions(farms), [farms]);
  const varieties = useMemo(
    () => [...new Set([
      ...farmVarietyOptions(farms),
      ...catalogVarieties.map((item) => item.name).filter(Boolean),
    ])].sort((left, right) => left.localeCompare(right)),
    [catalogVarieties, farms],
  );
  const visibleFarms = useMemo(() => {
    return farms.filter((farm) => {
      if (status !== "all" && farm.status !== status) return false;
      const farmLocations = farmLocationOptions([farm]);
      if (location !== "all" && !farmLocations.some((item) => item.toLowerCase() === location.toLowerCase())) return false;
      const farmVarieties = farmVarietyOptions([farm]);
      if (variety !== "all" && !farmVarieties.some((item) => item.toLowerCase() === variety.toLowerCase())) return false;
      return true;
    });
  }, [farms, location, status, variety]);
  const createFarm = async (payload) => {
    setSaving(true);
    try {
      const created = await base44.farms.create(payload);
      toast.success(`${created.name} was created`);
      setDialogOpen(false);
      await loadFarms();
    } catch (saveError) {
      toast.error(saveError.message || "Unable to create farm");
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-10">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <section
          className="min-w-0 flex-1 rounded-xl border bg-card p-3 shadow-sm"
          aria-label="Farm filters"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 w-full" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="h-10 w-full" aria-label="Filter by location">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={variety} onValueChange={setVariety}>
              <SelectTrigger className="h-10 w-full" aria-label="Filter by variety">
                <SelectValue placeholder="All varieties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All varieties</SelectItem>
                {varieties.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>
        {canManageFarms(user?.role) ? (
          <Button className="h-10 px-5 lg:self-center" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add farm
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <FarmSkeleton key={item} />
          ))}
        </div>
      ) : null}
      {!loading && error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="font-medium text-destructive">
            Farm data could not be loaded
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadFarms}>
            Try again
          </Button>
        </div>
      ) : null}
      {!loading && !error && !visibleFarms.length ? (
        <div className="rounded-xl border border-dashed bg-muted/10 p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50">
            <Sprout className="h-6 w-6 text-emerald-700" />
          </div>
          <p className="mt-4 font-heading text-lg font-semibold">
            No farms match these filters
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Clear the filters or create the first farm location to begin
            organizing blocks and production records.
          </p>
          {canManageFarms(user?.role) ? (
            <Button className="mt-5" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add farm
            </Button>
          ) : null}
        </div>
      ) : null}

      {!loading && !error ? (
        <p className="mb-3 text-caption text-muted-foreground">
          {farms.length} farms total · {farms.filter((farm) => farm.status === "inactive").length} deactivated
          {status !== "all" || location !== "all" || variety !== "all" ? ` · ${visibleFarms.length} shown` : ""}
        </p>
      ) : null}
      {!loading && !error && visibleFarms.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleFarms.map((farm) => {
            const nextHarvest = farm.next_harvest;
            const inactive = farm.status !== "active";
            const palette = inactive ? {
              accent: "bg-slate-400", icon: "bg-slate-200 text-slate-500",
              metric: "text-slate-500", panel: "bg-slate-200/60",
              button: "border-slate-300 text-slate-600 hover:bg-slate-200",
            } : activeFarmPalette;
            const harvestName = nextHarvest?.harvest_type
              ? humanize(nextHarvest.harvest_type)
              : "No harvest";
            const harvestPeriod = nextHarvest?.expected_start_date || nextHarvest?.expected_end_date
              ? `${formatDate(nextHarvest.expected_start_date)} – ${formatDate(nextHarvest.expected_end_date)}`
              : "scheduled";
            return (
              <CardSurface
                key={farm.id}
                className={`group flex min-w-0 flex-col overflow-hidden rounded-xl border shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${inactive ? "bg-slate-100 grayscale" : "bg-card"}`}
              >
                <div className={`h-1 ${palette.accent}`} />
                <div className="flex flex-1 flex-col px-4 pb-3 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${palette.icon}`}>
                        <LandPlot className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-foreground text-section-title">{scopeLabel(farm.name)}</h2>
                        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{farm.location || farm.region || "Location not recorded"}</span>
                        </p>
                      </div>
                    </div>
                    <FarmActivationToggle record={farm} canEdit={canManageFarms(user?.role)} onChanged={loadFarms} />
                  </div>
                  <div className="mt-3 grid grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.4fr)] divide-x border-y py-2">
                    <FarmMetric icon={LandPlot} label="Area" value={cardNumber(farm.size_acres)} detail="acres" palette={palette} />
                    <FarmMetric icon={Grid2X2} label="Blocks" value={cardNumber(farm.block_count, 0)} detail="total" palette={palette} />
                    <FarmMetric icon={Trees} label="Trees" value={cardNumber(farm.total_trees, 0)} detail="trees" palette={palette} />
                    <FarmMetric icon={CalendarDays} label="Harvest" value={harvestName} detail={harvestPeriod} palette={palette} />
                  </div>
                  <div className="mt-3">
                    <TaskLogMetrics model={farm.task_log} compact />
                  </div>
                  <div className={`my-3 rounded-lg p-3 ${palette.panel}`}>
                    <div className="flex items-start gap-2.5">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-background/70 ${palette.metric}`}>
                        <CalendarDays className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-caption font-semibold">
                          {nextHarvest ? `${harvestName} scheduled` : "No harvest scheduled"}
                        </p>
                        {nextHarvest ? (
                          <p className="mt-1 truncate text-caption text-muted-foreground">{harvestPeriod}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    {canManageBlocks(user?.role) && farm.status === "active" ? (
                      <Button variant="ghost" size="sm" className="px-1 text-caption" asChild>
                        <Link to={`/admin/farm-daily-activities/activities/farms/${farm.id}?action=add-block`}>
                          <Layers3 className="mr-1.5 h-4 w-4" />
                          Add block
                        </Link>
                      </Button>
                    ) : <span />}
                    <Button variant="outline" size="sm" className={`text-caption ${palette.button}`} asChild>
                      <Link data-card-primary to={`/admin/farm-daily-activities/activities/farms/${farm.id}`}>
                        View farm
                        <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardSurface>
            );
          })}
        </div>
      ) : null}

      {!loading && !error && otherRecords.filter(({ activities }) => activities.length).map(({ title, activities }) => (
        <section key={title} className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-section-title">{title}</h2>
          <div className="mt-3"><TaskLogMetrics model={taskLogTotals(activities)} compact /></div>
          <details className="mt-3">
            <summary className="cursor-pointer text-caption font-semibold">View {activities.length} {activities.length === 1 ? 'record' : 'records'}</summary>
            <TaskLogRecords activities={activities} />
          </details>
        </section>
      ))}

      <FarmFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={createFarm}
        saving={saving}
      />

    </div>
  );
}
