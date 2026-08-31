import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LandPlot,
  Layers3,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sprout,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageSkeleton from '@/components/shared/PageSkeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { subscribeToDataChanges } from '@/lib/data-sync';

const PAGE_PATH = '/admin/farm-daily-activities/harvests/season-planner';
const CURRENT_YEAR = new Date().getFullYear();
const HARVEST_TYPES = [
  { value: 'early_harvest', label: 'Early Major', group: 'Major', fertilizer: 'Jun – Jul', flower: 'Sept – Oct', harvest: 'Apr – May', startMonth: 4, endMonth: 5 },
  { value: 'major_harvest', label: 'Major Season', group: 'Major', fertilizer: 'Aug – Sept', flower: 'Nov – Dec', harvest: 'Jun – Jul', startMonth: 6, endMonth: 7 },
  { value: 'late_harvest', label: 'Late Major', group: 'Major', fertilizer: 'Oct – Nov', flower: 'Jan – Feb', harvest: 'Jul – Aug', startMonth: 7, endMonth: 8 },
  { value: 'off_season_harvest', label: 'Minor', group: 'Minor', fertilizer: 'Feb – Mar', flower: 'May – Jun', harvest: 'Nov – Dec', startMonth: 11, endMonth: 12 },
];
const STATUSES = ['planned', 'active', 'completed', 'cancelled'];
const REMINDER_OPTIONS = [
  { value: 0, label: 'At scheduled time' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
  { value: 2880, label: '2 days before' },
  { value: 10080, label: '1 week before' },
];
const inputClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15';

const typeInfo = (value) => HARVEST_TYPES.find((item) => item.value === value) || HARVEST_TYPES[0];
const endOfMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const dateFor = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const seasonDates = (harvestType, seasonYear) => {
  const type = typeInfo(harvestType);
  const year = Number(seasonYear || CURRENT_YEAR);
  return {
    expected_start_date: dateFor(year, type.startMonth, 1),
    expected_end_date: dateFor(year, type.endMonth, endOfMonth(year, type.endMonth)),
  };
};
const emptyForm = (farmId = '') => ({
  farm_id: farmId,
  scope: 'farm',
  block_id: '',
  harvest_type: 'early_harvest',
  season_year: CURRENT_YEAR,
  ...seasonDates('early_harvest', CURRENT_YEAR),
  schedule_date: '',
  start_time: '07:00',
  end_time: '12:00',
  reminders_enabled: true,
  reminder_minutes: 1440,
  status: 'planned',
  expected_yield_kg: '',
  notes: '',
  apply_to_blocks: false,
});
const eventDateTime = (date, time) => date && time ? new Date(`${date}T${time}:00`).toISOString() : '';
const eventStatus = (status) => ({ planned: 'scheduled', active: 'in_progress', completed: 'completed', cancelled: 'cancelled' })[status] || 'scheduled';
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Accra' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00Z`)) : 'Not scheduled';
const formatDateTime = (value) => value ? new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Accra' }).format(new Date(value)) : 'Date and time not set';
const reminderLabel = (minutes) => REMINDER_OPTIONS.find((item) => item.value === Number(minutes))?.label || `${minutes} minutes before`;
const todayKey = () => new Date().toISOString().slice(0, 10);
const calendarDaysFor = (viewDate) => {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
};
const inferHarvestType = (dateValue) => {
  const month = Number(String(dateValue).slice(5, 7));
  if ([11, 12].includes(month)) return 'off_season_harvest';
  if (month === 8) return 'late_harvest';
  if ([6, 7].includes(month)) return 'major_harvest';
  return 'early_harvest';
};
const inlineDraft = ({ year, harvestType, status } = {}) => {
  const nextYear = Number(year) || CURRENT_YEAR;
  const nextType = harvestType && harvestType !== 'all' ? harvestType : 'early_harvest';
  return {
    harvest_type: nextType,
    season_year: nextYear,
    ...seasonDates(nextType, nextYear),
    status: status && status !== 'all' ? status : 'planned',
  };
};

function Metric({ icon: Icon, label, value, note }) {
  return <div className="border-r border-border/70 px-4 py-3 last:border-r-0"><div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-emerald-700" /></div><strong className="mt-2 block text-2xl font-semibold tracking-tight">{value}</strong><span className="mt-1 block text-[11px] text-muted-foreground">{note}</span></div>;
}

function Field({ label, children, hint, className = '' }) {
  return <div className={`space-y-1.5 ${className}`}><Label>{label}</Label>{children}{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}</div>;
}

function InlineScheduleRow({ scope, defaults, busy, onSave, onReminder }) {
  const [draft, setDraft] = useState(() => inlineDraft(defaults));
  const changeType = (harvestType) => setDraft((current) => ({
    ...current,
    harvest_type: harvestType,
    ...seasonDates(harvestType, current.season_year),
  }));
  const label = scope.code || scope.name;

  return (
    <tr className="bg-emerald-50/20 transition-colors hover:bg-emerald-50/45">
      <td className="px-5 py-4">
        <div className="flex items-start gap-3">
          {scope.id ? <Layers3 className="mt-2 h-4 w-4 text-muted-foreground" /> : <LandPlot className="mt-2 h-4 w-4 text-emerald-700" />}
          <div><p className="font-semibold">{label}</p><p className="mt-0.5 text-xs text-muted-foreground">{scope.kind}{scope.id ? ` · ${scope.name}` : ''}</p></div>
        </div>
      </td>
      <td className="px-3 py-3">
        <select aria-label={`Harvest type for ${label}`} className={`${inputClass} min-w-[150px]`} value={draft.harvest_type} onChange={(event) => changeType(event.target.value)}>
          {HARVEST_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
      </td>
      <td className="px-3 py-3">
        <select aria-label={`Season period for ${label}`} className={`${inputClass} min-w-[135px] font-medium text-emerald-800`} value={draft.harvest_type} onChange={(event) => changeType(event.target.value)}>
          {HARVEST_TYPES.map((type) => <option key={type.value} value={type.value}>{type.harvest}</option>)}
        </select>
        <span className="mt-1 block text-xs text-muted-foreground">{formatDate(draft.expected_start_date)} – {formatDate(draft.expected_end_date)}</span>
      </td>
      <td className="px-3 py-3"><Button type="button" size="sm" variant="outline" className="whitespace-nowrap" onClick={() => onReminder(draft, false)}><CalendarClock className="mr-1.5 h-4 w-4" />Set date & time</Button></td>
      <td className="px-3 py-3"><Button type="button" size="sm" variant="outline" className="whitespace-nowrap border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={() => onReminder(draft, true)}><Bell className="mr-1.5 h-4 w-4" />Set reminder</Button></td>
      <td className="px-3 py-3">
        <select aria-label={`Status for ${label}`} className={`${inputClass} min-w-[120px] capitalize`} value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
          {STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
        </select>
      </td>
      <td className="px-4 py-3 text-right"><Button type="button" size="sm" disabled={busy} onClick={() => onSave(draft)}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}Save</Button></td>
    </tr>
  );
}

export default function HarvestSeasonPlanner() {
  const { toast } = useToast();
  const [farms, setFarms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inlineSaving, setInlineSaving] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => emptyForm());
  const [filters, setFilters] = useState({ search: '', farm: 'all', type: 'all', status: 'all', year: String(CURRENT_YEAR) });
  const [workspace, setWorkspace] = useState('plan');
  const [expandedFarmId, setExpandedFarmId] = useState('');
  const [viewDate, setViewDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [farmRows, periodRows, calendarRows] = await Promise.all([
        base44.farms.list({ limit: 250 }).catch(() => []),
        base44.farms.harvestPeriods().catch(() => []),
        base44.entities.CalendarEvent.list('start_at', 250).catch(() => []),
      ]);
      const profiles = await Promise.all(farmRows.map((farm) => base44.farms.get(farm.id).catch(() => ({ ...farm, blocks: [] }))));
      setFarms(profiles);
      setExpandedFarmId((current) => profiles.some((farm) => farm.id === current) ? current : profiles[0]?.id || '');
      setPeriods(periodRows || []);
      setEvents((calendarRows || []).filter((item) => item.harvest_period_id));
    } catch (error) {
      toast({ title: 'Harvest seasons could not be loaded', description: error.message, variant: 'destructive' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let timer;
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = window.setTimeout(() => load({ silent: true }), 160);
    }, ['HarvestPeriod', 'CalendarEvent', 'Farm', 'FarmBlock']);
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [load]);

  const eventByPeriod = useMemo(() => new Map(events.map((event) => [event.harvest_period_id, event])), [events]);
  const periodById = useMemo(() => new Map(periods.map((period) => [period.id, period])), [periods]);
  const metrics = useMemo(() => {
    const visibleYear = Number(filters.year || CURRENT_YEAR);
    const yearPeriods = periods.filter((period) => Number(period.season_year) === visibleYear);
    const coveredFarms = new Set(yearPeriods.map((period) => period.farm_id)).size;
    const coveredBlocks = new Set(yearPeriods.map((period) => period.block_id).filter(Boolean)).size;
    const reminders = yearPeriods.filter((period) => eventByPeriod.get(period.id)?.reminders_enabled && new Date(eventByPeriod.get(period.id).start_at) >= new Date()).length;
    return { total: yearPeriods.length, coveredFarms, coveredBlocks, reminders };
  }, [eventByPeriod, filters.year, periods]);

  const filteredFarms = useMemo(() => farms.filter((farm) => {
    if (filters.farm !== 'all' && farm.id !== filters.farm) return false;
    const search = filters.search.trim().toLowerCase();
    if (!search) return true;
    return `${farm.name} ${farm.farm_code} ${farm.location} ${(farm.blocks || []).map((block) => `${block.name} ${block.block_code}`).join(' ')}`.toLowerCase().includes(search);
  }), [farms, filters.farm, filters.search]);

  const filteredCalendarEvents = useMemo(() => events.filter((calendarEvent) => {
    const period = periodById.get(calendarEvent.harvest_period_id);
    if (!period) return false;
    if (filters.farm !== 'all' && period.farm_id !== filters.farm) return false;
    if (filters.type !== 'all' && period.harvest_type !== filters.type) return false;
    if (filters.status !== 'all' && period.status !== filters.status) return false;
    if (filters.year !== 'all' && Number(period.season_year) !== Number(filters.year)) return false;
    return true;
  }), [events, filters.farm, filters.status, filters.type, filters.year, periodById]);
  const calendarDays = useMemo(() => calendarDaysFor(viewDate), [viewDate]);
  const calendarEventsByDate = useMemo(() => filteredCalendarEvents.reduce((groups, calendarEvent) => {
    const key = String(calendarEvent.start_at || '').slice(0, 10);
    if (!key) return groups;
    (groups[key] ||= []).push(calendarEvent);
    return groups;
  }, {}), [filteredCalendarEvents]);
  const selectedEvents = calendarEventsByDate[selectedDate] || [];

  const visiblePeriods = useCallback((farmId, blockId = null) => periods.filter((period) => {
    if (period.farm_id !== farmId || (period.block_id || null) !== blockId) return false;
    if (filters.type !== 'all' && period.harvest_type !== filters.type) return false;
    if (filters.status !== 'all' && period.status !== filters.status) return false;
    if (filters.year !== 'all' && Number(period.season_year) !== Number(filters.year)) return false;
    return true;
  }).sort((left, right) => String(left.expected_start_date || '').localeCompare(String(right.expected_start_date || ''))), [filters.status, filters.type, filters.year, periods]);

  const openCreate = (farmId = farms[0]?.id || '', blockId = '', scheduleDate = '', initial = {}) => {
    const harvestType = initial.harvest_type || (scheduleDate ? inferHarvestType(scheduleDate) : 'early_harvest');
    const seasonYear = Number(initial.season_year || String(scheduleDate || CURRENT_YEAR).slice(0, 4)) || CURRENT_YEAR;
    setEditing(null);
    setForm({
      ...emptyForm(farmId),
      harvest_type: harvestType,
      season_year: seasonYear,
      ...seasonDates(harvestType, seasonYear),
      ...initial,
      farm_id: farmId,
      scope: blockId ? 'block' : 'farm',
      block_id: blockId,
      schedule_date: scheduleDate || initial.schedule_date || '',
    });
    setEditorOpen(true);
  };

  const openInlineEditor = (farm, scope, draft, reminder = false) => {
    openCreate(farm.id, scope.id || '', selectedDate, {
      ...draft,
      reminders_enabled: reminder,
      reminder_minutes: 1440,
    });
  };

  const openEdit = (period) => {
    const event = eventByPeriod.get(period.id);
    setEditing(period);
    setForm({
      farm_id: period.farm_id,
      scope: period.block_id ? 'block' : 'farm',
      block_id: period.block_id || '',
      harvest_type: period.harvest_type,
      season_year: period.season_year || CURRENT_YEAR,
      expected_start_date: period.expected_start_date || '',
      expected_end_date: period.expected_end_date || '',
      schedule_date: String(event?.start_at || '').slice(0, 10),
      start_time: String(event?.start_at || '').slice(11, 16) || '07:00',
      end_time: String(event?.end_at || '').slice(11, 16) || '12:00',
      reminders_enabled: Boolean(event?.reminders_enabled),
      reminder_minutes: Number(event?.reminder_minutes || 1440),
      status: period.status || 'planned',
      expected_yield_kg: period.expected_yield_kg || '',
      notes: period.notes || '',
      apply_to_blocks: false,
    });
    setEditorOpen(true);
  };

  const change = (key, value) => setForm((current) => {
    if (key === 'harvest_type' || key === 'season_year') {
      const next = { ...current, [key]: value };
      return { ...next, ...seasonDates(next.harvest_type, next.season_year) };
    }
    if (key === 'farm_id') return { ...current, farm_id: value, block_id: '' };
    return { ...current, [key]: value };
  });

  const createCalendarEvent = async (period, farm, block, sequence = 0) => {
    if (!form.schedule_date) return null;
    const info = typeInfo(form.harvest_type);
    return base44.entities.CalendarEvent.create({
      task_code: `HSP-${Date.now().toString().slice(-8)}-${sequence}`,
      harvest_period_id: period.id,
      title: `${info.label} harvest — ${block?.block_code || farm.name}`,
      description: `Harvest season schedule for ${block ? `${block.name}, ${farm.name}` : farm.name}.`,
      category: 'Harvesting',
      farm_id: farm.id,
      farm_name: farm.name,
      block_id: block?.id || '',
      block_name: block?.name || '',
      priority: 'High',
      status: eventStatus(form.status),
      progress_percent: form.status === 'completed' ? 100 : 0,
      start_at: eventDateTime(form.schedule_date, form.start_time),
      end_at: eventDateTime(form.schedule_date, form.end_time),
      all_day: false,
      reminders_enabled: Boolean(form.reminders_enabled),
      reminder_minutes: Number(form.reminder_minutes || 0),
      reminder_sent_at: '',
      reminder_sent_for_start: '',
      notes: form.notes.trim(),
      timezone: 'Africa/Accra',
      source: 'Harvest Season Planner',
      destination: PAGE_PATH,
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (form.expected_end_date && form.expected_start_date && form.expected_end_date < form.expected_start_date) {
      toast({ title: 'Harvest period is invalid', description: 'The period end cannot be before its start.', variant: 'destructive' });
      return;
    }
    const farm = farms.find((item) => item.id === form.farm_id);
    if (!farm) return;
    setSaving(true);
    try {
      const payload = {
        farm_id: farm.id,
        block_id: form.scope === 'block' ? form.block_id || null : null,
        harvest_type: form.harvest_type,
        status: form.status,
        season_year: Number(form.season_year),
        expected_start_date: form.expected_start_date || null,
        expected_end_date: form.expected_end_date || null,
        expected_yield_kg: Number(form.expected_yield_kg || 0),
        notes: form.notes.trim(),
      };
      if (editing) {
        const updated = await base44.farms.updateHarvestPeriod(editing.id, payload);
        const existingEvent = eventByPeriod.get(editing.id);
        const block = (farm.blocks || []).find((item) => item.id === updated.block_id);
        if (form.schedule_date) {
          const calendarPayload = {
            title: `${typeInfo(form.harvest_type).label} harvest — ${block?.block_code || farm.name}`,
            farm_id: farm.id, farm_name: farm.name, block_id: block?.id || '', block_name: block?.name || '',
            status: eventStatus(form.status), progress_percent: form.status === 'completed' ? 100 : Number(existingEvent?.progress_percent || 0),
            start_at: eventDateTime(form.schedule_date, form.start_time), end_at: eventDateTime(form.schedule_date, form.end_time), all_day: false,
            reminders_enabled: Boolean(form.reminders_enabled), reminder_minutes: Number(form.reminder_minutes || 0),
            reminder_sent_at: '', reminder_sent_for_start: '', notes: form.notes.trim(), timezone: 'Africa/Accra', source: 'Harvest Season Planner', destination: PAGE_PATH,
          };
          if (existingEvent) await base44.entities.CalendarEvent.update(existingEvent.id, calendarPayload);
          else await createCalendarEvent(updated, farm, block);
        } else if (existingEvent) {
          await base44.entities.CalendarEvent.update(existingEvent.id, { status: 'cancelled', reminders_enabled: false });
        }
        toast({ title: 'Harvest season updated', description: 'Farm, block profile, calendar, and reminder records are synchronized.' });
      } else {
        const selectedBlock = (farm.blocks || []).find((item) => item.id === form.block_id);
        const targets = form.scope === 'block'
          ? [selectedBlock].filter(Boolean)
          : [null, ...(form.apply_to_blocks ? (farm.blocks || []).filter((block) => block.status === 'active') : [])];
        const created = [];
        for (let index = 0; index < targets.length; index += 1) {
          const block = targets[index];
          const period = await base44.farms.createHarvestPeriod({ ...payload, block_id: block?.id || null });
          const calendarEvent = await createCalendarEvent(period, farm, block, index);
          created.push({ period, calendarEvent });
        }
        await base44.entities.Notification.create({
          title: 'Harvest season scheduled',
          message: `${typeInfo(form.harvest_type).label} was scheduled for ${farm.name}${form.apply_to_blocks ? ' and its active blocks' : selectedBlock ? ` — ${selectedBlock.block_code}` : ''}.`,
          type: 'harvest_schedule', notification_type: 'harvest_schedule', channel: 'Admin', status: 'new',
          record_id: created[0]?.period.id, entity_name: 'HarvestPeriod', calendar_event_id: created[0]?.calendarEvent?.id || '', destination: PAGE_PATH,
        });
        toast({ title: 'Harvest season scheduled', description: `${created.length} synchronized ${created.length === 1 ? 'schedule' : 'schedules'} created.` });
      }
      setEditorOpen(false);
      await load({ silent: true });
    } catch (error) {
      toast({ title: 'Harvest season could not be saved', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const createInlineSchedule = async (farm, scope, draft) => {
    if (draft.expected_end_date < draft.expected_start_date) {
      toast({ title: 'Harvest period is invalid', description: 'The period end cannot be before its start.', variant: 'destructive' });
      return;
    }
    const key = `${farm.id}:${scope.id || 'farm'}`;
    setInlineSaving(key);
    try {
      await base44.farms.createHarvestPeriod({
        farm_id: farm.id,
        block_id: scope.id || null,
        harvest_type: draft.harvest_type,
        status: draft.status,
        season_year: Number(draft.season_year),
        expected_start_date: draft.expected_start_date,
        expected_end_date: draft.expected_end_date,
        expected_yield_kg: 0,
        notes: '',
      });
      toast({ title: 'Harvest season saved', description: `${scope.code || scope.name} is ready for date, time, and reminder scheduling.` });
      await load({ silent: true });
    } catch (error) {
      toast({ title: 'Harvest season could not be saved', description: error.message, variant: 'destructive' });
    } finally {
      setInlineSaving('');
    }
  };

  const quickPeriodUpdate = async (period, patch, successMessage) => {
    setInlineSaving(period.id);
    try {
      const updated = await base44.farms.updateHarvestPeriod(period.id, patch);
      const calendarEvent = eventByPeriod.get(period.id);
      if (calendarEvent && patch.harvest_type) {
        const farm = farms.find((item) => item.id === period.farm_id);
        const block = (farm?.blocks || []).find((item) => item.id === period.block_id);
        await base44.entities.CalendarEvent.update(calendarEvent.id, { title: `${typeInfo(patch.harvest_type).label} harvest — ${block?.block_code || farm?.name || 'Farm land'}` });
      }
      setPeriods((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      toast({ title: successMessage });
    } catch (error) {
      toast({ title: 'Harvest season could not be updated', description: error.message, variant: 'destructive' });
    } finally {
      setInlineSaving('');
    }
  };

  const quickStatus = async (period, status) => {
    setInlineSaving(period.id);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const updated = await base44.farms.updateHarvestPeriod(period.id, {
        status,
        ...(status === 'active' && !period.actual_start_date ? { actual_start_date: today } : {}),
        ...(status === 'completed' && !period.actual_end_date ? { actual_end_date: today } : {}),
      });
      const calendarEvent = eventByPeriod.get(period.id);
      if (calendarEvent) await base44.entities.CalendarEvent.update(calendarEvent.id, { status: eventStatus(status), progress_percent: status === 'completed' ? 100 : Number(calendarEvent.progress_percent || 0) });
      setPeriods((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      toast({ title: `Harvest marked ${status.replaceAll('_', ' ')}` });
    } catch (error) {
      toast({ title: 'Status could not be updated', description: error.message, variant: 'destructive' });
    } finally {
      setInlineSaving('');
    }
  };

  const selectedFarm = farms.find((farm) => farm.id === form.farm_id);

  if (loading && !farms.length) return <PageSkeleton variant="calendar" />;

  return (
    <div className="space-y-5 pb-10">
      <section className="overflow-hidden rounded-xl border border-emerald-900/15 bg-[#f4f7f4]">
        <div className="flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-end lg:justify-end">
          <div className="flex gap-2"><Button variant="outline" onClick={() => load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button><Button onClick={() => openCreate()} disabled={!farms.length}><Plus className="mr-2 h-4 w-4" />Schedule harvest</Button></div>
        </div>
        <div className="grid border-t border-border/70 bg-background/65 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={CalendarClock} label={`Schedules in ${filters.year === 'all' ? 'all years' : filters.year}`} value={metrics.total} note="Land and block harvest periods" />
          <Metric icon={LandPlot} label="Farm lands covered" value={`${metrics.coveredFarms}/${farms.length}`} note="Farms with a season plan" />
          <Metric icon={Layers3} label="Sub-blocks covered" value={metrics.coveredBlocks} note="Blocks with individual schedules" />
          <Metric icon={Bell} label="Upcoming reminders" value={metrics.reminders} note="Enabled future alerts" />
        </div>
      </section>

      <nav className="flex flex-wrap items-center gap-1 rounded-xl border bg-card p-1.5" aria-label="Harvest planning views">
        {[
          { id: 'plan', label: 'Plan farms', icon: LandPlot, note: 'Farm and block setup' },
          { id: 'calendar', label: 'Calendar', icon: CalendarClock, note: 'Dates and reminders' },
          { id: 'guide', label: 'Season guide', icon: Sprout, note: 'Reference windows' },
        ].map((item) => {
          const Icon = item.icon;
          const active = workspace === item.id;
          return <button key={item.id} type="button" onClick={() => setWorkspace(item.id)} className={`flex min-w-[180px] flex-1 items-center gap-3 rounded-lg px-4 py-3 text-left transition ${active ? 'bg-emerald-900 text-white shadow-sm' : 'text-foreground hover:bg-muted/60'}`}><Icon className={`h-4 w-4 ${active ? 'text-amber-300' : 'text-emerald-700'}`} /><span><b className="block text-sm">{item.label}</b><small className={`block text-[11px] ${active ? 'text-emerald-100/80' : 'text-muted-foreground'}`}>{item.note}</small></span></button>;
        })}
      </nav>

      {workspace === 'guide' ? <section className="rounded-xl border bg-card animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
        <div className="border-b px-5 py-4"><h3 className="font-heading text-lg font-semibold">Season reference</h3><p className="mt-1 text-xs text-muted-foreground">Default operational windows from the farm register. Exact dates remain editable per land and block.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-emerald-50/70 text-left text-xs uppercase tracking-wide text-emerald-950"><tr><th className="px-5 py-3">Cycle</th><th className="px-5 py-3">Season</th><th className="px-5 py-3">Fertilizer application</th><th className="px-5 py-3">Flower induction</th><th className="px-5 py-3">Harvest window</th></tr></thead><tbody className="divide-y">{HARVEST_TYPES.map((type) => <tr key={type.value} className="transition-colors hover:bg-muted/35"><td className="px-5 py-3 font-medium">{type.group}</td><td className="px-5 py-3 font-semibold">{type.label}</td><td className="px-5 py-3">{type.fertilizer}</td><td className="px-5 py-3">{type.flower}</td><td className="px-5 py-3 font-medium text-emerald-800">{type.harvest}</td></tr>)}</tbody></table></div>
      </section> : null}

      {workspace === 'calendar' ? <section className="overflow-hidden rounded-xl border bg-card animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div><h3 className="font-heading text-lg font-semibold">Harvest activity calendar</h3><p className="mt-1 text-xs text-muted-foreground">Shared with Production Calendar, company calendar subscriptions, dashboard summaries, and reminders.</p></div>
          <div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button><strong className="min-w-40 text-center text-sm">{viewDate.toLocaleDateString('en-GH', { month: 'long', year: 'numeric' })}</strong><Button variant="outline" size="icon" onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button><Button variant="ghost" size="sm" onClick={() => { const now = new Date(); setViewDate(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedDate(todayKey()); }}>Today</Button></div>
        </div>
        <div className="grid xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 border-r">
            <div className="grid grid-cols-7 border-b bg-muted/35">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{day}</div>)}</div>
            <div className="grid grid-cols-7">{calendarDays.map((day) => {
              const key = day.toISOString().slice(0, 10);
              const dayEvents = calendarEventsByDate[key] || [];
              const inMonth = day.getMonth() === viewDate.getMonth();
              return <div key={key} role="button" tabIndex={0} onClick={() => setSelectedDate(key)} onDoubleClick={() => openCreate(filters.farm !== 'all' ? filters.farm : farms[0]?.id, '', key)} onKeyDown={(event) => event.key === 'Enter' && setSelectedDate(key)} className={`min-h-24 border-b border-r p-2 text-left outline-none transition-colors hover:bg-emerald-50/35 focus:ring-2 focus:ring-inset focus:ring-primary ${!inMonth ? 'bg-muted/15 text-muted-foreground' : ''} ${selectedDate === key ? 'bg-emerald-50/60' : ''}`}><span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold ${key === todayKey() ? 'bg-primary text-primary-foreground' : ''}`}>{day.getDate()}</span><div className="mt-1 space-y-1">{dayEvents.slice(0, 2).map((calendarEvent) => {
                const period = periodById.get(calendarEvent.harvest_period_id);
                return <button type="button" key={calendarEvent.id} onClick={(event) => { event.stopPropagation(); if (period) openEdit(period); }} className="block w-full truncate rounded border border-emerald-200 bg-emerald-50 px-1.5 py-1 text-left text-[9px] font-semibold text-emerald-900 transition hover:border-emerald-400">{String(calendarEvent.start_at).slice(11, 16)} · {calendarEvent.title}</button>;
              })}{dayEvents.length > 2 ? <span className="block px-1 text-[9px] text-muted-foreground">+{dayEvents.length - 2} more</span> : null}</div></div>;
            })}</div>
          </div>
          <aside className="self-start"><div className="flex items-start justify-between border-b p-4"><div><span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Selected day</span><h4 className="mt-1 font-semibold">{formatDate(selectedDate)}</h4></div><Button size="icon" variant="ghost" onClick={() => openCreate(filters.farm !== 'all' ? filters.farm : farms[0]?.id, '', selectedDate)} title="Schedule harvest on selected day"><Plus className="h-4 w-4" /></Button></div><div className="max-h-[590px] overflow-y-auto p-3">{selectedEvents.length ? selectedEvents.map((calendarEvent) => {
            const period = periodById.get(calendarEvent.harvest_period_id);
            return <button type="button" key={calendarEvent.id} onClick={() => period && openEdit(period)} className="mb-2 w-full rounded-lg border p-3 text-left transition hover:border-primary/40 hover:bg-muted/35"><div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold leading-5">{calendarEvent.title}</span><StatusBadge status={period?.status || calendarEvent.status} /></div><p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{formatDateTime(calendarEvent.start_at)}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{calendarEvent.block_name || calendarEvent.farm_name}</p>{calendarEvent.reminders_enabled ? <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700"><Bell className="h-3.5 w-3.5" />{reminderLabel(calendarEvent.reminder_minutes)}</p> : null}</button>;
          }) : <div className="py-12 text-center"><CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-3 text-sm text-muted-foreground">No harvest activity scheduled.</p><Button className="mt-4" size="sm" onClick={() => openCreate(filters.farm !== 'all' ? filters.farm : farms[0]?.id, '', selectedDate)}>Schedule this day</Button></div>}</div></aside>
        </div>
      </section> : null}

      {workspace === 'plan' ? <section className="rounded-xl border bg-card animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
        <div className="grid gap-3 border-b p-4 lg:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(135px,0.45fr))]">
          <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search farm land or block" /></label>
          <select className={inputClass} value={filters.farm} onChange={(event) => { const farmId = event.target.value; setFilters((current) => ({ ...current, farm: farmId })); if (farmId !== 'all') setExpandedFarmId(farmId); }}><option value="all">All farm lands</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select>
          <select className={inputClass} value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}><option value="all">All harvest types</option>{HARVEST_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
          <select className={inputClass} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="all">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select>
          <select className={inputClass} value={filters.year} onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}><option value="all">All years</option>{[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2].map((year) => <option key={year}>{year}</option>)}</select>
        </div>

        <div className="divide-y">{filteredFarms.map((farm) => {
          const scopes = [{ id: null, name: farm.name, code: farm.farm_code, kind: 'Farm land', periods: visiblePeriods(farm.id, null) }, ...(farm.blocks || []).filter((block) => block.status !== 'merged').map((block) => ({ id: block.id, name: block.name, code: block.block_code, kind: 'Sub-block', block, periods: visiblePeriods(farm.id, block.id) }))];
          const expanded = expandedFarmId === farm.id;
          return <div key={farm.id} className="animate-in fade-in-0 duration-300">
            <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors ${expanded ? 'bg-emerald-50/60' : 'bg-muted/20 hover:bg-muted/40'}`}>
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setExpandedFarmId(expanded ? '' : farm.id)} aria-expanded={expanded}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border bg-background"><ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90 text-emerald-700' : 'text-muted-foreground'}`} /></span>
                <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><MapPin className="h-4 w-4 text-emerald-700" /><b className="truncate">{farm.name}</b><StatusBadge status={farm.status} /></span><small className="mt-0.5 block truncate text-muted-foreground">{farm.location || farm.region || 'Location not recorded'} · {(farm.blocks || []).filter((block) => block.status === 'active').length} active blocks · {periods.filter((period) => period.farm_id === farm.id).length} schedules</small></span>
              </button>
              <Button size="sm" variant="outline" onClick={() => openCreate(farm.id)}><Plus className="mr-1 h-4 w-4" />Land schedule</Button>
            </div>
            {expanded ? <div className="max-h-[640px] overflow-auto"><table className="w-full min-w-[1320px] text-sm"><thead className="sticky top-0 z-[1] border-y bg-background text-left text-[11px] uppercase tracking-wide text-muted-foreground shadow-sm"><tr><th className="w-[220px] px-5 py-2.5">Farm land / block</th><th className="px-4 py-2.5">Harvest type</th><th className="px-4 py-2.5">Season period</th><th className="px-4 py-2.5">Scheduled date & time</th><th className="px-4 py-2.5">Reminder</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5 text-right">Action</th></tr></thead><tbody className="divide-y">{scopes.flatMap((scope) => scope.periods.length ? scope.periods.map((period, index) => {
            const calendarEvent = eventByPeriod.get(period.id);
            const info = typeInfo(period.harvest_type);
            return <tr key={period.id} className="group transition-colors hover:bg-emerald-50/25">
              <td className="px-5 py-4"><div className="flex items-start gap-3">{scope.id ? <Layers3 className="mt-2 h-4 w-4 text-muted-foreground" /> : <LandPlot className="mt-2 h-4 w-4 text-emerald-700" />}<div><p className="font-semibold">{scope.code || scope.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{scope.kind}{scope.id ? ` · ${scope.name}` : ''}{index ? ' · additional season' : ''}</p></div></div></td>
              <td className="px-3 py-3"><select aria-label={`Harvest type for ${scope.code || scope.name}`} className={`${inputClass} min-w-[150px]`} value={period.harvest_type} disabled={inlineSaving === period.id} onChange={(event) => { const harvestType = event.target.value; quickPeriodUpdate(period, { harvest_type: harvestType, ...seasonDates(harvestType, period.season_year) }, 'Harvest type updated'); }}>{HARVEST_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select><span className="mt-1 block text-xs text-muted-foreground">{period.season_year} · {info.group}</span></td>
              <td className="px-3 py-3"><select aria-label={`Season period for ${scope.code || scope.name}`} className={`${inputClass} min-w-[135px] font-medium text-emerald-800`} value={period.harvest_type} disabled={inlineSaving === period.id} onChange={(event) => { const harvestType = event.target.value; quickPeriodUpdate(period, { harvest_type: harvestType, ...seasonDates(harvestType, period.season_year) }, 'Season period updated'); }}>{HARVEST_TYPES.map((type) => <option key={type.value} value={type.value}>{type.harvest}</option>)}</select><span className="mt-1 block text-xs text-muted-foreground">{formatDate(period.expected_start_date)} – {formatDate(period.expected_end_date)}</span></td>
              <td className="px-3 py-3"><Button type="button" size="sm" variant="outline" className="whitespace-nowrap" onClick={() => openEdit(period)}><CalendarClock className="mr-1.5 h-4 w-4" />{calendarEvent ? formatDateTime(calendarEvent.start_at) : 'Set date & time'}</Button></td>
              <td className="px-3 py-3"><Button type="button" size="sm" variant="outline" className={`whitespace-nowrap ${calendarEvent?.reminders_enabled ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-emerald-200 text-emerald-800'}`} onClick={() => openEdit(period)}><Bell className="mr-1.5 h-4 w-4" />{calendarEvent?.reminders_enabled ? reminderLabel(calendarEvent.reminder_minutes) : 'Set reminder'}</Button></td>
              <td className="px-3 py-3"><select aria-label={`Status for ${scope.code || scope.name}`} className={`${inputClass} min-w-[120px] capitalize`} value={period.status} disabled={inlineSaving === period.id} onChange={(event) => quickStatus(period, event.target.value)}>{STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></td>
              <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => openEdit(period)}>Details</Button></td>
            </tr>;
          }) : [<InlineScheduleRow key={`${farm.id}-${scope.id || 'farm'}-${filters.year}-${filters.type}-${filters.status}`} scope={scope} defaults={{ year: filters.year, harvestType: filters.type, status: filters.status }} busy={inlineSaving === `${farm.id}:${scope.id || 'farm'}`} onSave={(draft) => createInlineSchedule(farm, scope, draft)} onReminder={(draft, reminder) => openInlineEditor(farm, scope, draft, reminder)} />])}</tbody></table></div> : null}</div>;
        })}{!filteredFarms.length ? <div className="px-6 py-16 text-center"><Sprout className="mx-auto h-8 w-8 text-muted-foreground/50" /><p className="mt-3 font-medium">No farm lands match these filters</p><p className="mt-1 text-sm text-muted-foreground">Reset the filters or add the farm profile first.</p></div> : null}</div>
      </section> : null}

      <Dialog open={editorOpen} onOpenChange={(open) => !saving && setEditorOpen(open)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>{editing ? 'Edit harvest season' : 'Schedule harvest season'}</DialogTitle><DialogDescription>Connect the harvest period to a farm land or sub-block and optionally create a timed calendar reminder.</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Farm land"><select className={inputClass} value={form.farm_id} disabled={Boolean(editing)} onChange={(event) => change('farm_id', event.target.value)} required><option value="">Select farm land</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></Field>
              <Field label="Planning level"><select className={inputClass} value={form.scope} disabled={Boolean(editing)} onChange={(event) => change('scope', event.target.value)}><option value="farm">Whole farm land</option><option value="block">Specific sub-block</option></select></Field>
              {form.scope === 'block' ? <Field label="Sub-block"><select className={inputClass} value={form.block_id} disabled={Boolean(editing)} onChange={(event) => change('block_id', event.target.value)} required><option value="">Select sub-block</option>{(selectedFarm?.blocks || []).filter((block) => block.status === 'active').map((block) => <option key={block.id} value={block.id}>{block.block_code} · {block.name}</option>)}</select></Field> : null}
              <Field label="Harvest type"><select className={inputClass} value={form.harvest_type} onChange={(event) => change('harvest_type', event.target.value)}>{HARVEST_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field>
              <Field label="Season year"><Input type="number" min="2000" max="2200" value={form.season_year} onChange={(event) => change('season_year', event.target.value)} required /></Field>
              <Field label="Harvest period starts"><Input type="date" value={form.expected_start_date} onChange={(event) => change('expected_start_date', event.target.value)} required /></Field>
              <Field label="Harvest period ends"><Input type="date" min={form.expected_start_date || undefined} value={form.expected_end_date} onChange={(event) => change('expected_end_date', event.target.value)} required /></Field>
              <Field label="Scheduled harvest date"><Input type="date" value={form.schedule_date} onChange={(event) => change('schedule_date', event.target.value)} /></Field>
              <Field label="Expected yield (kg)"><Input type="number" min="0" step="0.01" value={form.expected_yield_kg} onChange={(event) => change('expected_yield_kg', event.target.value)} placeholder="Optional" /></Field>
              <Field label="Start time"><Input type="time" value={form.start_time} onChange={(event) => change('start_time', event.target.value)} disabled={!form.schedule_date} /></Field>
              <Field label="End time"><Input type="time" value={form.end_time} onChange={(event) => change('end_time', event.target.value)} disabled={!form.schedule_date} /></Field>
              <Field label="Tracking status"><select className={inputClass} value={form.status} onChange={(event) => change('status', event.target.value)}>{STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></Field>
              <Field label="Reminder"><div className="flex h-10 items-center gap-2 rounded-md border px-3"><input type="checkbox" checked={form.reminders_enabled} onChange={(event) => change('reminders_enabled', event.target.checked)} disabled={!form.schedule_date} /><span className="text-sm">Send reminder</span></div></Field>
              {form.reminders_enabled && form.schedule_date ? <Field label="Reminder time"><select className={inputClass} value={form.reminder_minutes} onChange={(event) => change('reminder_minutes', Number(event.target.value))}>{REMINDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field> : null}
            </div>
            {!editing && form.scope === 'farm' ? <label className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4"><input className="mt-1" type="checkbox" checked={form.apply_to_blocks} onChange={(event) => change('apply_to_blocks', event.target.checked)} /><span><b className="block text-sm">Also schedule every active sub-block</b><span className="mt-1 block text-xs leading-5 text-muted-foreground">Creates linked harvest-period and reminder records for the farm land and each active block.</span></span></label> : null}
            <Field label="Planning and field notes"><Textarea rows={3} maxLength={2000} value={form.notes} onChange={(event) => change('notes', event.target.value)} placeholder="Maturity checks, harvesting crew, buyer window, equipment, or constraints" /></Field>
            <div className="rounded-lg border bg-muted/25 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-700" />{typeInfo(form.harvest_type).label} reference</div><p className="mt-2 text-xs leading-5 text-muted-foreground">Fertilizer: {typeInfo(form.harvest_type).fertilizer} · Flower induction: {typeInfo(form.harvest_type).flower} · Typical harvest: {typeInfo(form.harvest_type).harvest}</p></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>Cancel</Button><Button disabled={saving || !form.farm_id || (form.scope === 'block' && !form.block_id)}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}{editing ? 'Save schedule' : 'Create schedule'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
