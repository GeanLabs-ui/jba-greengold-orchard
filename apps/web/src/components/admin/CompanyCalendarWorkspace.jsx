import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  File,
  Inbox,
  Info,
  Leaf,
  Link2,
  Mail,
  MoreHorizontal,
  Plus,
  Reply,
  Forward,
  Send,
  Star,
  Tag,
  Truck,
  Users,
} from "lucide-react";
import { companyOutlook } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import "./company-calendar-workspace.css";

const key = (date) => date.toISOString().slice(0, 10);
const dateLabel = (date, options) =>
  new Date(date).toLocaleDateString("en-GB", {
    ...options,
    timeZone: "Africa/Accra",
  });
const clock = (date) =>
  new Date(date).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Accra",
  });
const person = (message) =>
  message.from?.emailAddress?.name ||
  message.from?.emailAddress?.address ||
  "Unknown sender";
const stamp = (value) =>
  /(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : `${value}Z`;
const type = (event) =>
  event.outlook || event.category === "Meeting"
    ? "meeting"
    : /deliver|collection|dispatch/i.test(event.category + event.title)
      ? "delivery"
      : "farm";
const eventIcon = (event) =>
  ({ meeting: Users, delivery: Truck, farm: Leaf })[type(event)];
const safeOutlook = (url) => {
  try {
    const parsed = new URL(url);
    return [
      "https://outlook.office.com",
      "https://outlook.office365.com",
      "https://outlook.cloud.microsoft",
    ].includes(parsed.origin)
      ? parsed.href
      : null;
  } catch {
    return null;
  }
};
const sampleEvents = [
  [11, "09:00", "Monitor fruit flies", "Farm Operations"],
  [13, "14:00", "Farm review", "Meeting"],
  [18, "08:00", "Apply approved follow-up treatment", "Farm Operations"],
  [18, "11:00", "Sales meeting", "Meeting"],
  [20, "10:00", "Mango collection", "Delivery"],
  [25, "15:00", "Staff briefing", "Meeting"],
  [30, "09:00", "Evaluate treatment", "Farm Operations"],
].map(([day, time, title, category], i) => ({
  id: `preview-${i}`,
  title,
  category,
  start_at: `2026-11-${day}T${time}:00Z`,
  farm_id: "farm-a",
  farm_name: category === "Meeting" ? "Office" : "Farm A",
  assigned_to_name: category === "Meeting" ? "Sales team" : "IPM / Spray Lead",
  status: "scheduled",
  preview: true,
}));
const sampleMessages = [
  [
    "Buyer enquiry",
    "Mango availability for collection",
    "Sales",
    "09:10",
    "Hello,\n\nPlease confirm Kent mango availability and a collection time for Friday.\n\nThank you.",
  ],
  [
    "Operations team",
    "Farm A activity update",
    "Operations",
    "08:45",
    "The Farm A field activity update is ready for review.",
  ],
  [
    "HR team",
    "Staff briefing schedule",
    "HR",
    "Yesterday",
    "Please review the staff briefing schedule.",
  ],
].map(([sender, subject, department, time, body], i) => ({
  id: `sample-${i}`,
  from: {
    emailAddress: {
      name: sender,
      address: `${department.toLowerCase()}@jbagreengold.com`,
    },
  },
  subject,
  department,
  time,
  bodyPreview: body,
  body: { contentType: "text", content: body },
  preview: true,
  isRead: false,
}));

export default function CompanyCalendarWorkspace({
  events,
  farms,
  loading,
  viewDate,
  setViewDate,
  selectedDate,
  setSelectedDate,
  requestedEvent,
  onCreate,
  onEdit,
  onStatus,
  onExport,
  onSubscription,
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const preview =
    import.meta.env.VITE_DEMO_MODE === "true" ||
    (import.meta.env.DEV && params.get("preview") === "calendar");
  const admin = user?.role === "super_admin";
  const [view, setView] = useState("Month");
  const [farm, setFarm] = useState("");
  const [hidden, setHidden] = useState([]);
  const [unread, setUnread] = useState(false);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [stars, setStars] = useState([]);
  const [checked, setChecked] = useState([]);
  const [previewStatuses, setPreviewStatuses] = useState({});
  const departmentId = params.get("department") || "";
  const departments = useQuery({
    queryKey: ["company-outlook", user?.id, "mailboxes"],
    queryFn: ({ signal }) => companyOutlook.mailboxes(signal),
    enabled: !!user && !preview,
    retry: false,
    gcTime: 0,
  });
  const connection = useQuery({
    queryKey: ["company-outlook", user?.id, "connection"],
    queryFn: ({ signal }) => companyOutlook.connection(signal),
    enabled: admin && !preview,
    retry: false,
    gcTime: 0,
  });
  const department = departments.data?.find((item) => item.id === departmentId);
  const canRead = !preview && !!user && (admin || !!department);
  const start = new Date(
    Date.UTC(viewDate.getFullYear(), viewDate.getMonth(), 1),
  );
  const end = new Date(
    Date.UTC(viewDate.getFullYear(), viewDate.getMonth() + 1, 1),
  );
  const companyEvents = useQuery({
    queryKey: ["company-outlook", user?.id, "calendar", key(start)],
    queryFn: ({ signal }) =>
      companyOutlook.events(key(start), key(end), signal),
    enabled: admin && !preview,
    retry: false,
    gcTime: 0,
    refetchInterval: 60000,
  });
  const inbox = useInfiniteQuery({
    queryKey: ["company-outlook", user?.id, "inbox", departmentId],
    initialPageParam: null,
    queryFn: ({ signal, pageParam }) =>
      companyOutlook.inbox(pageParam, signal, departmentId || undefined),
    enabled: canRead,
    retry: false,
    gcTime: 0,
    getNextPageParam: (page) => page.cursor || undefined,
  });
  const messages = preview
    ? sampleMessages
    : Array.from(
        new Map(
          (inbox.data?.pages || []).flatMap((page) =>
            page.messages.map((message) => [message.id, message]),
          ),
        ).values(),
      );
  const visibleMessages = messages.filter(
    (message) =>
      (!unread || !message.isRead) &&
      (!preview ||
        !departmentId ||
        message.department.toLowerCase() === departmentId),
  );
  const active =
    visibleMessages.find((message) => message.id === selected) ||
    visibleMessages[0];
  const detail = useQuery({
    queryKey: [
      "company-outlook",
      user?.id,
      "message",
      departmentId,
      active?.id,
    ],
    queryFn: ({ signal }) =>
      companyOutlook.message(active.id, signal, departmentId || undefined),
    enabled: canRead && !!active,
    retry: false,
    gcTime: 0,
  });
  const message = detail.data || active;
  useEffect(() => {
    setDraft("");
  }, [active?.id, departmentId, user?.id]);
  useEffect(() => {
    if (requestedEvent)
      document
        .getElementById("cc-agenda-" + requestedEvent)
        ?.scrollIntoView({ block: "nearest" });
  }, [requestedEvent, selectedDate]);
  const mailAddress = department?.email || "info@jbagreengold.com";
  const normalized = (companyEvents.data || [])
    .filter((item) => !item.isCancelled && item.start?.dateTime)
    .map((item) => ({
      ...item,
      id: `outlook-${item.id}`,
      title: item.subject || "(No title)",
      start_at: stamp(item.start.dateTime),
      end_at: stamp(item.end?.dateTime || item.start.dateTime),
      all_day: item.isAllDay,
      category: "Meeting",
      outlook: true,
    }));
  const combined = preview
    ? sampleEvents.map((event) => ({
        ...event,
        status: previewStatuses[event.id] || event.status,
      }))
    : [...events, ...normalized];
  const calendarFilters = [
    { id: "meeting", name: "Company meetings", Icon: CalendarDays },
    ...(preview
      ? [
          { id: "farm-a", name: "Farm A", Icon: Leaf },
          { id: "farm-b", name: "Farm B", Icon: Leaf },
        ]
      : farms.map((item) => ({
          id: String(item.id),
          name: item.name,
          Icon: Leaf,
        }))),
    { id: "delivery", name: "Deliveries", Icon: Truck },
  ];
  const filtered = combined.filter(
    (event) =>
      !hidden.includes(type(event)) &&
      (type(event) !== "farm" || !hidden.includes(String(event.farm_id))) &&
      (!farm || String(event.farm_id) === farm),
  );
  const occursOn = (event, date) =>
    event.start_at?.slice(0, 10) === date ||
    (Date.parse(event.start_at) < Date.parse(date) + 86400000 &&
      Date.parse(event.end_at) > Date.parse(date));
  const agenda = filtered
    .filter((event) => occursOn(event, selectedDate))
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const gridStart = new Date(start);
  gridStart.setUTCDate(1 - start.getUTCDay());
  const count =
    Math.ceil((start.getUTCDay() + (end - start) / 86400000) / 7) * 7;
  const days = Array.from(
    { length: count },
    (_, index) => new Date(gridStart.getTime() + index * 86400000),
  );
  const status = preview
    ? "Microsoft 365 connection required"
    : connection.data?.status === "checked" &&
        connection.data.calendar === "connected" &&
        connection.data.inbox === "connected"
      ? "Microsoft 365 connected"
      : connection.isPending && admin
        ? "Checking Microsoft 365 connection…"
        : "Microsoft 365 connection required";
  const toggle = (setter, current, value) =>
    setter(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  const showEvent = (event) => {
    if (event.preview)
      toast({
        title: event.title,
        description: `${clock(event.start_at)} · ${event.farm_name} · Sample preview`,
      });
    else if (event.outlook) {
      const url = safeOutlook(event.webLink);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } else onEdit(event);
  };
  const openMail = (folder = "inbox") =>
    window.open(
      `https://outlook.office.com/mail/${folder}`,
      "_blank",
      "noopener,noreferrer",
    );
  const changePeriod = (direction) => {
    if (view === "Month") {
      const next = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + direction, 1),
      );
      setViewDate(next);
      setSelectedDate(key(next));
    } else {
      const next = new Date(`${selectedDate}T12:00:00Z`);
      next.setUTCDate(
        next.getUTCDate() + direction * (view === "Week" ? 7 : 1),
      );
      setSelectedDate(key(next));
      setViewDate(
        new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), 1)),
      );
    }
  };
  const chooseDepartment = (id) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (id) next.set("department", id);
      else next.delete("department");
      return next;
    });
    setSelected(null);
    setDraft("");
  };
  async function sendReply(event) {
    event.preventDefault();
    if (sendingRef.current || !draft.trim()) return;
    if (preview) {
      toast({
        title: "Sample preview",
        description: "Connect Microsoft 365 to send email.",
      });
      return;
    }
    if (!detail.isSuccess || !message) return;
    sendingRef.current = true;
    setSending(true);
    try {
      await companyOutlook.reply(
        message.id,
        draft.trim(),
        user.id,
        departmentId || undefined,
      );
      setDraft("");
      toast({ title: "Reply accepted by Outlook" });
    } catch (error) {
      toast({
        title: "Reply not confirmed",
        description:
          error.code === "API_UNAVAILABLE"
            ? "Check Outlook Sent Items before trying again."
            : error.message,
        variant: "destructive",
      });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }
  const previewInboxes = [
    { id: "info", name: "Info", count: 4 },
    { id: "sales", name: "Sales", count: 5 },
    { id: "hr", name: "HR", count: 1 },
    { id: "operations", name: "Operations", count: 2 },
  ];
  const inboxes = preview ? previewInboxes : departments.data || [];
  const empty = (text) => (
    <p className="cc-empty" role="status">
      {text}
    </p>
  );
  return (
    <div className="company-workspace" data-preserve-colors="true">
      <header className="cc-header">
        <div>
          <h1>Company calendar &amp; inbox</h1>
          <p>
            info@jbagreengold.com <span>·</span> Accra (GMT)
          </p>
        </div>
        <div className="cc-actions">
          <button
            onClick={() =>
              window.open(
                `https://outlook.office.com/mail/deeplink/compose?from=${encodeURIComponent(mailAddress)}`,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            <Mail />
            Compose email
          </button>
          <button className="cc-primary" onClick={() => onCreate(selectedDate)}>
            <Plus />
            New event
          </button>
        </div>
      </header>
      <div className="cc-connection">
        <Info />
        <span>
          {status} <span>·</span>{" "}
          <Link to="/admin/settings">
            {status === "Microsoft 365 connected"
              ? "Manage connection"
              : "Connect account"}
          </Link>
        </span>
        <span className="cc-connection-label">
          {preview ? "Sample preview" : "Company workspace"}
        </span>
      </div>
      <div className="cc-layout">
        <aside className="cc-sidebar cc-panel">
          <h2>Calendars</h2>
          <div className="cc-calendar-filters">
            {calendarFilters.map(({ id, name, Icon }) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={!hidden.includes(id)}
                  onChange={() => toggle(setHidden, hidden, id)}
                />
                <Icon />
                <span>{name}</span>
              </label>
            ))}
          </div>
          <div className="cc-sidebar-group">
            <button onClick={onExport}>
              <Download />
              Export .ics
            </button>
            <button onClick={onSubscription}>
              <Link2 />
              Subscription link
            </button>
          </div>
          <h2>Department inboxes</h2>
          <div className="cc-inboxes">
            {admin && (
              <button
                className={!departmentId ? "cc-active" : ""}
                onClick={() => chooseDepartment("")}
              >
                <Inbox />
                <strong>All inboxes</strong>
                <span className="cc-count">
                  {preview ? 12 : messages.length}
                </span>
              </button>
            )}
            {inboxes.map((item) => (
              <button
                key={item.id}
                className={departmentId === item.id ? "cc-active" : ""}
                onClick={() => chooseDepartment(item.id)}
              >
                <Mail />
                <span>{item.name}</span>
                {item.count != null && (
                  <span className="cc-count">{item.count}</span>
                )}
              </button>
            ))}
          </div>
          <div className="cc-folders">
            <p>@jbagreengold.com</p>
            {[
              [Inbox, "Inbox", "inbox"],
              [Send, "Sent", "sentitems"],
              [File, "Drafts", "drafts"],
            ].map(([Icon, label, folder]) => (
              <button
                key={label}
                onClick={() =>
                  folder === "inbox" ? chooseDepartment("") : openMail(folder)
                }
              >
                <Icon />
                {label}
              </button>
            ))}
          </div>
        </aside>
        <div className="cc-middle">
          <section
            className="cc-panel cc-calendar"
            aria-label="Company calendar"
          >
            <div className="cc-toolbar">
              <div className="cc-month-nav">
                <button
                  aria-label="Previous period"
                  onClick={() => changePeriod(-1)}
                >
                  <ChevronLeft />
                </button>
                <h2>{dateLabel(start, { month: "long", year: "numeric" })}</h2>
                <button
                  aria-label="Next period"
                  onClick={() => changePeriod(1)}
                >
                  <ChevronRight />
                </button>
              </div>
              <button
                onClick={() => {
                  const now = new Date();
                  setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDate(key(now));
                }}
              >
                Today
              </button>
              <div className="cc-view-switch">
                {["Month", "Week", "Day"].map((item) => (
                  <button
                    key={item}
                    aria-pressed={view === item}
                    className={view === item ? "cc-primary" : ""}
                    onClick={() => setView(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <select
                aria-label="Filter by farm"
                value={farm}
                onChange={(event) => setFarm(event.target.value)}
              >
                <option value="">All farms</option>
                {calendarFilters
                  .filter((item) => item.Icon === Leaf)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>
            {view === "Month" ? (
              <div className="cc-month-grid">
                <div className="cc-weekdays">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <span key={day}>{day}</span>
                    ),
                  )}
                </div>
                <div
                  className="cc-days"
                  style={{ "--cc-weeks": days.length / 7 }}
                >
                  {days.map((day) => {
                    const date = key(day);
                    const items = filtered.filter((event) =>
                      occursOn(event, date),
                    );
                    return (
                      <div
                        key={date}
                        className={`cc-day ${selectedDate === date ? "cc-selected-day" : ""} ${day.getUTCMonth() !== start.getUTCMonth() ? "cc-other-month" : ""}`}
                      >
                        <button
                          className="cc-date"
                          aria-label={dateLabel(day, { dateStyle: "full" })}
                          aria-pressed={selectedDate === date}
                          onClick={() => setSelectedDate(date)}
                          onDoubleClick={() => onCreate(date)}
                        >
                          <span
                            className={
                              date === key(new Date()) ? "cc-today" : ""
                            }
                          >
                            {day.getUTCMonth() !== start.getUTCMonth()
                              ? dateLabel(day, {
                                  month: "short",
                                  day: "numeric",
                                })
                              : day.getUTCDate()}
                          </span>
                        </button>
                        {items.slice(0, 2).map((event) => {
                          const Icon = eventIcon(event);
                          return (
                            <button
                              key={event.id}
                              className="cc-event"
                              aria-current={
                                requestedEvent === String(event.id)
                                  ? "true"
                                  : undefined
                              }
                              onClick={() => {
                                setSelectedDate(date);
                                showEvent(event);
                              }}
                            >
                              <Icon />
                              <span>
                                <b>
                                  {event.all_day
                                    ? "All day"
                                    : clock(event.start_at)}
                                </b>{" "}
                                {event.preview && event.id === "preview-2"
                                  ? "Follow-up treatment"
                                  : event.title}
                              </span>
                            </button>
                          );
                        })}
                        {items.length > 2 && (
                          <button
                            className="cc-more-events"
                            onClick={() => setSelectedDate(date)}
                          >
                            +{items.length - 2} more
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="cc-period-list">
                {Array.from({ length: view === "Week" ? 7 : 1 }, (_, i) => {
                  const day = new Date(`${selectedDate}T12:00:00Z`);
                  if (view === "Week")
                    day.setUTCDate(day.getUTCDate() - day.getUTCDay() + i);
                  const date = key(day);
                  const items = filtered.filter((event) =>
                    occursOn(event, date),
                  );
                  return (
                    <section key={date}>
                      <button onClick={() => setSelectedDate(date)}>
                        <strong>
                          {dateLabel(day, {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                          })}
                        </strong>
                      </button>
                      {items.length ? (
                        items.map((event) => (
                          <button
                            className="cc-list-event"
                            key={event.id}
                            onClick={() => showEvent(event)}
                          >
                            {clock(event.start_at)} · {event.title}
                          </button>
                        ))
                      ) : (
                        <span>No events scheduled</span>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
            <div className="cc-legend">
              <span>
                <Leaf />= Farm (field activity)
              </span>
              <span>
                <Users />= Meeting (team / review)
              </span>
              <span>
                <Truck />= Delivery (collection / dispatch)
              </span>
            </div>
            {!preview && (loading || companyEvents.isError) && (
              <p className="cc-calendar-status" role="status">
                {loading
                  ? "Loading farm schedule…"
                  : companyEvents.error.message}
              </p>
            )}
          </section>
          <section className="cc-panel cc-mail-list" aria-label="Company inbox">
            <div className="cc-mail-heading">
              <h2>Company inbox</h2>
              <div className="cc-view-switch">
                <button
                  className={!unread ? "cc-primary" : ""}
                  onClick={() => setUnread(false)}
                >
                  All ({preview ? 12 : messages.length})
                </button>
                <button
                  className={unread ? "cc-primary" : ""}
                  onClick={() => setUnread(true)}
                >
                  Unread (
                  {preview
                    ? 12
                    : messages.filter((item) => !item.isRead).length}
                  )
                </button>
              </div>
            </div>
            {visibleMessages.map((item) => (
              <div
                key={item.id}
                className={`cc-mail-row ${message?.id === item.id ? "cc-active" : ""}`}
              >
                <input
                  type="checkbox"
                  aria-label={`Select ${item.subject}`}
                  checked={checked.includes(item.id)}
                  onChange={() => toggle(setChecked, checked, item.id)}
                />
                <button
                  aria-label={`Star ${item.subject}`}
                  aria-pressed={stars.includes(item.id)}
                  onClick={() => toggle(setStars, stars, item.id)}
                >
                  <Star
                    fill={stars.includes(item.id) ? "currentColor" : "none"}
                  />
                </button>
                <button
                  className="cc-mail-summary"
                  onClick={() => {
                    setSelected(item.id);
                    setDraft("");
                  }}
                >
                  <strong>{person(item)}</strong>
                  <span>{item.subject || "(No subject)"}</span>
                  <small>{item.department || department?.name || "Info"}</small>
                  <time>{item.time || clock(item.receivedDateTime)}</time>
                </button>
              </div>
            ))}
            {!visibleMessages.length &&
              empty(
                !canRead && !preview
                  ? "Choose an authorized department inbox to read messages."
                  : inbox.isPending
                    ? "Loading messages…"
                    : inbox.isError
                      ? inbox.error.message
                      : "No messages to display.",
              )}
            {inbox.hasNextPage && (
              <button
                disabled={inbox.isFetching}
                onClick={() => inbox.fetchNextPage()}
              >
                Load older messages
              </button>
            )}
          </section>
        </div>
        <div className="cc-right">
          <section className="cc-panel cc-agenda">
            <h2>
              <CalendarDays />
              {dateLabel(selectedDate, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h2>
            <p>
              {selectedDate === key(new Date())
                ? "Today’s agenda"
                : "Day’s agenda"}
            </p>
            {agenda.length
              ? agenda.map((event) => {
                  const Icon = eventIcon(event);
                  return (
                    <article
                      key={event.id}
                      id={`cc-agenda-${event.id}`}
                      className="cc-agenda-item"
                    >
                      <time>
                        {event.all_day ? "All day" : clock(event.start_at)}
                      </time>
                      <div>
                        <button
                          className="cc-agenda-title"
                          onClick={() => showEvent(event)}
                        >
                          {event.title}
                        </button>
                        <p>
                          <Icon />
                          {event.farm_name || "Office"}
                          {event.assigned_to_name &&
                            ` · ${event.assigned_to_name}`}
                        </p>
                        {requestedEvent === String(event.id) && (
                          <p className="cc-event-description">
                            {event.description ||
                              event.notes ||
                              event.block_name ||
                              event.farm_name}{" "}
                            · Completion: {Number(event.progress_percent || 0)}%
                          </p>
                        )}
                        {!event.outlook &&
                          type(event) !== "meeting" &&
                          !["completed", "cancelled"].includes(
                            event.status,
                          ) && (
                            <div className="cc-quick-actions">
                              {event.status !== "in_progress" && (
                                <button
                                  onClick={() =>
                                    event.preview
                                      ? setPreviewStatuses((current) => ({
                                          ...current,
                                          [event.id]: "in_progress",
                                        }))
                                      : onStatus(event, "in_progress")
                                  }
                                >
                                  Start
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  event.preview
                                    ? setPreviewStatuses((current) => ({
                                        ...current,
                                        [event.id]: "completed",
                                      }))
                                    : onStatus(event, "completed")
                                }
                              >
                                Complete
                              </button>
                            </div>
                          )}
                      </div>
                      {type(event) === "meeting" ? (
                        <button
                          className="cc-status cc-view-event"
                          onClick={() => showEvent(event)}
                        >
                          View event <ExternalLink />
                        </button>
                      ) : (
                        <span className="cc-status">
                          {event.status === "in_progress"
                            ? "In progress"
                            : event.status === "completed"
                              ? "Completed"
                              : event.status === "cancelled"
                                ? "Cancelled"
                                : event.status === "blocked"
                                  ? "Blocked"
                                  : "Scheduled"}
                        </span>
                      )}
                    </article>
                  );
                })
              : empty(
                  loading && !preview
                    ? "Loading agenda…"
                    : "No events scheduled.",
                )}
          </section>
          <section className="cc-panel cc-reader" aria-label="Email reader">
            {message ? (
              <>
                <header>
                  <div>
                    <h2>{message.subject || "(No subject)"}</h2>
                    <span className="cc-mail-tag">
                      <Tag />
                      {message.department || department?.name || "Info"} inbox
                    </span>
                  </div>
                  <button
                    aria-label="Open message in Outlook"
                    onClick={() => {
                      const url = safeOutlook(message.webLink);
                      if (url)
                        window.open(url, "_blank", "noopener,noreferrer");
                      else openMail();
                    }}
                  >
                    <MoreHorizontal />
                  </button>
                </header>
                <div className="cc-message-content">
                  <div className="cc-sender">
                    <span className="cc-avatar">
                      {person(message)
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")}
                    </span>
                    <div>
                      <strong>{person(message)}</strong>
                      <p>
                        To{" "}
                        {preview
                          ? `${message.department.toLowerCase()}@jbagreengold.com`
                          : mailAddress}
                      </p>
                    </div>
                    <time>
                      {message.time || clock(message.receivedDateTime)}
                    </time>
                  </div>
                  <p className="cc-message-body">
                    {message.body?.contentType?.toLowerCase() === "text"
                      ? message.body.content
                      : message.bodyPreview}
                  </p>
                  {detail.isError && <p role="alert">{detail.error.message}</p>}
                  <div className="cc-message-actions">
                    <button
                      onClick={() =>
                        document.getElementById("cc-reply")?.focus()
                      }
                    >
                      <Reply />
                      Reply
                    </button>
                    <button
                      onClick={() => {
                        const url = safeOutlook(message.webLink);
                        if (url)
                          window.open(url, "_blank", "noopener,noreferrer");
                        else
                          window.open(
                            `https://outlook.office.com/mail/deeplink/compose?subject=${encodeURIComponent("Fwd: " + (message.subject || ""))}&body=${encodeURIComponent(message.bodyPreview || "")}`,
                            "_blank",
                            "noopener,noreferrer",
                          );
                      }}
                    >
                      <Forward />
                      Forward
                    </button>
                    <button
                      onClick={() =>
                        onCreate(selectedDate, {
                          title: message.subject || "",
                          description: message.bodyPreview || "",
                        })
                      }
                    >
                      <CalendarDays />
                      Create event
                    </button>
                  </div>
                  <form onSubmit={sendReply}>
                    <label className="cc-from">
                      From{" "}
                      <select
                        aria-label="Reply from"
                        value={
                          preview
                            ? `${message.department.toLowerCase()}@jbagreengold.com`
                            : mailAddress
                        }
                        onChange={() => {}}
                      >
                        <option>
                          {preview
                            ? `${message.department.toLowerCase()}@jbagreengold.com`
                            : mailAddress}
                        </option>
                      </select>
                    </label>
                    <textarea
                      id="cc-reply"
                      aria-label="Write your reply"
                      placeholder="Write your reply…"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      maxLength={15000}
                      disabled={sending}
                    />
                    <div className="cc-reply-footer">
                      <span>Replies are sent from this inbox</span>
                      <button
                        className="cc-primary"
                        type="submit"
                        disabled={
                          sending ||
                          !draft.trim() ||
                          (!preview && !detail.isSuccess)
                        }
                      >
                        <Send />
                        {sending ? "Sending…" : "Send reply"}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="cc-reader-empty">
                <Mail />
                {empty("Select a message to read or reply.")}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
