import { getSafeRedirectTarget } from './safe-redirect';

const calendarTypes = new Set(['calendar_scheduled', 'calendar_due', 'harvest_schedule']);
const legacyCalendarTitles = new Set(['Production activity scheduled', 'Production activity reminder']);
const taskRecordsPath = '/admin/farm-daily-activities/activities/records';
const masterSchedulePath = '/admin/farm-daily-activities/activities/master-schedule';

export function isBellNotification(item) {
  if (item.status === 'archived') return false;
  const type = item.notification_type || item.type;
  if (type === 'order') return Boolean(item.order_id || (item.entity_name === 'Order' && item.record_id));
  if (type === 'delay') return Boolean(item.record_id && ['FarmProject', 'FarmTask', 'DailyActivity', 'WorkOrder'].includes(item.entity_name));
  if (calendarTypes.has(type) || (type === 'calendar_activity' && legacyCalendarTitles.has(item.title))) {
    return Boolean(item.calendar_event_id || (item.entity_name === 'CalendarEvent' && item.record_id));
  }
  return false;
}

export function notificationDestination(item) {
  const type = item.notification_type || item.type;
  const id = encodeURIComponent(item.record_id || '');
  if (item.order_id) return `/admin/marketing/orders?order=${encodeURIComponent(item.order_id)}`;
  if (type === 'order' && item.entity_name === 'Order' && id) return `/admin/marketing/orders?order=${id}`;
  if (item.inquiry_id) return `/admin/client-management/inquiries?inquiry=${encodeURIComponent(item.inquiry_id)}`;
  if (item.calendar_event_id) return `/admin/calendar?event=${encodeURIComponent(item.calendar_event_id)}`;
  if (item.entity_name === 'CalendarEvent' && id) return `/admin/calendar?event=${id}`;
  const safe = typeof item.destination === 'string' && !item.destination.includes('\\') ? getSafeRedirectTarget(item.destination, '') : '';
  if (type === 'delay' && id) {
    if (item.entity_name === 'FarmProject') return `${masterSchedulePath}/${id}`;
    if (item.entity_name === 'FarmTask' && safe.startsWith(`${masterSchedulePath}/`)) return `${safe.split('?')[0]}?subtask=${id}`;
    if (['FarmTask', 'DailyActivity', 'WorkOrder'].includes(item.entity_name)) return `${taskRecordsPath}?record=${id}&entity=${item.entity_name}`;
  }
  if (item.entity_name === 'DailyActivity' || type === 'daily_activity') {
    const code = String(item.message || '').split(' ')[0];
    return `/admin/farm-daily-activities/activities/records?${id ? `record=${id}` : `code=${encodeURIComponent(code)}`}&entity=DailyActivity`;
  }
  if (safe.startsWith('/admin/')) return safe;
  if (type === 'order') return '/admin/marketing/orders';
  if (item.invoice_number || type === 'payment') return `/admin/marketing/sales?invoice=${encodeURIComponent(item.invoice_number || '')}`;
  if (type === 'inquiry') return '/admin/client-management/inquiries';
  const routes = { work_order: '/admin/farm-daily-activities/activities/records', farm_operations: '/admin/farm-daily-activities/activities/master-schedule', procurement: '/admin/procurement', harvest: '/admin/farm-daily-activities/activities/records', daily_report: '/admin/farm-daily-activities/activities/overview', input_usage: '/admin/inventory' };
  return routes[type] || null;
}
