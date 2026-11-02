import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('shared API reads', () => {
  let api, fetchMock, clear;
  const ok = data => Response.json({ data, pagination: { hasMore: false } });
  beforeEach(async () => {
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    api = (await import('./base44Client')).base44;
    clear = (await import('../lib/api-read-cache')).clearApiReadCache;
    fetchMock.mockResolvedValueOnce(ok({ user: { id: 'staff-a' }, csrf_token: 'token' }));
    await api.auth.me();
    fetchMock.mockClear();
  });
  afterEach(() => { clear(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('shares simultaneous reads and repeat navigation while isolating consumer edits', async () => {
    fetchMock.mockImplementation(async () => ok([{ id: '1', title: 'Saved' }]));
    const [a, b] = await Promise.all([
      api.entities.DailyActivity.listAll('-activity_date'),
      api.entities.DailyActivity.listAll('-created_date'),
    ]);
    a[0].title = 'Unsaved edit';
    b.push({ id: '2' });
    expect(await api.entities.DailyActivity.listAll()).toEqual([{ id: '1', title: 'Saved' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('expires reads after fifteen seconds', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => ok([]));
    await api.entities.Farm.listAll();
    vi.advanceTimersByTime(15_001);
    await api.entities.Farm.listAll();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shares the first page between list and listAll consumers', async () => {
    fetchMock.mockImplementation(async () => ok([{ id: '1' }]));
    await Promise.all([api.entities.Order.list('-created_date', 250), api.entities.Order.listAll()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps unrelated lookup records warm after saving an activity', async () => {
    fetchMock.mockImplementation(async () => ok([]));
    await api.entities.Farm.listAll();
    await api.entities.DailyActivity.create({ title: 'New activity' });
    await api.entities.Farm.listAll();
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('/entities/Farm?'))).toHaveLength(1);
  });

  it('fetches fresh data after a confirmed save and never caches writes', async () => {
    let title = 'Before';
    fetchMock.mockImplementation(async (_url, options) => {
      if (options.method === 'PATCH') { title = JSON.parse(options.body).title; return ok({ id: '1', title }); }
      return ok([{ id: '1', title }]);
    });
    await api.entities.DailyActivity.listAll();
    await api.entities.DailyActivity.update('1', { title: 'After' });
    expect(await api.entities.DailyActivity.listAll()).toEqual([{ id: '1', title: 'After' }]);
    await api.entities.DailyActivity.update('1', { title: 'After' });
    expect(fetchMock.mock.calls.filter(([, opts]) => opts.method === 'PATCH')).toHaveLength(2);
  });

  it('clears staff data when a different account is observed', async () => {
    fetchMock.mockResolvedValueOnce(ok([{ id: 'private-a' }]));
    await api.entities.DailyActivity.listAll();
    fetchMock.mockResolvedValueOnce(ok({ user: { id: 'staff-b' }, csrf_token: 'new' }));
    await api.auth.me();
    fetchMock.mockResolvedValueOnce(ok([{ id: 'private-b' }]));
    expect(await api.entities.DailyActivity.listAll()).toEqual([{ id: 'private-b' }]);
  });

  it('keeps all pages of analytics records and shares each pagination request', async () => {
    fetchMock.mockImplementation(async url => url.includes('offset=0')
      ? Response.json({ data: Array.from({ length: 250 }, (_, id) => ({ id })), pagination: { hasMore: true } })
      : ok([{ id: 250 }]));
    const [a, b] = await Promise.all([api.entities.DailyActivity.listAll(), api.entities.DailyActivity.listAll()]);
    expect(a).toHaveLength(251);
    expect(b).toHaveLength(251);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not cache failed reads', async () => {
    fetchMock.mockResolvedValue(ok([]));
    fetchMock.mockResolvedValueOnce(Response.json({ error: { message: 'Unavailable' } }, { status: 503 }));
    await expect(api.entities.Farm.listAll()).rejects.toThrow('Unavailable');
    fetchMock.mockResolvedValue(ok([]));
    expect(await api.entities.Farm.listAll()).toEqual([]);
  });
});
