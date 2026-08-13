import { afterEach, describe, expect, it, vi } from 'vitest';
import { base44 } from './base44Client.js';

describe('entity API pagination', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads every API page instead of silently stopping at 100 or 250 records', async () => {
    const records = Array.from({ length: 252 }, (_, index) => ({
      id: String(index),
      activity_date: `2026-08-${String((index % 28) + 1).padStart(2, '0')}`,
    }));
    const fetchMock = vi.fn(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      const offset = Number(url.searchParams.get('offset') || 0);
      const limit = Number(url.searchParams.get('limit') || 250);
      const data = records.slice(offset, offset + limit);
      return new Response(JSON.stringify({
        data,
        pagination: { limit, offset, hasMore: offset + data.length < records.length },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await base44.entities.DailyActivity.listAll('-activity_date');

    expect(result).toHaveLength(252);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result[0].activity_date >= result.at(-1).activity_date).toBe(true);
  });
});

