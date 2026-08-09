const CALENDAR_STATUS_TO_TASK = {
  scheduled: 'not_started',
  in_progress: 'in_progress',
  completed: 'completed',
  blocked: 'blocked',
  cancelled: 'deferred',
};

const CALENDAR_STATUS_TO_ACTIVITY = {
  scheduled: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
  cancelled: 'Deferred',
};

export const CALENDAR_CATEGORIES = [
  'Farm Operations',
  'Irrigation',
  'Crop Nutrition',
  'Pest & Disease',
  'Harvesting',
  'Packhouse',
  'Maintenance',
  'Meeting',
  'Compliance',
];

export const CALENDAR_STATUSES = ['scheduled', 'in_progress', 'completed', 'blocked', 'cancelled'];

export function dateKey(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export function calendarStatusToTask(status) {
  return CALENDAR_STATUS_TO_TASK[status] || 'not_started';
}

export function taskStatusToCalendar(status) {
  return ({
    not_started: 'scheduled',
    in_progress: 'in_progress',
    completed: 'completed',
    blocked: 'blocked',
    deferred: 'cancelled',
  })[status] || 'scheduled';
}

export function eventToTaskPayload(event) {
  return {
    task_code: event.task_code,
    calendar_event_id: event.id,
    programme_code: 'PRODUCTION-CALENDAR',
    source: 'Production Calendar',
    wbs: `CAL-${dateKey(event.start_at).replaceAll('-', '')}`,
    phase_name: 'Scheduled Activities',
    category: event.category || 'Farm Operations',
    title: event.title,
    description: event.description || '',
    farm_id: event.farm_id || '',
    farm_name: event.farm_name || '',
    assigned_to_name: event.assigned_to_name || '',
    owner_name: event.assigned_to_name || '',
    priority: event.priority || 'Medium',
    planned_start: event.start_at,
    due_date: event.end_at || event.start_at,
    status: calendarStatusToTask(event.status),
    progress_percent: Number(event.progress_percent || 0),
    reminder_minutes: Number(event.reminder_minutes || 0),
    reminders_enabled: Boolean(event.reminders_enabled),
    comments: event.notes || '',
  };
}

export function eventToDailyActivityPayload(event) {
  return {
    activity_code: `DA-${event.task_code}`,
    routine_task_code: event.task_code,
    calendar_event_id: event.id,
    programme_code: 'PRODUCTION-CALENDAR',
    source: 'Production Calendar',
    activity_date: dateKey(event.start_at),
    start_time: event.all_day ? '' : String(event.start_at || '').slice(11, 16),
    end_time: event.all_day ? '' : String(event.end_at || '').slice(11, 16),
    title: event.title,
    activity_title: event.title,
    description: event.description || '',
    category: event.category || 'Farm Operations',
    farm_id: event.farm_id || '',
    farm_name: event.farm_name || '',
    assigned_workers: event.assigned_to_name || '',
    supervisor_name: event.assigned_to_name || '',
    priority: event.priority || 'Medium',
    status: CALENDAR_STATUS_TO_ACTIVITY[event.status] || 'Planned',
    progress_percent: Number(event.progress_percent || 0),
    notes: event.notes || event.description || '',
  };
}

export function isReminderDue(event, now = new Date()) {
  if (!event?.reminders_enabled || ['completed', 'cancelled'].includes(event.status)) return false;
  if (event.reminder_sent_for_start === event.start_at) return false;
  const start = new Date(event.start_at).getTime();
  const current = now.getTime();
  if (!Number.isFinite(start)) return false;
  const due = start - Number(event.reminder_minutes || 0) * 60_000;
  return current >= due && current <= start + 30 * 60_000;
}

const escapeIcs = (value) => String(value || '')
  .replaceAll('\\', '\\\\')
  .replaceAll('\n', '\\n')
  .replaceAll(',', '\\,')
  .replaceAll(';', '\\;');

const icsDate = (value, allDay = false) => {
  if (allDay) return dateKey(value).replaceAll('-', '');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
};

export function buildICalendar(events, calendarName = 'JBA GreenGold Production') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JBA GreenGold Orchard//Production Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    'X-WR-TIMEZONE:Africa/Accra',
  ];
  events.filter((event) => event.start_at).forEach((event) => {
    const allDay = Boolean(event.all_day);
    const start = icsDate(event.start_at, allDay);
    const end = icsDate(event.end_at || event.start_at, allDay);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcs(event.id || event.task_code)}@jbagreengoldorchard.farm`,
      `DTSTAMP:${icsDate(event.updated_date || event.created_date || new Date().toISOString())}`,
      allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
      allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`,
      `SUMMARY:${escapeIcs(event.title)}`,
      `DESCRIPTION:${escapeIcs(event.description || event.notes)}`,
      `LOCATION:${escapeIcs(event.farm_name)}`,
      `STATUS:${event.status === 'cancelled' ? 'CANCELLED' : event.status === 'completed' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function downloadICalendar(events, calendarName = 'JBA GreenGold Production') {
  const blob = new Blob([buildICalendar(events, calendarName)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${calendarName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

const providerDates = (event) => {
  const start = icsDate(event.start_at, Boolean(event.all_day));
  const end = icsDate(event.end_at || event.start_at, Boolean(event.all_day));
  return `${start}/${end}`;
};

export function googleCalendarUrl(event) {
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'Production activity',
    dates: providerDates(event),
    details: event.description || event.notes || '',
    location: event.farm_name || '',
  });
  return `https://calendar.google.com/calendar/render?${query}`;
}

export function outlookCalendarUrl(event) {
  const query = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title || 'Production activity',
    startdt: new Date(event.start_at).toISOString(),
    enddt: new Date(event.end_at || event.start_at).toISOString(),
    body: event.description || event.notes || '',
    location: event.farm_name || '',
  });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${query}`;
}

