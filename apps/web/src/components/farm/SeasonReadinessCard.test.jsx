import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import SeasonReadinessCard from './SeasonReadinessCard';
import { seasonReadiness } from '@/lib/season-readiness';

vi.mock('@/lib/utils', async () => {
  const { clsx } = await import('clsx');
  const { twMerge } = await import('tailwind-merge');
  return { cn: (...inputs) => twMerge(clsx(inputs)) };
});

const farm = { id: 'a', name: 'Farm A', blocks: [{ id: 'a1', farm_id: 'a', block_code: 'A1' }] };
const row = { id: 'task-one', farm_id: 'a', block_id: 'a1', block_name: 'A1', category: 'Fertilizer Application', title: 'Apply fertilizer to A1', activity_date: '2026-03-04', status: 'Completed' };
const render = (records) => {
  const model = seasonReadiness(records, { farm }).fertilizer;
  return renderToStaticMarkup(<StaticRouter location="/"><SeasonReadinessCard title="Fertilizer" icon={Leaf} model={model} total={1} accent="green" /></StaticRouter>);
};

describe('season readiness activity links', () => {
  it('shows the recorded activity, date, scope, status and exact task destination', () => {
    const html = render([row]);
    expect(html).toContain('Apply fertilizer to A1');
    expect(html).toContain('4 Mar 2026');
    expect(html).toContain('Completed');
    expect(html).toContain('1 of 1 blocks with records');
    expect(html).toContain('100%');
    expect(html.match(/href="\/admin\/farm-daily-activities\/activities\/records\?record=task-one&amp;entity=DailyActivity"/g)).toHaveLength(2);
  });

  it('offers every task separately when multiple activities are recorded', () => {
    const html = render(Array.from({ length: 5 }, (_, i) => ({ ...row, id: `task-${i}`, title: `Fertilizer task ${i}` })));
    for (let i = 0; i < 5; i++) expect(html).toContain(`record=task-${i}&amp;entity=DailyActivity`);
    expect(html).toContain('Show 2 more tasks');
  });

  it('shows an honest empty state without a misleading task link', () => {
    const html = render([]);
    expect(html).toContain('No Daily Task Log records');
    expect(html).toContain('0%');
    expect(html).not.toContain('href=');
    expect(html).not.toContain('Not scheduled');
  });
});
