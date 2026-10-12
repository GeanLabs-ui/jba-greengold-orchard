import { afterEach, expect, it, vi } from 'vitest';
import { buildFarmOperationsAnalytics } from '../lib/farm-operations-analytics';
import { subscribeToDataChanges } from '../lib/data-sync';

afterEach(() => vi.unstubAllGlobals());

it('refreshes derived analytics through real client change events after create, edit and delete', async () => {
  vi.resetModules();
  const browserWindow = new EventTarget();
  vi.stubGlobal('window', browserWindow);
  vi.stubGlobal('localStorage', { setItem: vi.fn() });
  vi.stubGlobal('CustomEvent', class extends Event {
    constructor(type, options) { super(type); this.detail = options.detail; }
  });
  let records = [];
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    if (url.endsWith('/auth/me')) return Response.json({ data: { user: { id: 'test-admin' }, csrf_token: 'test-token' } });
    const method = options.method || 'GET';
    const payload = options.body ? JSON.parse(options.body) : {};
    if (method === 'POST') {
      records = [{ ...payload, id: 'log-1' }];
      return Response.json({ data: records[0] });
    }
    if (method === 'PATCH') {
      records = [{ ...records[0], ...payload }];
      return Response.json({ data: records[0] });
    }
    if (method === 'DELETE') { records = []; return Response.json({ data: {} }); }
    return Response.json({ data: records, pagination: { hasMore: false } });
  }));
  const { base44 } = await import('./base44Client');
  let refresh;
  let analytics;
  const unsubscribe = subscribeToDataChanges(() => {
    refresh = base44.entities.DailyActivity.listAll('-activity_date').then(dailyActivities => {
      analytics = buildFarmOperationsAnalytics({ dailyActivities });
    });
  }, ['DailyActivity']);
  try {
    await base44.entities.DailyActivity.create({ activity_date: '2026-10-04', log_entry: true, actual_cost: 250, actual_revenue: 900, output_quantity_kg: 2000 });
    await refresh;
    expect(analytics).toMatchObject({ totalCost: 250, totalRevenue: 900, totalYieldKg: 2000 });
    await base44.entities.DailyActivity.update('log-1', { actual_cost: 0, actual_revenue: 1000, output_quantity_kg: 3000 });
    await refresh;
    expect(analytics).toMatchObject({ totalCost: 0, totalRevenue: 1000, totalYieldKg: 3000 });
    await base44.entities.DailyActivity.delete('log-1');
    await refresh;
    expect(analytics).toMatchObject({ totalCost: 0, totalRevenue: 0, totalYieldKg: 0 });
  } finally { unsubscribe(); }
});
