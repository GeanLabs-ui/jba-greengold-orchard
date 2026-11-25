import { describe, expect, it, vi } from 'vitest';
import { dashboardSources, loadDashboardRecords } from './dashboard-sources';

describe('dashboard source loading', () => {
  it('loads allowed dependencies without requesting restricted business collections', async () => {
    const entities = Object.fromEntries(Object.values(dashboardSources).map(name => [name, {listAll: vi.fn().mockResolvedValue([])}]));
    const data = await loadDashboardRecords(entities, {role:'farm_supervisor',pageAccess:['dashboard','farm_daily_activities']});
    expect(entities.FarmBlock.listAll).toHaveBeenCalled();
    expect(entities.Payment.listAll).not.toHaveBeenCalled();
    expect(data.restrictedSources).toContain('Payment');
    entities.DailyActivity.listAll.mockRejectedValue(new Error('Database unavailable'));
    await expect(loadDashboardRecords(entities, {role:'farm_supervisor',pageAccess:['farm_daily_activities']})).rejects.toThrow('DailyActivity records could not be loaded');
  });
  it('loads every production and business source through the paginated adapter', async () => {
    const entities = Object.fromEntries(Object.values(dashboardSources).map((name) => [name, { listAll: vi.fn().mockResolvedValue([{ id: name }]) }]));
    const data = await loadDashboardRecords(entities);
    for (const [key, entity] of Object.entries(dashboardSources)) {
      expect(data[key]).toEqual([{ id: entity }]);
      expect(entities[entity].listAll).toHaveBeenCalledWith('-created_date');
    }
  });
  it('reports a failed source rather than replacing its records with zero', async () => {
    const entities = Object.fromEntries(Object.values(dashboardSources).map((name) => [name, { listAll: vi.fn().mockResolvedValue([]) }]));
    entities.Order.listAll.mockRejectedValue(new Error('Service unavailable'));
    await expect(loadDashboardRecords(entities)).rejects.toThrow('Order records could not be loaded: Service unavailable');
  });
});
