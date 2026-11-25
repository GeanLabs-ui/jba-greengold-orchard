import { describe, it, expect } from 'vitest';
import { assertIndependentDeletion, deleteIndependentEntity } from './entity-deletion.js';
const row = (entity_name: string, id: string, data = {}, organization_id = 'org') => ({ entity_name, id, data, organization_id });
describe('independent record deletion', () => {
  it('protects department hierarchy and assigned staff', () => {
    const parent = row('Department','d',{name:'Farm Ops'});
    for (const child of [row('Department','sub',{parent_department_id:'d'}),row('Employee','e',{department_id:'d'}),row('Employee','e',{sub_department_id:'d'})]) expect(()=>assertIndependentDeletion(parent,[child])).toThrow('used by');
  });
  it('protects source histories and account-backed employees', () => {
    expect(()=>assertIndependentDeletion(row('CalendarEvent','c'),[row('DailyActivity','a',{calendar_event_id:'c'})])).toThrow('DailyActivity');
    expect(()=>assertIndependentDeletion(row('Employee','e',{user_id:'u'}),[])).toThrow('staff account');
    expect(()=>assertIndependentDeletion(row('Equipment','e'),[row('EquipmentUsage','use',{equipment_id:'e'})])).toThrow('EquipmentUsage');
  });
  it('preserves external calendar ownership and harvest period links', () => {
    for (const fields of [{ source_entity: 'DailyActivity' }, { harvest_period_id: 'h' }, { external_event_id: 'outlook' }, { outlook: true }, { outlook_event_id: 'o' }]) {
      expect(() => assertIndependentDeletion(row('CalendarEvent', 'c', fields), [])).toThrow('source');
    }
  });
  it('protects legacy name references and stock ledger ownership', () => {
    expect(()=>assertIndependentDeletion(row('Supplier','s',{name:'Vendor'}),[row('PurchaseOrder','po',{supplier_name:'Vendor'})])).toThrow();
    expect(()=>assertIndependentDeletion(row('Customer','c',{first_name:'Ama',last_name:'Mensah'}),[row('Invoice','i',{customer_name:'Ama Mensah'})])).toThrow();
    expect(()=>assertIndependentDeletion(row('StockItem','s',{product_name:'Mango',warehouse_name:'Store'}),[row('StockMovement','m',{product_name:'Mango',warehouse_name:'Store'})])).toThrow();
  });
  it('allows independent records and ignores other organizations and empty labels', () => {
    expect(()=>assertIndependentDeletion(row('Supplier','s',{name:'Vendor'}),[row('PurchaseOrder','po',{supplier_name:'Vendor'},'other')])).not.toThrow();
    expect(()=>assertIndependentDeletion(row('Supplier','s'),[row('PurchaseOrder','po',{})])).not.toThrow();
  });
  it('checks historical email-linked accounts and invitations before deleting employee profiles', async () => {
    for (const relation of ['account', 'invitation']) {
      const queries: string[] = [];
      const tx = Object.assign(async (strings: TemplateStringsArray) => {
        const query = strings.join('?'); queries.push(query);
        if (query.includes('FROM entity_records WHERE id=')) return [row('Employee', 'e', { email: 'staff@example.com' })];
        if (query.includes('FROM users')) return relation === 'account' ? [{ id: 'u' }] : [];
        if (query.includes('FROM staff_invitations')) return [{ id: 'invite' }];
        return [];
      }, { json: (value: unknown) => value });
      const sql = { begin: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx) };
      await expect(deleteIndependentEntity(sql as unknown as Parameters<typeof deleteIndependentEntity>[0], 'Employee', 'e', { id: 'hr', role: 'hr_officer', organizationId: 'org' } as Parameters<typeof deleteIndependentEntity>[3], '127.0.0.1')).rejects.toThrow(relation === 'account' ? 'staff account' : 'invitation history');
      expect(queries.some(query => query.startsWith('DELETE'))).toBe(false);
    }
  });
});
