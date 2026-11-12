import { useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Mail, Paperclip, RefreshCw, Send } from 'lucide-react';
import { companyOutlook } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const mailbox = 'info@jbagreengold.com';
const timeZone = 'Africa/Accra';
const dayMs = 86400000;
const dateKey = (date) => date.toISOString().slice(0, 10);
const dateLabel = (date, options) => new Date(date).toLocaleDateString('en-GH', { ...options, timeZone });
const timeLabel = (date) => new Date(date).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit', timeZone });
const outlookTime = (value) => value && /(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : `${value}Z`;
const settings = { retry: false, gcTime: 0 };
const panel = 'rounded-lg border bg-card text-card-foreground';
const address = (person) => person?.emailAddress?.address || '';
const name = (person) => person?.emailAddress?.name || address(person) || 'Unknown sender';

function OutlookLink({ url, children }) {
  if (!URL.canParse(url)) return null;
  const parsed = new URL(url);
  if (!['https://outlook.office.com', 'https://outlook.office365.com', 'https://outlook.cloud.microsoft'].includes(parsed.origin)) return null;
  return <a className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline" href={parsed.href} target="_blank" rel="noopener noreferrer">{children}<ExternalLink className="size-3.5" /></a>;
}

function Status({ query, label }) {
  if (query.isError) return <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{query.error.message}</p>;
  if (query.isPending) return <p role="status" className="text-sm text-muted-foreground">Loading {label}…</p>;
  return null;
}

function Refresh({ query, label }) {
  return <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.refetch()} aria-label={`Refresh ${label}`}><RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} /> Refresh</Button>;
}

function CompanyCalendar({ userId }) {
  const [selected, setSelected] = useState(() => dateKey(new Date()));
  const [month, setMonth] = useState(() => new Date(`${selected.slice(0, 7)}-01T00:00:00Z`));
  const start = Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1);
  const end = Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1);
  const startKey = dateKey(new Date(start));
  const endKey = dateKey(new Date(end));
  const query = useQuery({
    ...settings, queryKey: ['company-outlook', userId, 'calendar', startKey],
    queryFn: ({ signal }) => companyOutlook.events(startKey, endKey, signal), refetchInterval: 60000,
  });
  const today = dateKey(new Date());
  const days = Array.from({ length: (end - start) / dayMs }, (_, index) => dateKey(new Date(start + index * dayMs)));
  const events = (query.data || []).filter((event) => !event.isCancelled && event.start?.dateTime && event.end?.dateTime)
    .map((event) => ({ ...event, startsAt: Date.parse(outlookTime(event.start.dateTime)), endsAt: Date.parse(outlookTime(event.end.dateTime)) }))
    .sort((a, b) => a.startsAt - b.startsAt);
  const eventsByDay = new Map(days.map((day) => {
    const midnight = Date.parse(day);
    const items = events.filter(({ startsAt, endsAt }) => startsAt < midnight + dayMs && (startsAt >= midnight || endsAt > midnight));
    return [day, items];
  }));
  const selectedEvents = eventsByDay.get(selected) || [];

  function changeMonth(offset) {
    const next = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + offset, 1));
    setMonth(next);
    const first = dateKey(next);
    setSelected(first.slice(0, 7) === today.slice(0, 7) ? today : first);
  }

  return (
    <>
      <PageHeader title="Company calendar" description={mailbox}><Refresh query={query} label="calendar" /></PageHeader>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.45fr)]">
        <section className={cn(panel, 'min-w-0 p-3 sm:p-5')} aria-label="Outlook month view">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{dateLabel(month, { month: 'long', year: 'numeric' })}</h2>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft className="size-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => { setMonth(new Date(`${today.slice(0, 7)}-01T00:00:00Z`)); setSelected(today); }}>Today</Button>
              <Button size="icon" variant="ghost" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight className="size-4" /></Button>
            </div>
          </div>
          <Status query={query} label="calendar events" />
          <div className="mt-3 grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => <div key={weekday} className="pb-2 text-center text-xs font-medium text-muted-foreground">{weekday}</div>)}
            {Array.from({ length: month.getUTCDay() }, (_, index) => <div key={`empty-${index}`} />)}
            {days.map((day) => {
              const items = eventsByDay.get(day);
              return (
                <button key={day} type="button" aria-pressed={day === selected} aria-current={day === today ? 'date' : undefined} aria-label={`${dateLabel(day, { dateStyle: 'full' })}, ${items.length} events`} onClick={() => setSelected(day)} className={cn('min-h-11 min-w-0 rounded-md border p-1 text-xs hover:bg-muted sm:min-h-[4.5rem] sm:text-left', day === selected && 'border-primary bg-primary/10')}>
                  <span className={cn('font-semibold', day === today && 'text-primary')}>{Number(day.slice(-2))}</span>
                  {items.length > 0 && <span className="block truncate text-primary sm:hidden">{items.length}</span>}
                  {items.slice(0, 2).map((item) => <span key={item.id} className="mt-1 hidden truncate rounded bg-primary/10 px-1 text-primary sm:block">{item.subject || '(No title)'}</span>)}
                  {items.length > 2 && <span className="hidden text-muted-foreground sm:block">+{items.length - 2} more</span>}
                </button>
              );
            })}
          </div>
        </section>
        <section className={cn(panel, 'min-w-0 p-4')} aria-label="Selected day's events">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><CalendarDays className="size-4 text-primary" />{dateLabel(selected, { dateStyle: 'full' })}</h2>
          {query.isSuccess && !selectedEvents.length && <p className="text-sm text-muted-foreground">No events scheduled.</p>}
          <ul className="divide-y">
            {selectedEvents.map((event) => (
              <li key={event.id} className="space-y-1 py-3 [overflow-wrap:anywhere]">
                <p className="text-xs text-muted-foreground">{event.isAllDay ? 'All day' : `${dateLabel(event.startsAt, { day: 'numeric', month: 'short' })} ${timeLabel(event.startsAt)} – ${dateLabel(event.endsAt, { day: 'numeric', month: 'short' })} ${timeLabel(event.endsAt)} GMT`}</p>
                <h3 className="font-medium">{event.subject || '(No title)'}</h3>
                {event.location?.displayName && <p className="text-sm text-muted-foreground">{event.location.displayName}</p>}
                <OutlookLink url={event.webLink}>Open in Outlook</OutlookLink>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function InboxMessage({ summary, userId, department, email, onBack }) {
  const [draft, setDraft] = useState('');
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);
  const pending = useRef(false);
  const query = useQuery({
    ...settings, queryKey: ['company-outlook', userId, 'message', department, summary.id],
    queryFn: ({ signal }) => companyOutlook.message(summary.id, signal, department),
  });
  const message = query.data || summary;
  const replyTo = (message.replyTo?.length ? message.replyTo : [message.from]).map(address).filter(Boolean).join(', ');

  async function sendReply(event) {
    event.preventDefault();
    if (pending.current || !draft.trim() || !replyTo || !query.isSuccess) return;
    pending.current = true;
    setSending(true);
    setResult(null);
    try {
      await companyOutlook.reply(message.id, draft.trim(), userId, department);
      setDraft('');
      setResult({ text: 'Outlook accepted your reply. You can find it in Sent Items.' });
    } catch (error) {
      setResult({ error: true, text: error.code === 'API_UNAVAILABLE' ? 'The connection was interrupted. Check Outlook Sent Items before trying again.' : error.message });
    } finally {
      pending.current = false;
      setSending(false);
    }
  }

  return (
    <article className={cn(panel, 'min-w-0 p-4 sm:p-5')}>
      <Button size="sm" variant="ghost" className="mb-3 lg:hidden" disabled={sending} onClick={onBack}><ChevronLeft className="size-4" /> Back to inbox</Button>
      <h2 className="break-words text-lg font-semibold">{message.subject || '(No subject)'}</h2>
      <p className="mt-1 break-all text-sm text-muted-foreground">{name(message.from)} {address(message.from) && name(message.from) !== address(message.from) && `<${address(message.from)}>`}</p>
      <p className="mb-3 text-xs text-muted-foreground">{dateLabel(message.receivedDateTime, { dateStyle: 'medium' })} · {timeLabel(message.receivedDateTime)} GMT</p>
      <OutlookLink url={message.webLink}>{message.hasAttachments ? 'Open message and attachments in Outlook' : 'Open in Outlook'}</OutlookLink>
      <div className="my-4 border-y py-4">
        <Status query={query} label="message" />
        {query.isError && <div className="mt-2"><Refresh query={query} label="message" /></div>}
        {query.isSuccess && <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{message.body?.contentType?.toLowerCase() === 'text' ? message.body.content : message.bodyPreview}</p>}
      </div>
      {query.isSuccess && replyTo && (
        <form onSubmit={sendReply} className="space-y-3">
          <div><label htmlFor="company-reply" className="text-sm font-semibold">Reply</label><p className="break-all text-xs text-muted-foreground">From {email} · To {replyTo}</p></div>
          <textarea id="company-reply" className="min-h-32 w-full rounded-md border bg-background p-3 text-sm" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={15000} disabled={sending} required />
          <Button type="submit" size="sm" disabled={sending || !draft.trim()}><Send className="size-4" /> {sending ? 'Sending…' : 'Send reply'}</Button>
          {result && <p role={result.error ? 'alert' : 'status'} className={cn('text-sm', result.error ? 'text-destructive' : 'text-muted-foreground')}>{result.text}</p>}
        </form>
      )}
    </article>
  );
}

function CompanyInbox({ userId, department }) {
  const [selected, setSelected] = useState(null);
  const email = department?.email || mailbox;
  const query = useInfiniteQuery({
    ...settings, queryKey: ['company-outlook', userId, 'inbox', department?.id], initialPageParam: null,
    queryFn: ({ signal, pageParam }) => companyOutlook.inbox(pageParam, signal, department?.id),
    getNextPageParam: (page) => page.cursor || undefined,
    refetchInterval: (current) => (current.state.data?.pages.length || 0) <= 1 ? 60000 : false,
  });
  const messages = Array.from(new Map(query.data?.pages.flatMap((page) => page.messages.map((message) => [message.id, message])) || []).values());
  return (
    <>
      <PageHeader title={department ? `${department.name} inbox` : 'Company inbox'} description={email}><Refresh query={query} label="inbox" /></PageHeader>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(16rem,0.52fr)_minmax(0,1fr)]">
        <section className={cn(panel, selected && 'hidden lg:block')} aria-label="Inbox messages">
          {(query.isPending || query.isError) && <div className="p-4"><Status query={query} label="inbox" /></div>}
          {query.isSuccess && !messages.length && <p className="p-4 text-sm text-muted-foreground">Your Outlook inbox is empty.</p>}
          <ul className="divide-y">
            {messages.map((message) => (
              <li key={message.id}>
                <button type="button" aria-pressed={selected?.id === message.id} onClick={() => setSelected(message)} className={cn('block w-full min-w-0 px-4 py-3 text-left hover:bg-muted', selected?.id === message.id && 'bg-primary/10')}>
                  <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span className="truncate">{name(message.from)}</span><time className="shrink-0" dateTime={message.receivedDateTime}>{dateLabel(message.receivedDateTime, { day: 'numeric', month: 'short' })}</time></span>
                  <span className={cn('flex items-center gap-2 text-sm', !message.isRead && 'font-semibold')}>
                    {!message.isRead && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                    <span className="min-w-0 truncate">{message.subject || '(No subject)'}</span>
                    {message.hasAttachments && <Paperclip className="size-3 shrink-0 text-muted-foreground" aria-label="Has attachments" />}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{message.bodyPreview}</span>
                </button>
              </li>
            ))}
          </ul>
          {query.hasNextPage && <div className="border-t p-3"><Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.fetchNextPage()}>Load older messages</Button></div>}
        </section>
        {selected ? <InboxMessage key={selected.id} summary={selected} userId={userId} email={email} department={department?.id} onBack={() => setSelected(null)} /> : <p className={cn(panel, 'hidden items-center gap-2 p-5 text-sm text-muted-foreground lg:flex')}><Mail className="size-4" /> Select a message to read or reply.</p>}
      </div>
    </>
  );
}

export default function CompanyOutlook({ view, userId, department }) {
  return view === 'calendar' ? <CompanyCalendar userId={userId} /> : <CompanyInbox userId={userId} department={department} />;
}
