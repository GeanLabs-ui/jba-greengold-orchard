import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Bell, CalendarCheck2, Check, ChevronLeft, ChevronRight, CircleAlert, Clock3,
  Cloud, Download, ExternalLink, Link2, ListChecks, Plus, RefreshCw, Settings2, X,
} from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  CALENDAR_CATEGORIES, CALENDAR_STATUSES, dateKey, downloadICalendar,
  eventToDailyActivityPayload, eventToTaskPayload, googleCalendarUrl,
  isReminderDue, outlookCalendarUrl,
} from '@/lib/production-calendar';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_LABELS = {
  scheduled: 'Scheduled', in_progress: 'In progress', completed: 'Completed', blocked: 'Blocked', cancelled: 'Cancelled',
};
const STATUS_STYLES = {
  scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  in_progress: 'border-amber-200 bg-amber-50 text-amber-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  blocked: 'border-red-200 bg-red-50 text-red-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
};
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
  category: 'Farm Operations', farm_id: '', farm_name: '', assigned_to_name: '', priority: 'Medium',
  status: 'scheduled', progress_percent: 0, reminders_enabled: true, reminder_minutes: 30, notes: '',
});
const createCode = () => `CAL-${Date.now().toString(36).toUpperCase()}`;
const eventDate = (day, time, allDay, end = false) => {
  if (!allDay) return `${day}T${time}:00.000Z`;
  const value = new Date(`${day}T00:00:00.000Z`);
  if (end) value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString();
};
const formatTime = (event) => event.all_day
  ? 'All day'
  : new Date(event.start_at).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Accra' });
const formatLongDate = (value) => new Date(`${dateKey(value)}T12:00:00Z`).toLocaleDateString('en-GH', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Accra',
});
const feedUrl = (connection) => {
  if (!connection?.feed_token || import.meta.env.VITE_DEMO_MODE === 'true') return '';
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
  const path = `${apiBase}/calendar/feed/${connection.feed_token}`;
  return new URL(path, window.location.origin).toString();
};

export default function ProductionCalendar() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const reminderBusy = useRef(false);
  const now = new Date();
  const [viewDate, setViewDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [events, setEvents] = useState([]);
  const [farms, setFarms] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => blankForm());

  const processReminders = useCallback(async (items) => {
    if (reminderBusy.current) return;
    const due = items.filter((event) => isReminderDue(event));
    if (!due.length) return;
    reminderBusy.current = true;
    try {
      await Promise.all(due.map(async (event) => {
        await base44.entities.Notification.create({
          title: 'Production activity reminder',
          message: `${event.title} is ${Number(event.reminder_minutes || 0) ? `due in ${event.reminder_minutes} minutes` : 'due now'}.`,
          type: 'calendar_activity', notification_type: 'calendar_activity', channel: 'Admin', status: 'new',
          calendar_event_id: event.id, record_id: event.id, entity_name: 'CalendarEvent',
          destination: `/admin/calendar?event=${event.id}`,
          reminder_key: `${event.id}:${event.start_at}`,
        });
        await base44.entities.CalendarEvent.update(event.id, {
          reminder_sent_at: new Date().toISOString(), reminder_sent_for_start: event.start_at,
        });
      }));
    } finally {
      reminderBusy.current = false;
    }
  }, []);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [calendarEvents, farmRecords, connectionRecords] = await Promise.all([
        base44.entities.CalendarEvent.list('start_at', 250).catch(() => []),
        base44.entities.Farm.list('name', 250).catch(() => []),
        base44.entities.CalendarConnection.list('-created_date', 20).catch(() => []),
      ]);
      setEvents(calendarEvents || []);
      setFarms(farmRecords || []);
      setConnections(connectionRecords || []);
      processReminders(calendarEvents || []).catch(() => {});
      const requested = searchParams.get('event');
      if (requested) {
        const match = calendarEvents.find((item) => item.id === requested);
        if (match) {
          setSelectedDate(dateKey(match.start_at));
          const parsed = new Date(match.start_at);
          setViewDate(new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1));
        }
      }
    } catch (error) {
      toast({ title: 'Calendar could not be loaded', description: error.message, variant: 'destructive' });
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [processReminders, searchParams, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let timer;
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = window.setTimeout(() => load({ quiet: true }), 150);
    }, ['CalendarEvent', 'CalendarConnection']);
    const reminderTimer = window.setInterval(() => processReminders(events).catch(() => {}), 60_000);
    return () => { clearTimeout(timer); clearInterval(reminderTimer); unsubscribe(); };
  }, [events, load, processReminders]);

  const byDate = useMemo(() => events.reduce((map, event) => {
    const key = dateKey(event.start_at);
    if (!map[key]) map[key] = [];
    map[key].push(event);
    return map;
  }, {}), [events]);

  const calendarDays = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const value = new Date(gridStart);
      value.setDate(gridStart.getDate() + index);
      return value;
    });
  }, [viewDate]);

  const selectedEvents = useMemo(() => (byDate[selectedDate] || []).sort((a, b) => String(a.start_at).localeCompare(String(b.start_at))), [byDate, selectedDate]);
  const upcoming = useMemo(() => events.filter((event) => dateKey(event.start_at) >= todayKey() && !['completed', 'cancelled'].includes(event.status)).sort((a, b) => String(a.start_at).localeCompare(String(b.start_at))), [events]);
  const overdue = events.filter((event) => new Date(event.end_at || event.start_at) < new Date() && !['completed', 'cancelled'].includes(event.status));
  const connected = connections.find((item) => item.status === 'connected') || connections[0];

  const startCreate = (day = selectedDate) => {
    setEditing(null);
    setForm(blankForm(day));
    setShowEditor(true);
  };

  const startEdit = (event) => {
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
        await base44.entities.Notification.create({
          title: 'Production activity scheduled',
          message: `${saved.title} has been added for ${formatLongDate(saved.start_at)}.`,
          type: 'calendar_activity', notification_type: 'calendar_activity', channel: 'Admin', status: 'new',
          calendar_event_id: saved.id, record_id: saved.id, entity_name: 'CalendarEvent',
          destination: `/admin/calendar?event=${saved.id}`,
        });
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
      const updated = await base44.entities.CalendarEvent.update(event.id, { status, progress_percent: progress });
      await syncRelatedRecords(updated);
      setEvents((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (['completed', 'blocked'].includes(status)) {
        await base44.entities.Notification.create({
          title: status === 'completed' ? 'Scheduled activity completed' : 'Scheduled activity blocked',
          message: updated.title, type: 'calendar_activity', notification_type: 'calendar_activity', channel: 'Admin', status: 'new',
          calendar_event_id: updated.id, destination: `/admin/calendar?event=${updated.id}`,
        });
      }
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
      toast({ title: 'Company calendar link configured', description: 'Use the subscription address in Google Calendar, Outlook, or another business calendar.' });
    } catch (error) {
      toast({ title: 'Calendar link could not be saved', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Production Calendar" description="Schedule farm work, track completion, and keep Daily Routine, reminders, and company calendars aligned.">
        <Button variant="outline" size="sm" onClick={() => downloadICalendar(events, connected?.calendar_name)}><Download className="mr-2 h-4 w-4" />Export .ics</Button>
        <Button variant="outline" size="sm" onClick={() => setShowConnections(true)}><Link2 className="mr-2 h-4 w-4" />Calendar link</Button>
        <Button size="sm" onClick={() => startCreate()}><Plus className="mr-2 h-4 w-4" />Schedule activity</Button>
      </PageHeader>

      <div className="mb-5 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="This month" value={events.filter((item) => dateKey(item.start_at).slice(0, 7) === `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`).length} icon={CalendarCheck2} />
        <Summary label="Upcoming" value={upcoming.length} icon={Clock3} />
        <Summary label="Completed" value={events.filter((item) => item.status === 'completed').length} icon={Check} />
        <Summary label="Needs attention" value={overdue.length + events.filter((item) => item.status === 'blocked').length} icon={CircleAlert} alert />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <h2 className="min-w-44 text-center font-heading text-lg font-bold">{viewDate.toLocaleDateString('en-GH', { month: 'long', year: 'numeric' })}</h2>
              <Button variant="outline" size="icon" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { const current = new Date(); setViewDate(new Date(current.getFullYear(), current.getMonth(), 1)); setSelectedDate(todayKey()); }}>Today</Button>
              <Button variant="ghost" size="icon" onClick={() => load()} disabled={loading}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-border bg-muted/40">
            {WEEKDAYS.map((day) => <div key={day} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{day}</div>)}
          </div>
          <motion.div layout className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const key = day.toISOString().slice(0, 10);
              const dayEvents = byDate[key] || [];
              const inMonth = day.getMonth() === viewDate.getMonth();
              const selected = selectedDate === key;
              return (
                <button key={key} type="button" onClick={() => setSelectedDate(key)} onDoubleClick={() => startCreate(key)} className={cn(
                  'min-h-28 border-b border-r border-border p-2 text-left transition-colors hover:bg-primary/[0.03] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary',
                  !inMonth && 'bg-muted/20 text-muted-foreground', selected && 'bg-primary/[0.06]',
                )}>
                  <span className={cn('grid h-7 w-7 place-items-center rounded-full text-xs font-semibold', key === todayKey() && 'bg-primary text-primary-foreground')}>{day.getDate()}</span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((item) => <span key={item.id} className={cn('block truncate rounded border px-1.5 py-1 text-[10px] font-semibold', STATUS_STYLES[item.status] || STATUS_STYLES.scheduled)}>{formatTime(item)} · {item.title}</span>)}
                    {dayEvents.length > 3 && <span className="block px-1 text-[10px] font-medium text-muted-foreground">+{dayEvents.length - 3} more</span>}
                  </div>
                </button>
              );
            })}
          </motion.div>
        </section>

        <aside className="self-start rounded-xl border border-border bg-card shadow-sm xl:sticky xl:top-20">
          <div className="flex items-start justify-between border-b border-border p-4">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Selected day</p><h2 className="mt-1 font-heading font-bold">{formatLongDate(selectedDate)}</h2></div>
            <Button size="icon" variant="ghost" onClick={() => startCreate(selectedDate)}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="max-h-[620px] overflow-y-auto p-3">
            {selectedEvents.length ? selectedEvents.map((event) => (
              <div key={event.id} role="button" tabIndex={0} onClick={() => startEdit(event)} onKeyDown={(keyEvent) => ['Enter', ' '].includes(keyEvent.key) && startEdit(event)} className="mb-2 block w-full cursor-pointer rounded-lg border border-border p-3 text-left transition hover:border-primary/40 hover:bg-muted/40">
                <div className="flex items-start justify-between gap-3"><span className="text-sm font-semibold leading-5">{event.title}</span><span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold', STATUS_STYLES[event.status])}>{STATUS_LABELS[event.status]}</span></div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{formatTime(event)}{event.assigned_to_name ? ` · ${event.assigned_to_name}` : ''}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Number(event.progress_percent || 0))}%` }} /></div>
                <div className="mt-2 flex gap-1" onClick={(click) => click.stopPropagation()}>
                  {event.status !== 'in_progress' && !['completed', 'cancelled'].includes(event.status) && <TinyAction onClick={() => quickStatus(event, 'in_progress')}>Start</TinyAction>}
                  {event.status !== 'completed' && event.status !== 'cancelled' && <TinyAction onClick={() => quickStatus(event, 'completed')}>Complete</TinyAction>}
                  <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Add to Google Calendar"><ExternalLink className="h-3.5 w-3.5" /></a>
                </div>
              </div>
            )) : <div className="py-12 text-center"><ListChecks className="mx-auto h-8 w-8 text-muted-foreground/50" /><p className="mt-3 text-sm text-muted-foreground">No activity scheduled.</p><Button className="mt-4" size="sm" onClick={() => startCreate(selectedDate)}>Add activity</Button></div>}
          </div>
          <div className="border-t border-border p-4">
            <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-muted-foreground"><Cloud className="h-3.5 w-3.5" />Company calendar</span><span className={cn('font-semibold', connected ? 'text-emerald-700' : 'text-amber-700')}>{connected ? 'Linked' : 'Not linked'}</span></div>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {showEditor && <EventEditor event={editing} form={form} setForm={setForm} farms={farms} saving={saving} onClose={() => { setShowEditor(false); setSearchParams({}); }} onSubmit={submitEvent} />}
        {showConnections && <ConnectionEditor connection={connected} events={events} saving={saving} onClose={() => setShowConnections(false)} onSave={saveConnection} />}
      </AnimatePresence>
    </div>
  );
}

function Summary({ label, value, icon: Icon, alert }) {
  return <div className="flex items-center justify-between bg-card px-4 py-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div><Icon className={cn('h-5 w-5 text-primary', alert && value > 0 && 'text-red-600')} /></div>;
}
function TinyAction({ children, onClick }) { return <button type="button" onClick={onClick} className="rounded-md bg-muted px-2 py-1 text-[10px] font-semibold hover:bg-primary/10 hover:text-primary">{children}</button>; }
function Field({ label, children, className }) { return <label className={cn('block', className)}><span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>; }
const inputClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15';

function EventEditor({ event, form, setForm, farms, saving, onClose, onSubmit }) {
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <Modal title={event ? 'Edit scheduled activity' : 'Schedule production activity'} copy="Updates synchronize with Daily Routine and Farm Daily Activities." onClose={onClose}>
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Activity title"><input className={inputClass} required autoFocus value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Inspect irrigation lines" /></Field>
      <Field label="Description"><textarea className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What needs to be completed?" /></Field>
      <div className="grid gap-3 sm:grid-cols-3"><Field label="Date"><input className={inputClass} type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} /></Field><Field label="Start"><input className={inputClass} type="time" disabled={form.all_day} value={form.start_time} onChange={(e) => set('start_time', e.target.value)} /></Field><Field label="End"><input className={inputClass} type="time" disabled={form.all_day} value={form.end_time} onChange={(e) => set('end_time', e.target.value)} /></Field></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.all_day} onChange={(e) => set('all_day', e.target.checked)} />All-day activity</label>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Category"><select className={inputClass} value={form.category} onChange={(e) => set('category', e.target.value)}>{CALENDAR_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Priority"><select className={inputClass} value={form.priority} onChange={(e) => set('priority', e.target.value)}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></Field></div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Farm / site"><select className={inputClass} value={form.farm_id} onChange={(e) => { const farm = farms.find((item) => item.id === e.target.value); setForm((current) => ({ ...current, farm_id: e.target.value, farm_name: farm?.name || '' })); }}><option value="">Company-wide / no farm</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></Field><Field label="Assigned to"><input className={inputClass} value={form.assigned_to_name} onChange={(e) => set('assigned_to_name', e.target.value)} placeholder="Person or team" /></Field></div>
      {event && <div className="grid gap-3 sm:grid-cols-2"><Field label="Status"><select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)}>{CALENDAR_STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select></Field><Field label={`Progress · ${form.progress_percent}%`}><input className="mt-3 w-full accent-orange-600" type="range" min="0" max="100" step="5" value={form.progress_percent} onChange={(e) => set('progress_percent', Number(e.target.value))} /></Field></div>}
      <div className="rounded-lg border border-border bg-muted/30 p-3"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.reminders_enabled} onChange={(e) => set('reminders_enabled', e.target.checked)} /><Bell className="h-4 w-4 text-primary" />Send task reminder</label>{form.reminders_enabled && <select className={`${inputClass} mt-3`} value={form.reminder_minutes} onChange={(e) => set('reminder_minutes', Number(e.target.value))}>{REMINDERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>}</div>
      <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CalendarCheck2 className="mr-2 h-4 w-4" />}{event ? 'Save changes' : 'Schedule activity'}</Button></div>
    </form>
  </Modal>;
}

function ConnectionEditor({ connection, events, saving, onClose, onSave }) {
  const [form, setForm] = useState({ provider: connection?.provider || 'google', account_email: connection?.account_email || '', calendar_name: connection?.calendar_name || 'JBA GreenGold Production' });
  const url = feedUrl(connection);
  return <Modal title="Link company calendar" copy="Publish one live production schedule to Google Calendar, Outlook, or another business calendar." onClose={onClose}>
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">{[['google', 'Google'], ['outlook', 'Outlook'], ['business', 'Business']].map(([value, label]) => <button key={value} type="button" onClick={() => setForm((current) => ({ ...current, provider: value }))} className={cn('rounded-lg border px-3 py-3 text-sm font-semibold', form.provider === value ? 'border-primary bg-primary/5 text-primary' : 'border-border')}>{label}</button>)}</div>
      <Field label="Company calendar name"><input className={inputClass} value={form.calendar_name} onChange={(e) => setForm((current) => ({ ...current, calendar_name: e.target.value }))} /></Field>
      <Field label="Company calendar email"><input className={inputClass} type="email" value={form.account_email} onChange={(e) => setForm((current) => ({ ...current, account_email: e.target.value }))} placeholder="operations@company.com" /></Field>
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
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-card px-5 py-4"><div><h2 className="font-heading text-lg font-bold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{copy}</p></div><Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button></div><div className="p-5">{children}</div>
    </motion.section>
  </motion.div>;
}
