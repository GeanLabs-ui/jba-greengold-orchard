import { describe, expect, it } from 'vitest';
import {
  activityExpenseRows,
  buildMonthlyFinanceData,
  dailyActivityCost,
  matchesDateSelection,
  matchesFarmSelection,
  outstandingWebsiteInvoices,
  sumAmounts,
  websiteSales,
} from './finance-data';

describe('finance data sources', () => {
  it('uses actual daily activity costs and falls back to the normalized cost', () => {
    expect(dailyActivityCost({ actual_cost: 125, cost: 90 })).toBe(125);
    expect(dailyActivityCost({ actual_cost: '', cost: 90 })).toBe(90);
    expect(dailyActivityCost({ cost: 45 })).toBe(45);
    expect(dailyActivityCost({ actual_cost: 0, cost: 45 })).toBe(0);
  });

  it('creates expense rows only from activities with a current financial cost', () => {
    const rows = activityExpenseRows([
      { id: 'one', activity_code: 'DA-1', activity_date: '2026-08-01', title: 'Pruning', actual_cost: 200, responsible: 'Team A' },
      { id: 'two', activity_code: 'DA-2', actual_cost: 0 },
      { id: 'three', activity_code: 'DA-3', actual_cost: -20 },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ expense_number: 'DA-1', amount: 200, vendor_name: 'Team A', source_label: 'Daily Activity' });
  });

  it('counts only valid website orders and website invoice balances', () => {
    const orders = [
      { id: 'web-1', source: 'website', status: 'confirmed', total_amount: 100 },
      { id: 'web-2', source: 'website', status: 'cancelled', total_amount: 500 },
      { id: 'admin-1', source: 'admin', status: 'confirmed', total_amount: 900 },
    ];
    const invoices = [
      { id: 'invoice-1', source: 'website', status: 'unpaid', balance_due: 60 },
      { id: 'invoice-2', source: 'website', status: 'paid', balance_due: 0 },
      { id: 'invoice-3', source: 'admin', status: 'unpaid', balance_due: 800 },
    ];

    expect(sumAmounts(websiteSales(orders), 'total_amount')).toBe(100);
    expect(sumAmounts(outstandingWebsiteInvoices(invoices), 'balance_due')).toBe(60);
  });

  it('builds the chart from website sales and daily activity expenses', () => {
    const chart = buildMonthlyFinanceData(
      [{ order_date: '2026-08-05', total_amount: 700 }],
      [{ expense_date: '2026-08-07', amount: 250 }],
      new Date('2026-08-19T12:00:00Z'),
    );

    expect(chart.at(-1)).toMatchObject({ month: 'Aug', sales: 700, expenses: 250 });
  });

  it('filters Farm A as a parent of A1–A5 and supports individual blocks', () => {
    const farmA = { farm_name: 'Farm Land A', block_name: 'Block A3' };
    const farmB = { farm_name: 'Farm B', block_code: 'B2' };

    expect(matchesFarmSelection(farmA, 'A')).toBe(true);
    expect(matchesFarmSelection(farmA, 'A3')).toBe(true);
    expect(matchesFarmSelection(farmA, 'A2')).toBe(false);
    expect(matchesFarmSelection(farmB, 'B')).toBe(true);
    expect(matchesFarmSelection(farmB, 'A')).toBe(false);
    expect(matchesFarmSelection({}, 'all')).toBe(true);
  });

  it('filters monthly, yearly, and custom date periods inclusively', () => {
    expect(matchesDateSelection('2027-03-15', { mode: 'month', month: '2027-03' })).toBe(true);
    expect(matchesDateSelection('2027-03-15', { mode: 'year', year: '2027' })).toBe(true);
    expect(matchesDateSelection('2027-03-15', { mode: 'year', year: '2028' })).toBe(false);
    expect(matchesDateSelection('2027-03-15', { mode: 'custom', start: '2027-03-15', end: '2027-03-15' })).toBe(true);
    expect(matchesDateSelection('2027-03-14', { mode: 'custom', start: '2027-03-15', end: '2027-03-20' })).toBe(false);
  });
});
