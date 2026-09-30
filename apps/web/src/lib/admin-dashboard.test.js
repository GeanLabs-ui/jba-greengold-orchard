import { describe, it, expect } from 'vitest';
import { buildDashboardAnalytics, completedPayment, outstandingInvoice } from './admin-dashboard';

describe('admin dashboard summaries', () => {
  it('counts only completed receipts and excludes void or settled invoices', () => {
    expect(['pending', 'failed', 'reversed', 'completed'].filter((status) => completedPayment({ status }))).toEqual(['completed']);
    expect(outstandingInvoice({ status: 'void', total_amount: 100 })).toBe(false);
    expect(outstandingInvoice({ status: 'unpaid', total_amount: 100, balance_due: 0 })).toBe(false);
    expect(outstandingInvoice({ status: 'partial', total_amount: 100, balance_due: 40 })).toBe(true);
  });
  it('matches daily activity actual costs and output, including explicit zeroes', () => {
    const result = buildDashboardAnalytics({ dailyActivities: [
      { activity_date: '2026-09-01', status: 'Completed', actual_cost: 0, cost: 100, log_entry: true, output_quantity_kg: 0, harvest_quantity: 500 },
      { activity_date: '2026-09-02', status: 'Pending', cost: 30, output_quantity_kg: 200 },
      { activity_date: '2025-09-02', status: 'Cancelled', cost: 100, output_quantity_kg: 100 },
    ] }, new Date(2026, 8, 30));
    expect(result.months.at(-1)).toMatchObject({ costs: 30, yield: 200 });
    expect(result.completion).toBe(50);
    expect(result.overdue).toHaveLength(1);
    expect(result.costs).toEqual([{ name: 'Other', value: 30 }]);
  });
  it('handles an empty workspace and a six-month trend spanning years', () => {
    const result = buildDashboardAnalytics({}, new Date(2026, 0, 10));
    expect(result.completion).toBeNull();
    expect(result.months.map((row) => row.month)).toEqual(['Aug', 'Sept', 'Oct', 'Nov', 'Dec', 'Jan']);
    expect(result.months.every((row) => row.yield === 0)).toBe(true);
  });
});
