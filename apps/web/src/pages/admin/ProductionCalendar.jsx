import { scopeLabel, farmScopeOptions, resolveOperationalScope } from '@/lib/farm-scope';
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Bell, CalendarCheck2, Download, ExternalLink, RefreshCw, Settings2, X,
} from 'lucide-react';
import CompanyCalendarWorkspace from '@/components/admin/CompanyCalendarWorkspace';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  CALENDAR_CATEGORIES, CALENDAR_STATUSES, dateKey, downloadICalendar,
  eventToDailyActivityPayload, eventToTaskPayload, googleCalendarUrl,
  outlookCalendarUrl, buildFarmCalendarEvents, calendarStatusToTask,
} from '@/lib/production-calendar';

const STATUS_LABELS = {
  scheduled: 'Scheduled', in_progress: 'In progress', completed: 'Completed', blocked: 'Blocked', cancelled: 'Cancelled',
};
const harvestStatusFromCalendar = (status) => ({ scheduled: 'planned', in_progress: 'active', completed: 'completed', cancelled: 'cancelled' })[status] || 'planned';
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const REMINDERS = [
  { value: 0, label: 'At start time' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

const todayKey = () => new Date().toISOString().slice(0, 10);
const blankForm = (day = todayKey()) => ({
  title: '', description: '', date: day, start_time: '08:00', end_time: '09:00', all_day: false,
  category: 'Farm Operations', farm_id: '', farm_name: '', block_id: '', block_name: '', block_code: '', shared_scope: '', assigned_to_name: '', priority: 'Medium',
  status: 'scheduled', progress_percent: 0, reminders_enabled: true, reminder_minutes: 30, notes: '',
});
const createCode = () => `CAL-${Date.now().toString(36).toUpperCase()}`;
const eventDate = (day, time, allDay, end = false) => {
  if (!allDay) return `${day}T${time}:00.000Z`;
  const value = new Date(`${day}T00:00:00.000Z`);
  if (end) value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString();
};
const feedUrl = (connection) => {
  if (!connection?.feed_token || import.meta.env.VITE_DEMO_MODE === 'true') return '';
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
  const path = `${apiBase}/calendar/feed/${connection.feed_token}`;
  return new URL(path, window.location.origin).toString();
};

export default function ProductionCalendar() {
  return <FarmCalendar />;
}

function FarmCalendar() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { key: locationKey } = useLocation();
  const requestedEvent = searchParams.get('event');
  const now = new Date();
  const [viewDate, setViewDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [events, setEvents] = useState([]);
  const [farms, setFarms] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => blankForm());

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [calendarEvents, farmRecords, connectionRecords, blockRecords, farmProjects, farmTasks, dailyActivities] = await Promise.all([
        base44.entities.CalendarEvent.listAll('start_at'),
        base44.entities.Farm.list('name', 250).catch(() => []),
        base44.entities.CalendarConnection.list('-created_date', 20).catch(() => []),
        base44.entities.FarmBlock.listAll(),
        base44.entities.FarmProject.listAll().catch(() => []),
        base44.entities.FarmTask.listAll().catch(() => []),
        base44.entities.DailyActivity.listAll().catch(() => []),
      ]);
      const combinedEvents = buildFarmCalendarEvents({ calendarEvents, farmProjects, farmTasks, dailyActivities });
      setEvents(combinedEvents);
      setFarms(farmRecords || []);
      setBlocks(blockRecords || []);
      setConnections(connectionRecords || []);
    } catch (error) {
      toast({ title: 'Calendar could not be loaded', description: error.message, variant: 'destructive' });
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let timer;
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = window.setTimeout(() => load({ quiet: true }), 150);
    }, ['CalendarEvent', 'CalendarConnection', 'FarmProject', 'FarmTask', 'DailyActivity']);
    const refreshTimer = window.setInterval(() => { if (document.visibilityState === 'visible') load({ quiet: true }); }, 60_000);
    const refresh = () => load({ quiet: true });
    window.addEventListener('focus', refresh);
    return () => { clearTimeout(timer); clearInterval(refreshTimer); unsubscribe(); window.removeEventListener('focus', refresh); };
  }, [load]);

  const eventDateFromLink = events.find((event) => String(event.id) === requestedEvent)?.start_at;
  useEffect(() => {
    if (!eventDateFromLink) return;
    setSelectedDate(dateKey(eventDateFromLink));
    const date = new Date(eventDateFromLink);
    setViewDate(new Date(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }, [eventDateFromLink, locationKey, requestedEvent]);
  const connected = connections.find((item) => item.status === 'connected') || connections[0];

  const startCreate = (day = selectedDate, defaults = {}) => {
    setEditing(null);
    setForm({ ...blankForm(day), ...defaults });
    setShowEditor(true);
  };

  const startEdit = (event) => {
    if (event.source_entity) {
      setSearchParams({ event: event.id });
      setSelectedDate(dateKey(event.start_at));
      return;
    }
    setEditing(event);
    setForm({
      ...blankForm(dateKey(event.start_at)), ...event,
      date: dateKey(event.start_at),
      start_time: String(event.start_at || '').slice(11, 16) || '08:00',
      end_time: String(event.end_at || '').slice(11, 16) || '09:00',
    });
    setSearchParams({ event: event.id });
    setShowEditor(true);
  };

  const syncRelatedRecords = async (event) => {
    const [tasks, activities] = await Promise.all([
      base44.entities.FarmTask.filter({ calendar_event_id: event.id }, '-created_date', 1),
      base44.entities.DailyActivity.filter({ calendar_event_id: event.id }, '-created_date', 1),
    ]);
    const taskPayload = eventToTaskPayload(event);
    const activityPayload = eventToDailyActivityPayload(event);
    await Promise.all([
      tasks[0] ? base44.entities.FarmTask.update(tasks[0].id, taskPayload) : base44.entities.FarmTask.create(taskPayload),
      activities[0] ? base44.entities.DailyActivity.update(activities[0].id, activityPayload) : base44.entities.DailyActivity.create(activityPayload),
    ]);
  };

  const submitEvent = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title.trim(), description: form.description.trim(), category: form.category,
      farm_id: form.farm_id, farm_name: form.farm_name, assigned_to_name: form.assigned_to_name.trim(),
      block_id: form.block_id, block_name: form.block_name, block_code: form.block_code, shared_scope: form.shared_scope,
      priority: form.priority, status: form.status, progress_percent: Number(form.progress_percent || 0),
      start_at: eventDate(form.date, form.start_time, form.all_day),
      end_at: eventDate(form.date, form.end_time, form.all_day, true), all_day: Boolean(form.all_day),
      reminders_enabled: Boolean(form.reminders_enabled), reminder_minutes: Number(form.reminder_minutes || 0),
      reminder_sent_at: '', reminder_sent_for_start: '', notes: form.notes.trim(), timezone: 'Africa/Accra',
      source: 'Production Calendar', external_sync_status: connected ? 'ready' : 'not_connected',
    };
    try {
      let saved;
      if (editing) {
        saved = await base44.entities.CalendarEvent.update(editing.id, { ...payload, task_code: editing.task_code });
        await syncRelatedRecords(saved);
      } else {
        saved = await base44.entities.CalendarEvent.create({ ...payload, task_code: createCode() });
        await syncRelatedRecords(saved);
      }
      if (saved.harvest_period_id) {
        await base44.farms.updateHarvestPeriod(saved.harvest_period_id, { status: harvestStatusFromCalendar(saved.status) });
      }
      setEvents((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setSelectedDate(dateKey(saved.start_at));
      setShowEditor(false);
      setSearchParams({ event: saved.id });
      toast({ title: editing ? 'Activity updated everywhere' : 'Activity scheduled', description: 'Calendar, Daily Routine, Daily Activities, and reminders are synchronized.' });
    } catch (error) {
      toast({ title: 'Activity could not be saved', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const quickStatus = async (event, status) => {
    const progress = status === 'completed' ? 100 : Number(event.progress_percent || 0);
    try {
      if (event.source_entity) {
        await base44.entities[event.source_entity].update(event.source_id, {
          status: event.source_entity === 'DailyActivity' ? status === 'completed' ? 'Completed' : status === 'in_progress' ? 'In Progress' : status : calendarStatusToTask(status),
          progress_percent: progress,
        });
        await load({ quiet: true });
        toast({ title: `${event.title}: ${STATUS_LABELS[status]}` });
        return;
      }
      const updated = await base44.entities.CalendarEvent.update(event.id, { status, progress_percent: progress });
      await syncRelatedRecords(updated);
      if (updated.harvest_period_id) {
        const today = new Date().toISOString().slice(0, 10);
        const harvestStatus = harvestStatusFromCalendar(status);
        await base44.farms.updateHarvestPeriod(updated.harvest_period_id, {
          status: harvestStatus,
          ...(harvestStatus === 'active' ? { actual_start_date: today } : {}),
          ...(harvestStatus === 'completed' ? { actual_end_date: today } : {}),
        });
      }
      setEvents((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast({ title: `${updated.title}: ${STATUS_LABELS[status]}` });
    } catch (error) {
      toast({ title: 'Status update failed', description: error.message, variant: 'destructive' });
    }
  };

  const saveConnection = async (connectionForm) => {
    setSaving(true);
    try {
      const payload = {
        ...connectionForm, provider: connectionForm.provider, status: 'connected', sync_mode: 'subscription',
        calendar_name: connectionForm.calendar_name || 'JBA GreenGold Production',
        feed_token: connected?.feed_token || crypto.randomUUID().replaceAll('-', ''),
        last_sync_at: new Date().toISOString(), timezone: 'Africa/Accra',
      };
      const record = connected
        ? await base44.entities.CalendarConnection.update(connected.id, payload)
        : await base44.entities.CalendarConnection.create(payload);
      setConnections([record]);
      setShowConnections(false);
      toast({ title: 'Farm schedule subscription configured', description: 'Use the subscription address in Google Calendar, Outlook, or another business calendar.' });
    } catch (error) {
      toast({ title: 'Calendar link could not be saved', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <CompanyCalendarWorkspace
        events={events} farms={farms} loading={loading} viewDate={viewDate} setViewDate={setViewDate}
        selectedDate={selectedDate} setSelectedDate={setSelectedDate} requestedEvent={requestedEvent}
        onCreate={startCreate} onEdit={startEdit} onStatus={quickStatus}
        onExport={() => downloadICalendar(events, connected?.calendar_name)}
        onSubscription={() => setShowConnections(true)}
      />

      <AnimatePresence>
        {showEditor && <EventEditor event={editing} form={form} setForm={setForm} farms={farms} blocks={blocks} saving={saving} onClose={() => { setShowEditor(false); setSearchParams(current => { const next = new URLSearchParams(current); next.delete('event'); return next; }); }} onSubmit={submitEvent} />}
        {showConnections && <ConnectionEditor connection={connected} events={events} saving={saving} onClose={() => setShowConnections(false)} onSave={saveConnection} />}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, children, className }) { return <label className={cn('block', className)}><span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>; }
const inputClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15';

function EventEditor({ event, form, setForm, farms, blocks, saving, onClose, onSubmit }) {
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <Modal title={event ? 'Edit scheduled activity' : 'Schedule production activity'} copy="Updates synchronize with Daily Routine and Farm Daily Activities." onClose={onClose}>
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Activity title"><input className={inputClass} required autoFocus value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Inspect irrigation lines" /></Field>
      <Field label="Description"><textarea className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What needs to be completed?" /></Field>
      <div className="grid gap-3 sm:grid-cols-3"><Field label="Date"><input className={inputClass} type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} /></Field><Field label="Start"><input className={inputClass} type="time" disabled={form.all_day} value={form.start_time} onChange={(e) => set('start_time', e.target.value)} /></Field><Field label="End"><input className={inputClass} type="time" disabled={form.all_day} value={form.end_time} onChange={(e) => set('end_time', e.target.value)} /></Field></div>
      <label className="flex items-center gap-2 text-label"><input type="checkbox" checked={form.all_day} onChange={(e) => set('all_day', e.target.checked)} />All-day activity</label>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Category"><select className={inputClass} value={form.category} onChange={(e) => set('category', e.target.value)}>{CALENDAR_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Priority"><select className={inputClass} value={form.priority} onChange={(e) => set('priority', e.target.value)}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></Field></div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Farm / block"><select className={inputClass} value={form.block_id ? `block:${form.block_id}` : scopeLabel(form.farm_name) === 'Farm A&B' ? 'all' : form.farm_id ? `farm:${form.farm_id}` : ''} onChange={(e) => { const value = e.target.value; const scope = resolveOperationalScope({ block_id: value === 'all' ? '__all__' : value.startsWith('block:') ? value.slice(6) : value }, farms, blocks); setForm((current) => ({ ...current, ...scope })); }}><option value="">Company-wide / no farm</option>{farmScopeOptions(farms, blocks).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field label="Assigned to"><input className={inputClass} value={form.assigned_to_name} onChange={(e) => set('assigned_to_name', e.target.value)} placeholder="Person or team" /></Field></div>
      {event && <div className="grid gap-3 sm:grid-cols-2"><Field label="Status"><select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)}>{CALENDAR_STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select></Field><Field label={`Progress · ${form.progress_percent}%`}><input className="mt-3 w-full accent-orange-600" type="range" min="0" max="100" step="5" value={form.progress_percent} onChange={(e) => set('progress_percent', Number(e.target.value))} /></Field></div>}
      <div className="rounded-lg border border-border bg-muted/30 p-3"><label className="flex items-center gap-2 text-label"><input type="checkbox" checked={form.reminders_enabled} onChange={(e) => set('reminders_enabled', e.target.checked)} /><Bell className="h-4 w-4 text-primary" />Send task reminder</label>{form.reminders_enabled && <select className={`${inputClass} mt-3`} value={form.reminder_minutes} onChange={(e) => set('reminder_minutes', Number(e.target.value))}>{REMINDERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>}</div>
      <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CalendarCheck2 className="mr-2 h-4 w-4" />}{event ? 'Save changes' : 'Schedule activity'}</Button></div>
    </form>
  </Modal>;
}

function ConnectionEditor({ connection, events, saving, onClose, onSave }) {
  const [form, setForm] = useState({ provider: connection?.provider || 'google', account_email: connection?.account_email || '', calendar_name: connection?.calendar_name || 'JBA GreenGold Production' });
  const url = feedUrl(connection);
  return <Modal title="Farm schedule subscription" copy="Publish one live production schedule to Google Calendar, Outlook, or another business calendar." onClose={onClose}>
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">{[['google', 'Google'], ['outlook', 'Outlook'], ['business', 'Business']].map(([value, label]) => <button key={value} type="button" onClick={() => setForm((current) => ({ ...current, provider: value }))} className={cn('rounded-lg border px-3 py-3 text-sm font-semibold', form.provider === value ? 'border-primary bg-primary/5 text-primary' : 'border-border')}>{label}</button>)}</div>
      <Field label="Subscription name"><input className={inputClass} value={form.calendar_name} onChange={(e) => setForm((current) => ({ ...current, calendar_name: e.target.value }))} /></Field>
      <Field label="Calendar account email"><input className={inputClass} type="email" value={form.account_email} onChange={(e) => setForm((current) => ({ ...current, account_email: e.target.value }))} placeholder="operations@company.com" /></Field>
      {url && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs font-bold text-emerald-800">Live subscription address</p><p className="mt-2 break-all text-xs text-emerald-900">{url}</p><p className="mt-2 text-xs text-emerald-800">Add this URL using “From URL” in Google Calendar or “Subscribe from web” in Outlook.</p></div>}
      {import.meta.env.VITE_DEMO_MODE === 'true' && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Preview mode saves the connection and supports .ics export. The live subscription URL becomes available when the API is deployed.</div>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" type="button" onClick={() => downloadICalendar(events, form.calendar_name)}><Download className="mr-2 h-4 w-4" />Download current calendar</Button>{events[0] && <><Button variant="outline" asChild><a href={googleCalendarUrl(events[0])} target="_blank" rel="noreferrer">Test Google <ExternalLink className="ml-2 h-4 w-4" /></a></Button><Button variant="outline" asChild><a href={outlookCalendarUrl(events[0])} target="_blank" rel="noreferrer">Test Outlook <ExternalLink className="ml-2 h-4 w-4" /></a></Button></>}</div>
      <div className="flex justify-end gap-2 border-t border-border pt-4"><Button variant="outline" onClick={onClose}>Close</Button><Button disabled={saving || !form.account_email} onClick={() => onSave(form)}><Settings2 className="mr-2 h-4 w-4" />{connection ? 'Update link' : 'Create link'}</Button></div>
    </div>
  </Modal>;
}

function Modal({ title, copy, onClose, children }) {
  return <motion.div key={title} className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <motion.section role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card shadow-2xl" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.18 }}>
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-card px-5 py-4"><div><h2 className="text-section-title">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{copy}</p></div><Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}><X className="h-4 w-4" /></Button></div><div className="p-5">{children}</div>
    </motion.section>
  </motion.div>;
}
