import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BudgetHarvestView from './BudgetHarvestView';

const controls = vi.hoisted(() => ({ user: { role: 'super_admin' }, actions: [] }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: controls.user }) }));
vi.mock('@/components/admin/EntityRecordActions', () => ({ default: (props) => {
  controls.actions.push(props);
  return <span>Correction controls</span>;
} }));

function render(harvests = [], financeRecords = []) {
  return renderToStaticMarkup(<BudgetHarvestView blocks={[]} busyKey="" finance={{ planned: 0, actual: 0, kg: 0, gradePct: 0, revenue: 0 }} financeRecords={financeRecords} harvests={harvests} harvestDialog={{ current: null }} onAddHarvest={() => {}} onUpdateBudget={() => {}} onRecordsChanged={() => {}} today="2026-11-25" />);
}

describe('budget and harvest corrections', () => {
  beforeEach(() => { controls.user = { role: 'super_admin' }; controls.actions = []; });
  it('routes task-log derived harvest lots to their source instead of independent correction', () => {
    const html = render([{ id: 'batch', activity_id: 'task/1' }]);
    expect(html).toContain('record=task%2F1&amp;entity=DailyActivity');
    expect(html).toContain('Edit source task log');
    expect(controls.actions).toHaveLength(0);
  });
  it('restricts lot edits to details that preserve linked stock and quality quantities', () => {
    render([{ id: 'batch', batch_number: 'LOT-1', quantity_harvested_kg: 10 }]);
    expect(controls.actions).toHaveLength(1);
    expect(controls.actions[0].entity).toBe('HarvestBatch');
    expect(controls.actions[0].fields.map(field => field.name)).toEqual(['buyer', 'notes']);
    expect(controls.actions[0].onChanged).toBeTypeOf('function');
  });
  it('provides explicit budget correction fields and disables inline writes for viewers', () => {
    render([], [{ id: 'budget', category: 'Labor', amount: 25, actual_amount: 10 }]);
    expect(controls.actions[0].record.planned_amount).toBe(25);
    expect(controls.actions[0].fields.map(field => field.name)).toContain('actual_amount');
    controls.user = { role: 'auditor' };
    const html = render([{ id: 'batch' }], [{ id: 'budget', actual_amount: 10 }]);
    expect(html).toMatch(/<input[^>]*disabled=""/);
    expect(html).not.toContain('Edit source task log');
  });
});
