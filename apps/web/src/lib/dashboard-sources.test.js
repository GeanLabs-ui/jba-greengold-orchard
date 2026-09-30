import { describe, expect, it, vi } from 'vitest';
import { dashboardSources, loadDashboardRecords } from './dashboard-sources';

describe('dashboard source loading', () => {
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
