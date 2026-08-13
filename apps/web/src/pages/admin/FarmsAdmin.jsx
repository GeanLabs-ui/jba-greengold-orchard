import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarRange,
  Layers3,
  MapPin,
  Plus,
  Search,
  Sprout,
} from "lucide-react";
import toast from "react-hot-toast";
import { base44 } from "@/api/base44Client";
import {
  FarmFormDialog,
  StatusActionDialog,
} from "@/components/farm/FarmManagementDialogs";
import PageHeader from "@/components/shared/PageHeader";
import EditableStatusBadge from "@/components/shared/EditableStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  <div className="rounded-xl border p-5">
    <div className="flex justify-between">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    <Skeleton className="mt-7 h-4 w-44" />
    <Skeleton className="mt-3 h-4 w-52" />
    <div className="mt-6 grid grid-cols-3 gap-3">
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
    </div>
  </div>
);

export default function FarmsAdmin() {
  const { user } = useAuth();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [location, setLocation] = useState("all");
  const [variety, setVariety] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusDialog, setStatusDialog] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadFarms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await base44.farms.list({
        q: submittedSearch.trim(),
        status: status === "all" ? "" : status,
        region: location === "all" ? "" : location,
        variety: variety === "all" ? "" : variety,
        limit: 100,
      });
      setFarms(response || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load farms.");
    } finally {
      setLoading(false);
    }
  }, [location, status, submittedSearch, variety]);

  useEffect(() => {
    loadFarms();
  }, [loadFarms]);
  const locations = useMemo(() => farmLocationOptions(farms), [farms]);
  const varieties = useMemo(() => farmVarietyOptions(farms), [farms]);
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

  const changeFarmStatus = async (payload) => {
    if (!statusDialog?.farm) return;
    setSaving(true);
    try {
      if (statusDialog.action === "deactivate") {
        await base44.farms.deactivate(statusDialog.farm.id, payload);
      } else {
        await base44.farms.reactivate(statusDialog.farm.id);
      }
      toast.success(
        `${statusDialog.farm.name} ${statusDialog.action === "deactivate" ? "deactivated" : "reactivated"}`,
      );
      setStatusDialog(null);
      await loadFarms();
    } catch (saveError) {
      toast.error(saveError.message || "Unable to change farm status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-10">
      <PageHeader>
        {canManageFarms(user?.role) ? (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add farm
          </Button>
        ) : null}
      </PageHeader>

      <section
        className="mb-6 rounded-xl border bg-card p-3 shadow-sm"
        aria-label="Farm filters"
      >
        <div className="flex flex-col gap-3 lg:flex-row">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSubmittedSearch(search);
            }}
            className="relative min-w-0 flex-1"
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search farms, codes, or locations"
              className="pl-9"
              aria-label="Search farms"
            />
          </form>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger
              className="w-full lg:w-44"
              aria-label="Filter by status"
            >
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
            <SelectTrigger
              className="w-full lg:w-48"
              aria-label="Filter by location"
            >
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={variety} onValueChange={setVariety}>
            <SelectTrigger
              className="w-full lg:w-48"
              aria-label="Filter by variety"
            >
              <SelectValue placeholder="All varieties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All varieties</SelectItem>
              {varieties.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
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
      {!loading && !error && !farms.length ? (
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

      {!loading && !error && farms.length ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {farms.map((farm) => {
            const varietyEntries = Object.entries(
              farm.variety_totals || {},
            ).filter(([, count]) => Number(count) > 0);
            const unallocated =
              farm.size_acres == null
                ? null
                : Math.max(
                    0,
                    Number(farm.size_acres) -
                      Number(farm.allocated_size_acres || 0),
                  );
            const nextHarvest = farm.next_harvest;
            return (
              <article
                key={farm.id}
                className="group overflow-hidden rounded-xl border bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
              >
                <div className="h-1 bg-emerald-800" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        {farm.farm_code}
                      </p>
                      <h2 className="mt-1 truncate font-heading text-xl font-semibold">
                        {farm.name}
                      </h2>
                    </div>
                    <EditableStatusBadge
                      status={farm.status}
                      canEdit={canManageFarms(user?.role)}
                      entityLabel={farm.name}
                      onClick={() =>
                        setStatusDialog({
                          farm,
                          action:
                            farm.status === "active"
                              ? "deactivate"
                              : "reactivate",
                        })
                      }
                    />
                  </div>
                  <p className="mt-4 flex min-h-10 items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {farm.location || farm.region || "Location not recorded"}
                  </p>
                  <div className="mt-5 grid grid-cols-3 divide-x rounded-lg bg-muted/40 py-3 text-center">
                    <div>
                      <p className="text-lg font-semibold tabular-nums">
                        {formatNumber(farm.size_acres)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">acres</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold tabular-nums">
                        {formatNumber(farm.active_block_count, 0)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        active blocks
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold tabular-nums">
                        {formatNumber(farm.total_trees, 0)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">trees</p>
                    </div>
                  </div>
                  <div className="mt-4 flex min-h-7 flex-wrap gap-2">
                    {varietyEntries.length ? (
                      varietyEntries.slice(0, 3).map(([name, count]) => (
                        <span
                          key={name}
                          className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
                        >
                          {name} · {formatNumber(count, 0)}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No crop inventory yet
                      </span>
                    )}
                  </div>
                  <div className="mt-4 rounded-lg border border-dashed px-3 py-3">
                    <div className="flex items-start gap-2">
                      <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Harvest type and period
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold">
                          {nextHarvest?.harvest_type
                            ? humanize(nextHarvest.harvest_type)
                            : farm.harvest_types?.length
                              ? farm.harvest_types.map(humanize).join(", ")
                              : "No harvest scheduled"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {nextHarvest?.expected_start_date ||
                          nextHarvest?.expected_end_date
                            ? `${formatDate(nextHarvest.expected_start_date)} – ${formatDate(nextHarvest.expected_end_date)}`
                            : "Add a harvest season from the production calendar"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t pt-4">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {formatNumber(unallocated)}
                      </span>{" "}
                      acres unallocated
                    </div>
                    <div className="flex gap-2">
                      {canManageBlocks(user?.role) &&
                      farm.status === "active" ? (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/admin/farm-daily-activities/activities/farms/${farm.id}?action=add-block`}>
                            <Layers3 className="mr-1.5 h-4 w-4" />
                            Add block
                          </Link>
                        </Button>
                      ) : null}
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/admin/farm-daily-activities/activities/farms/${farm.id}`}>
                          View farm
                          <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                  {farm.current_activity_stage ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Current stage:{" "}
                      <span className="font-medium text-foreground">
                        {humanize(farm.current_activity_stage)}
                      </span>
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <FarmFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={createFarm}
        saving={saving}
      />
      <StatusActionDialog
        open={Boolean(statusDialog)}
        onOpenChange={(open) => !open && setStatusDialog(null)}
        entityLabel={statusDialog?.farm?.name || "farm"}
        action={statusDialog?.action || "deactivate"}
        saving={saving}
        onSubmit={changeFarmStatus}
      />
    </div>
  );
}
