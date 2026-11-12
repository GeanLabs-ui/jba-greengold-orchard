import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isBellNotification, notificationDestination } from './notification-destination';

describe('notification source routing', () => {
  beforeEach(() => vi.stubGlobal('window', { location: { origin: 'https://orchard.test' } }));
  afterEach(() => vi.unstubAllGlobals());
  it('prefers the actual order over an unrelated stored destination', () => {
    expect(notificationDestination({ order_id: 'order 1', destination: '/admin/documents' })).toBe('/admin/marketing/orders?order=order%201');
  });
  it('opens calendar and inquiry sources', () => {
    expect(notificationDestination({ calendar_event_id: 'event' })).toBe('/admin/calendar?event=event');
    expect(notificationDestination({ inquiry_id: 'inquiry' })).toBe('/admin/client-management/inquiries?inquiry=inquiry');
  });
  it('recovers the activity code from legacy activity alerts', () => {
    expect(notificationDestination({ type: 'daily_activity', message: 'DA-721472 Land Clearing recorded' })).toContain('code=DA-721472');
  });
  it('rejects external destinations and avoids an unrelated fallback', () => {
    expect(notificationDestination({ destination: 'https://example.com' })).toBeNull();
    expect(notificationDestination({ destination: '//example.com/admin' })).toBeNull();
    expect(notificationDestination({ type: 'unknown' })).toBeNull();
  });
  it('adds the exact subtask to legacy master schedule links', () => {
    const destination = '/admin/farm-daily-activities/activities/master-schedule/parent';
    expect(notificationDestination({ type: 'delay', entity_name: 'FarmTask', record_id: 'sub 1', destination })).toBe(`${destination}?subtask=sub%201`);
  });
  it('shows only linked, active task delays, placed orders, and scheduled or due calendar events', () => {
    const order = { type: 'order', order_id: 'order' };
    const task = { type: 'delay', entity_name: 'FarmTask', record_id: 'task' };
    const event = { calendar_event_id: 'event' };
    expect([order, task, { ...event, type: 'calendar_scheduled' }, { ...event, type: 'calendar_due' },
      { ...event, type: 'calendar_activity', title: 'Production activity reminder' }].every(isBellNotification)).toBe(true);
    expect([{ ...order, status: 'archived' }, { type: 'order' }, { ...task, type: 'pending_task' },
      { type: 'inquiry', inquiry_id: 'inquiry' }, { ...event, type: 'calendar_activity', title: 'Scheduled activity completed' },
      { ...event, type: 'new_record' }].some(isBellNotification)).toBe(false);
  });
});
