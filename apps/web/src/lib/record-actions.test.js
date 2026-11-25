import { describe, it, expect, vi } from 'vitest';
import { canCorrectEntity, editRecordValues, recordLabel, requireNoLinkedRecords } from './record-actions';

describe('safe record corrections', () => {
  it('keeps overview/report-only access read-only and scopes correction controls', () => {
    expect(canCorrectEntity({ role: 'finance_officer', pageAccess: ['dashboard', 'reports'] }, 'Payment')).toBe(false);
    expect(canCorrectEntity({ role: 'sales_officer', pageAccess: ['sales'] }, 'Payment')).toBe(true);
    expect(canCorrectEntity({ role: 'customer', pageAccess: ['sales'] }, 'Payment')).toBe(false);
    expect(canCorrectEntity({ role: 'admin', pageAccess: ['hr'] }, 'Employee')).toBe(false);
    expect(canCorrectEntity({ role: 'super_admin' }, 'Employee')).toBe(true);
  });
  it('populates dates without modifying records, preserving zero and decimals', () => {
    const record = { id: 'p1', amount: 0.25, count: 0, payment_date: '2026-11-20T12:30:00Z', untouched: 'keep' };
    expect(editRecordValues(record, [{ name: 'amount' }, { name: 'count' }, { name: 'payment_date', type: 'date' }])).toEqual({ amount: 0.25, count: 0, payment_date: '2026-11-20' });
    expect(record.untouched).toBe('keep');
    expect(recordLabel({ payment_reference: 'PAY-001', id: 'id' })).toBe('PAY-001');
  });
  it('blocks linked parent deletion and fails closed when dependency lookup fails', async () => {
    const api = { entities: { PurchaseOrder: { listAll: vi.fn().mockResolvedValue([{ supplier_name: 'Supplier A' }]) } } };
    await expect(requireNoLinkedRecords(api, 'PurchaseOrder', [['supplier_name', 'Supplier A']], 'Linked purchase orders')).rejects.toThrow('Linked purchase orders');
    await expect(requireNoLinkedRecords(api, 'PurchaseOrder', [['supplier_name', 'Supplier B']], 'Linked purchase orders')).resolves.toBeUndefined();
    api.entities.PurchaseOrder.listAll.mockRejectedValue(new Error('Offline'));
    await expect(requireNoLinkedRecords(api, 'PurchaseOrder', [['supplier_name', 'Supplier B']], 'Linked purchase orders')).rejects.toThrow('Offline');
  });
});
