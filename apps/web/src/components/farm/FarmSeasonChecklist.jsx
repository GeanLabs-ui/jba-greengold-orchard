import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Circle,
  Copy,
  Leaf,
  Loader2,
  Sparkles,
  Wheat,
} from "lucide-react";
import toast from "react-hot-toast";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { subscribeToDataChanges } from "@/lib/data-sync";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 16 }, (_, index) => CURRENT_YEAR - 5 + index);

export const SEASON_STAGES = [
  {
    id: "fertilizer_paklo",
    label: "Fertilizer Paklo application",
    shortLabel: "Fertilizer",
    description: "Choose the fertilizer application window for this season.",
    icon: Leaf,
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    options: [
      { code: "feb_mar", label: "Feb – Mar", startMonth: 2, endMonth: 3 },
      { code: "jun_jul", label: "Jun – Jul", startMonth: 6, endMonth: 7 },
      { code: "aug_sep", label: "Aug – Sep", startMonth: 8, endMonth: 9 },
      { code: "oct_nov", label: "Oct – Nov", startMonth: 10, endMonth: 11 },
    ],
  },
  {
    id: "flower_induction",
    label: "Flower induction",
    shortLabel: "Flower induction",
    description: "Select when flower induction should be carried out.",
    icon: Sparkles,
    tone: "bg-amber-50 text-amber-800 border-amber-200",
    options: [
      { code: "jan_feb", label: "Jan – Feb", startMonth: 1, endMonth: 2 },
      { code: "may_jun", label: "May – Jun", startMonth: 5, endMonth: 6 },
      { code: "sep_oct", label: "Sep – Oct", startMonth: 9, endMonth: 10 },
      { code: "nov_dec", label: "Nov – Dec", startMonth: 11, endMonth: 12 },
    ],
  },
  {
    id: "harvest",
    label: "Harvest",
    shortLabel: "Harvest",
    description: "Set the expected mango harvest period.",
    icon: Wheat,
    tone: "bg-orange-50 text-orange-800 border-orange-200",
    options: [
      { code: "apr_may", label: "Apr – May", startMonth: 4, endMonth: 5 },
      { code: "jun_jul", label: "Jun – Jul", startMonth: 6, endMonth: 7 },
      { code: "jul_aug", label: "Jul – Aug", startMonth: 7, endMonth: 8 },
      { code: "nov_dec", label: "Nov – Dec", startMonth: 11, endMonth: 12 },
    ],
  },
];

const scopeKey = (blockId) => blockId || "farm";

const dateForMonth = (year, month, end = false) => {
  const date = end
    ? new Date(Date.UTC(year, month, 0))
    : new Date(Date.UTC(year, month - 1, 1));
  return date.toISOString().slice(0, 10);
};

const periodLabel = (record) =>
  record?.window_label ||
  (record?.start_date && record?.end_date
    ? `${record.start_date} – ${record.end_date}`
    : "Not scheduled");

const recordFor = (records, blockId, stageId) =>
  records.find(
    (record) =>
      scopeKey(record.block_id) === scopeKey(blockId) &&
      record.stage === stageId,
  );

function StageStatus({ record }) {
  if (!record) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Circle className="h-3.5 w-3.5" /> Not scheduled
      </span>
    );
  }
  return record.completed ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" /> Completed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
      <CalendarCheck2 className="h-3.5 w-3.5" /> Planned
    </span>
  );
}

export function FarmSeasonSummary({ farm, blocks = [], onManage }) {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!farm?.id) return;
    try {
      const items = await base44.entities.FarmSeasonChecklist.filter(
        { farm_id: farm.id, season_year: year },
        "-updated_date",
        250,
      );
      setRecords(items);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [farm?.id, year]);

  useEffect(() => {
    setLoading(true);
    load();
    return subscribeToDataChanges(load, ["FarmSeasonChecklist"]);
  }, [load]);

  const activeBlocks = blocks.filter(
    (block) => block.status === "active" || !block.status,
  );
  const visibleBlocks = activeBlocks.slice(0, 6);
  const farmRecords = SEASON_STAGES.map((stage) =>
    recordFor(records, null, stage.id),
  );
  const scheduledCount = farmRecords.filter(Boolean).length;

  return (
    <section className="mt-5 overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="h-5 w-5 text-emerald-700" />
            <h2 className="font-heading text-lg font-semibold">
              Season readiness
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Farm and subblock windows at a glance for faster planning.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(year)}
            onValueChange={(value) => setYear(Number(value))}
          >
            <SelectTrigger className="h-9 w-[110px]" aria-label="Season year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((item) => (
                <SelectItem key={item} value={String(item)}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={onManage}>
            Manage plan
          </Button>
        </div>
      </div>

      <div className="grid border-b lg:grid-cols-[220px_repeat(3,minmax(0,1fr))]">
        <div className="bg-emerald-950 px-5 py-4 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
            Main farmland
          </p>
          <p className="mt-1 font-semibold">{farm?.name}</p>
          <p className="mt-1 text-xs text-emerald-100/80">
            {scheduledCount}/3 stages scheduled
          </p>
        </div>
        {SEASON_STAGES.map((stage, index) => {
          const record = farmRecords[index];
          const Icon = stage.icon;
          return (
            <div
              key={stage.id}
              className="border-t px-5 py-4 lg:border-l lg:border-t-0"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Icon className="h-4 w-4 text-emerald-700" /> {stage.shortLabel}
              </div>
              <p className="mt-1.5 text-sm font-semibold">
                {periodLabel(record)}
              </p>
              <div className="mt-1">
                <StageStatus record={record} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Subblock summary</h3>
            <p className="text-xs text-muted-foreground">
              {activeBlocks.length} active{" "}
              {activeBlocks.length === 1 ? "subblock" : "subblocks"}
            </p>
          </div>
        </div>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({
              length: Math.min(3, Math.max(1, activeBlocks.length)),
            }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : visibleBlocks.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleBlocks.map((block) => {
              const blockRecords = SEASON_STAGES.map((stage) =>
                recordFor(records, block.id, stage.id),
              );
              const complete = blockRecords.filter(
                (record) => record?.completed,
              ).length;
              const scheduled = blockRecords.filter(Boolean).length;
              return (
                <Link
                  key={block.id}
                  to={`/admin/farm-daily-activities/activities/farms/${farm.id}/blocks/${block.id}?tab=season`}
                  className="group rounded-xl border bg-background p-4 transition hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        {block.block_code}
                      </p>
                      <p className="mt-0.5 font-semibold">{block.name}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-emerald-700" />
                  </div>
                  <div className="mt-3 space-y-2">
                    {SEASON_STAGES.map((stage, index) => {
                      const record = blockRecords[index];
                      return (
                        <div
                          key={stage.id}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="text-muted-foreground">
                            {stage.shortLabel}
                          </span>
                          <span
                            className={cn(
                              "truncate font-medium",
                              record?.completed && "text-emerald-700",
                            )}
                          >
                            {periodLabel(record)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">
                    {scheduled}/3 planned · {complete}/3 completed
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed px-5 py-8 text-center">
            <p className="text-sm font-medium">No active subblocks yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              New subblocks will automatically appear here with all three
              checklist stages.
            </p>
          </div>
        )}
        {activeBlocks.length > visibleBlocks.length ? (
          <Button className="mt-3" size="sm" variant="ghost" onClick={onManage}>
            View {activeBlocks.length - visibleBlocks.length} more subblocks
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export default function FarmSeasonChecklist({
  farm,
  blocks = [],
  initialBlockId = "farm",
  lockScope = false,
  canEdit = false,
  className,
}) {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [selectedScope, setSelectedScope] = useState(initialBlockId || "farm");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingStage, setSavingStage] = useState("");
  const [copying, setCopying] = useState(false);
  const [customStage, setCustomStage] = useState("");
  const [customDates, setCustomDates] = useState({ start: "", end: "" });

  const load = useCallback(async () => {
    if (!farm?.id) return;
    try {
      const items = await base44.entities.FarmSeasonChecklist.filter(
        { farm_id: farm.id, season_year: year },
        "-updated_date",
        250,
      );
      setRecords(items);
    } catch (error) {
      toast.error(error.message || "Unable to load the seasonal checklist");
    } finally {
      setLoading(false);
    }
  }, [farm?.id, year]);

  useEffect(() => {
    setLoading(true);
    load();
    return subscribeToDataChanges(load, ["FarmSeasonChecklist"]);
  }, [load]);

  useEffect(() => {
    if (lockScope) setSelectedScope(initialBlockId || "farm");
  }, [initialBlockId, lockScope]);

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedScope) || null,
    [blocks, selectedScope],
  );
  const blockId = selectedScope === "farm" ? null : selectedScope;
  const selectedRecords = useMemo(
    () =>
      Object.fromEntries(
        SEASON_STAGES.map((stage) => [
          stage.id,
          recordFor(records, blockId, stage.id),
        ]),
      ),
    [blockId, records],
  );
  const scheduledCount = Object.values(selectedRecords).filter(Boolean).length;
  const completedCount = Object.values(selectedRecords).filter(
    (record) => record?.completed,
  ).length;

  const payloadFor = (stage, values = {}) => ({
    farm_id: farm.id,
    farm_name: farm.name,
    block_id: blockId || "",
    block_name: selectedBlock?.name || "",
    block_code: selectedBlock?.block_code || "",
    season_year: year,
    stage: stage.id,
    stage_label: stage.label,
    completed: false,
    status: "planned",
    source: "farm_season_checklist",
    ...values,
  });

  const saveRecord = async (stage, values) => {
    const existing = selectedRecords[stage.id];
    setSavingStage(stage.id);
    try {
      if (existing) {
        await base44.entities.FarmSeasonChecklist.update(existing.id, values);
      } else {
        await base44.entities.FarmSeasonChecklist.create(
          payloadFor(stage, values),
        );
      }
      await load();
      return true;
    } catch (error) {
      toast.error(error.message || "The seasonal plan could not be saved");
      return false;
    } finally {
      setSavingStage("");
    }
  };

  const chooseWindow = async (stage, value) => {
    const existing = selectedRecords[stage.id];
    if (value === "custom") {
      setCustomStage(stage.id);
      setCustomDates({
        start: existing?.start_date || "",
        end: existing?.end_date || "",
      });
      return;
    }
    setCustomStage("");
    if (value === "none") {
      if (!existing) return;
      setSavingStage(stage.id);
      try {
        await base44.entities.FarmSeasonChecklist.delete(existing.id);
        toast.success(`${stage.shortLabel} removed from the plan`);
        await load();
      } catch (error) {
        toast.error(error.message || "The planned period could not be removed");
      } finally {
        setSavingStage("");
      }
      return;
    }
    const option = stage.options.find((item) => item.code === value);
    if (!option) return;
    const saved = await saveRecord(stage, {
      window_code: option.code,
      window_label: option.label,
      start_date: dateForMonth(year, option.startMonth),
      end_date: dateForMonth(year, option.endMonth, true),
      completed: existing?.completed || false,
      status: existing?.completed ? "completed" : "planned",
    });
    if (saved)
      toast.success(`${stage.shortLabel} scheduled for ${option.label}`);
  };

  const saveCustom = async (stage) => {
    if (!customDates.start || !customDates.end) {
      toast.error("Choose both a start and end date");
      return;
    }
    if (customDates.end < customDates.start) {
      toast.error("The end date must be after the start date");
      return;
    }
    const existing = selectedRecords[stage.id];
    const saved = await saveRecord(stage, {
      window_code: "custom",
      window_label: `${customDates.start} – ${customDates.end}`,
      start_date: customDates.start,
      end_date: customDates.end,
      completed: existing?.completed || false,
      status: existing?.completed ? "completed" : "planned",
    });
    if (saved) {
      setCustomStage("");
      toast.success(`${stage.shortLabel} custom period saved`);
    }
  };

  const toggleCompleted = async (stage, checked) => {
    const existing = selectedRecords[stage.id];
    if (!existing) return;
    const saved = await saveRecord(stage, {
      completed: Boolean(checked),
      status: checked ? "completed" : "planned",
      completed_at: checked ? new Date().toISOString() : "",
    });
    if (saved)
      toast.success(
        `${stage.shortLabel} marked ${checked ? "complete" : "planned"}`,
      );
  };

  const copyToBlocks = async () => {
    const sourceRecords = SEASON_STAGES.map(
      (stage) => selectedRecords[stage.id],
    ).filter(Boolean);
    const activeBlocks = blocks.filter(
      (block) => block.status === "active" || !block.status,
    );
    if (!sourceRecords.length) {
      toast.error("Schedule at least one farm stage before copying");
      return;
    }
    if (!activeBlocks.length) {
      toast.error("There are no active subblocks to update");
      return;
    }
    setCopying(true);
    try {
      const operations = activeBlocks.flatMap((block) =>
        sourceRecords.map((source) => {
          const existing = recordFor(records, block.id, source.stage);
          const stage = SEASON_STAGES.find((item) => item.id === source.stage);
          const values = {
            farm_id: farm.id,
            farm_name: farm.name,
            block_id: block.id,
            block_name: block.name,
            block_code: block.block_code,
            season_year: year,
            stage: source.stage,
            stage_label: source.stage_label || stage?.label,
            window_code: source.window_code,
            window_label: source.window_label,
            start_date: source.start_date,
            end_date: source.end_date,
            completed: false,
            completed_at: "",
            status: "planned",
            source: "copied_from_farm_plan",
          };
          return existing
            ? base44.entities.FarmSeasonChecklist.update(existing.id, values)
            : base44.entities.FarmSeasonChecklist.create(values);
        }),
      );
      await Promise.all(operations);
      await load();
      toast.success(
        `Farm plan copied to ${activeBlocks.length} active subblocks`,
      );
    } catch (error) {
      toast.error(error.message || "The farm plan could not be copied");
    } finally {
      setCopying(false);
    }
  };

  return (
    <section
      className={cn("overflow-hidden rounded-xl border bg-card", className)}
    >
      <div className="flex flex-col gap-4 border-b px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Seasonal operations
          </p>
          <h2 className="mt-1 font-heading text-2xl font-semibold">
            Season checklist
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select each operating window, then tick it off when the work is
            complete.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {!lockScope ? (
            <label className="text-[11px] font-medium text-muted-foreground">
              View plan for
              <Select value={selectedScope} onValueChange={setSelectedScope}>
                <SelectTrigger className="mt-1 h-9 min-w-[220px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="farm">
                    Entire farmland · {farm.name}
                  </SelectItem>
                  {blocks.map((block) => (
                    <SelectItem key={block.id} value={block.id}>
                      {block.block_code} · {block.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          ) : null}
          <label className="text-[11px] font-medium text-muted-foreground">
            Season year
            <Select
              value={String(year)}
              onValueChange={(value) => setYear(Number(value))}
            >
              <SelectTrigger className="mt-1 h-9 w-[110px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3 bg-muted/25 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="font-semibold">
            {selectedBlock
              ? `${selectedBlock.block_code} · ${selectedBlock.name}`
              : farm.name}
          </span>
          <span className="text-muted-foreground">
            {scheduledCount}/3 scheduled
          </span>
          <span className="text-emerald-700">{completedCount}/3 completed</span>
        </div>
        {canEdit && selectedScope === "farm" && !lockScope ? (
          <Button
            size="sm"
            variant="outline"
            disabled={copying || loading}
            onClick={copyToBlocks}
          >
            {copying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Copy farm plan to active subblocks
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {SEASON_STAGES.map((stage) => (
            <Skeleton key={stage.id} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="divide-y">
          {SEASON_STAGES.map((stage) => {
            const record = selectedRecords[stage.id];
            const Icon = stage.icon;
            const isSaving = savingStage === stage.id;
            return (
              <div key={stage.id} className="px-5 py-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(230px,1fr)_minmax(220px,0.8fr)_150px] lg:items-center">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn("mt-0.5 rounded-lg border p-2", stage.tone)}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{stage.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {stage.description}
                      </p>
                    </div>
                  </div>
                  <Select
                    disabled={!canEdit || isSaving}
                    value={record?.window_code || "none"}
                    onValueChange={(value) => chooseWindow(stage, value)}
                  >
                    <SelectTrigger
                      className="bg-background"
                      aria-label={`${stage.label} period`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not scheduled</SelectItem>
                      {stage.options.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          {option.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom dates</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm">
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Checkbox
                        checked={Boolean(record?.completed)}
                        disabled={!canEdit || !record}
                        onCheckedChange={(checked) =>
                          toggleCompleted(stage, checked)
                        }
                      />
                    )}
                    <span
                      className={cn(
                        record?.completed && "font-medium text-emerald-700",
                      )}
                    >
                      {record?.completed ? "Completed" : "Mark complete"}
                    </span>
                  </label>
                </div>
                {customStage === stage.id ? (
                  <div className="mt-3 flex flex-col gap-2 rounded-lg border border-dashed bg-muted/20 p-3 sm:flex-row sm:items-end">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Start date
                      <Input
                        className="mt-1 h-9 bg-background"
                        type="date"
                        value={customDates.start}
                        onChange={(event) =>
                          setCustomDates((value) => ({
                            ...value,
                            start: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="text-[11px] font-medium text-muted-foreground">
                      End date
                      <Input
                        className="mt-1 h-9 bg-background"
                        type="date"
                        min={customDates.start}
                        value={customDates.end}
                        onChange={(event) =>
                          setCustomDates((value) => ({
                            ...value,
                            end: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <Button
                      size="sm"
                      disabled={isSaving}
                      onClick={() => saveCustom(stage)}
                    >
                      Save custom period
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCustomStage("")}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : null}
                {record && customStage !== stage.id ? (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-12">
                    <StageStatus record={record} />
                    <span className="text-xs text-muted-foreground">
                      {record.start_date} to {record.end_date}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
