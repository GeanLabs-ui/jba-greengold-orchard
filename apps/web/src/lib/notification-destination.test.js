import { describe, expect, it } from 'vitest';
import { notificationDestination } from './notification-destination';

describe('notification source routing', () => {
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
});
