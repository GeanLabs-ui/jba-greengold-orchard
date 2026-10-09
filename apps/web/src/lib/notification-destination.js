import { getSafeRedirectTarget } from './safe-redirect';

export function notificationDestination(item) {
  const type = item.notification_type || item.type;
  const id = encodeURIComponent(item.record_id || '');
  if (item.order_id) return `/admin/marketing/orders?order=${encodeURIComponent(item.order_id)}`;
  if (item.inquiry_id) return `/admin/client-management/inquiries?inquiry=${encodeURIComponent(item.inquiry_id)}`;
  if (item.calendar_event_id) return `/admin/calendar?event=${encodeURIComponent(item.calendar_event_id)}`;
  if (item.entity_name === 'DailyActivity' || type === 'daily_activity') {
    const code = String(item.message || '').split(' ')[0];
    return `/admin/farm-daily-activities/activities/records?${id ? `record=${id}` : `code=${encodeURIComponent(code)}`}&entity=DailyActivity`;
  }
  const safe = typeof item.destination === 'string' && !item.destination.includes('\\') ? getSafeRedirectTarget(item.destination, '') : '';
  if (safe.startsWith('/admin/')) return safe;
  if (type === 'order') return '/admin/marketing/orders';
  if (item.invoice_number || type === 'payment') return `/admin/marketing/sales?invoice=${encodeURIComponent(item.invoice_number || '')}`;
  if (type === 'inquiry') return '/admin/client-management/inquiries';
  const routes = { work_order: '/admin/farm-daily-activities/activities/records', farm_operations: '/admin/farm-daily-activities/activities/master-schedule', procurement: '/admin/procurement', harvest: '/admin/farm-daily-activities/activities/records', daily_report: '/admin/farm-daily-activities/activities/overview', input_usage: '/admin/inventory' };
  return routes[type] || null;
}
