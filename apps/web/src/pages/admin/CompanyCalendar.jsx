import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const address = 'info@jbagreengold.com';
const dayKey = (date) => date.toISOString().slice(0, 10);
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dateLabel = new Intl.DateTimeFormat('en-GH', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Accra',
});
const timeLabel = new Intl.DateTimeFormat('en-GH', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Accra',
});
const sender = (message) => message.from?.emailAddress?.name || message.from?.emailAddress?.address || 'Unknown sender';

function requestStatus(resource) {
  if (resource.error) return <p role="alert" className="text-sm text-destructive">{resource.error}</p>;
  if (resource.loading) return <p role="status" className="text-sm text-muted-foreground">Loading from Microsoft 365…</p>;
  return null;
}

function useMicrosoftData(load, key, refresh) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!key || !load) return;
    const controller = new AbortController();
    load(key, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ key, refresh, data }); },
      (error) => { if (!controller.signal.aborted) setResult({ key, refresh, error: error.message }); },
    );
    return () => controller.abort();
  }, [load, key, refresh]);
  if (result?.key === key && (result.data || result.refresh === refresh)) return result;
  return { loading: Boolean(key && load) };
}

function CompanyEvents({ refresh }) {
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [month, setMonth] = useState(() => selected.slice(0, 7));
  const result = useMicrosoftData(base44.companyCalendar?.events, month, refresh);
  const first = new Date(month + '-01T00:00:00Z');
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const eventsFor = (day) => (result.data || []).filter((event) => {
    const start = event.start?.dateTime?.slice(0, 10);
    const end = event.end?.dateTime;
    return !event.isCancelled && start && start <= day && (day === start || new Date(end + 'Z') > new Date(day + 'T00:00:00Z'));
  });
  const selectedEvents = eventsFor(selected).sort((a, b) => a.start.dateTime.localeCompare(b.start.dateTime));
  const changeMonth = (offset) => {
    first.setUTCMonth(first.getUTCMonth() + offset);
    setMonth(dayKey(first).slice(0, 7));
    setSelected(dayKey(first));
  };
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b p-3">
          <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft /></Button>
          <h2 className="font-semibold">{first.toLocaleDateString('en-GH', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</h2>
          <Button variant="outline" size="icon" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight /></Button>
        </div>
        <div className="grid grid-cols-7">
          {weekdays.map((day) => <span key={day} className="bg-muted/30 py-2 text-center text-xs font-medium">{day}</span>)}
          {Array.from({ length: first.getUTCDay() }, (_, index) => <div key={'blank-' + index} className="border-b border-r bg-muted/20" />)}
          {Array.from({ length: days }, (_, index) => {
            const day = index + 1;
            const key = month + '-' + String(day).padStart(2, '0');
            const events = eventsFor(key);
            return (
              <button type="button" key={key} aria-pressed={selected === key} aria-label={key + ', ' + events.length + ' events'}
                className={cn('min-w-0 border-b border-r p-1 text-left align-top sm:min-h-20 sm:p-2', selected === key && 'bg-primary/10')}
                onClick={() => setSelected(key)}>
                <span className="font-semibold">{day}</span>
                {events.length > 0 && <span className="block text-xs text-primary sm:hidden">{events.length}</span>}
                {events.slice(0, 2).map((event) => <span key={event.id} className="hidden truncate text-xs text-primary sm:block">{event.subject || 'Untitled event'}</span>)}
                {events.length > 2 && <span className="hidden text-xs text-muted-foreground sm:block">+{events.length - 2} more</span>}
              </button>
            );
          })}
        </div>
      </section>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">{new Date(selected + 'T00:00:00Z').toLocaleDateString('en-GH', { dateStyle: 'full', timeZone: 'UTC' })}</h2>
        {requestStatus(result)}
        {result.data && selectedEvents.length === 0 && <p className="text-sm text-muted-foreground">No company events scheduled.</p>}
        <ul className="space-y-2">
          {selectedEvents.map((event) => (
            <li key={event.id} className="rounded-lg border p-3">
              <p className="break-words font-medium">{event.subject || 'Untitled event'}</p>
              <p className="text-sm text-muted-foreground">{event.isAllDay ? 'All day' : timeLabel.format(new Date(event.start.dateTime + 'Z'))}{event.location?.displayName && ' · ' + event.location.displayName}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function loadInbox(key, signal) {
  return base44.companyCalendar.inbox(key === 'first' ? null : key, signal);
}

function CompanyInbox({ refresh }) {
  const [pages, setPages] = useState(['first']);
  const [selected, setSelected] = useState(null);
  const result = useMicrosoftData(loadInbox, pages.at(-1), refresh);
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Inbox</h2>
        {requestStatus(result)}
        {result.data?.messages.length === 0 && <p className="text-sm text-muted-foreground">The company inbox is empty.</p>}
        <ul className="divide-y">
          {result.data?.messages.map((message) => (
            <li key={message.id}>
              <button type="button" aria-pressed={selected === message.id}
                className={cn('w-full rounded-md p-2 text-left', selected === message.id && 'bg-primary/10')}
                onClick={() => setSelected(message.id)}>
                <span className={cn('block truncate', !message.isRead && 'font-bold')}>{message.subject || '(No subject)'}</span>
                <span className="block truncate text-sm text-muted-foreground">{sender(message)}</span>
                <span className="block truncate text-xs text-muted-foreground">{message.bodyPreview}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          {pages.length > 1 && <Button variant="outline" size="sm" onClick={() => setPages(pages.slice(0, -1))}>Previous</Button>}
          {result.data?.next && <Button variant="outline" size="sm" onClick={() => setPages([...pages, result.data.next])}>Next</Button>}
        </div>
      </section>
      <section className="min-w-0 rounded-xl border bg-card p-4">
        {selected ? <Message key={selected} id={selected} refresh={refresh} /> : <p className="text-sm text-muted-foreground">Select a message to read it and reply.</p>}
      </section>
    </div>
  );
}

function Message({ id, refresh }) {
  const result = useMicrosoftData(base44.companyCalendar?.message, id, refresh);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const message = result.data;
  async function reply(event) {
    event.preventDefault();
    if (sending || !draft.trim()) return;
    setSending(true);
    setFeedback(null);
    try {
      await base44.companyCalendar.reply(id, draft);
      setDraft('');
      setFeedback({ text: 'Microsoft 365 accepted your reply.' });
    } catch (error) {
      setFeedback({ text: error.message, error: true });
    } finally {
      setSending(false);
    }
  }
  return (
    <>
      {requestStatus(result)}
      {message && (
        <>
          <h2 className="break-words text-lg font-semibold">{message.subject || '(No subject)'}</h2>
          <p className="break-all text-sm">{sender(message)} · {message.from?.emailAddress?.address}</p>
          <p className="text-xs text-muted-foreground">{dateLabel.format(new Date(message.receivedDateTime))}</p>
          <p className="my-4 whitespace-pre-wrap break-words rounded-lg border p-3">{message.body?.content || '(Empty message)'}</p>
          <form onSubmit={reply} className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="company-reply">Reply as {address}</label>
            <p className="break-all text-sm text-muted-foreground">
              To {message.replyTo?.length ? message.replyTo.map((recipient) => recipient.emailAddress?.address).join(', ') : message.from?.emailAddress?.address}
            </p>
            <textarea id="company-reply" className="min-h-28 w-full rounded-lg border bg-background p-3" value={draft}
              maxLength={10000} disabled={sending} required onChange={(event) => setDraft(event.target.value)} />
            <Button type="submit" disabled={sending || !draft.trim()}>{sending ? 'Sending…' : 'Send reply'}</Button>
          </form>
        </>
      )}
      {feedback && <p className={cn('mt-3 text-sm', feedback.error && 'text-destructive')} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    </>
  );
}

export default function CompanyCalendar({ view }) {
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const reload = () => { if (document.visibilityState === 'visible') setRefresh((value) => value + 1); };
    const timer = window.setInterval(reload, 60_000);
    window.addEventListener('focus', reload);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', reload); };
  }, []);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <a className="break-all text-sm text-primary underline" href={'mailto:' + address}>{address}</a>
        <Button variant="outline" size="sm" onClick={() => setRefresh((value) => value + 1)}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      {view === 'inbox' ? <CompanyInbox refresh={refresh} /> : <CompanyEvents refresh={refresh} />}
    </>
  );
}
