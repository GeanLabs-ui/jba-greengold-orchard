import type { Database } from '../db.js';
import type { AuthUser } from '../middleware/auth.js';

type Row = { id: string; entity_name: string; organization_id: string | null; data: Record<string, any> };
export class EntityDeletionError extends Error {
  constructor(message: string, public status: 404 | 409 = 409) { super(message); }
}

// These are persisted references, not cascades: a linked parent must remain available.
const references: Record<string, [string[], string[], string[]][]> = {
  Customer: [[['Order','Invoice','Payment','Quotation','Return','CustomerContract'], ['customer_id'], ['id']], [['Order','Invoice','Payment','Quotation','Return','CustomerContract'], ['customer_code'], ['code']]],
  Supplier: [[['PurchaseOrder','FarmInput'], ['supplier_id'], ['id']], [['PurchaseOrder','FarmInput'], ['supplier_name','supplier'], ['name']]],
  Vehicle: [[['Delivery','ExportShipment'], ['vehicle_id'], ['id']], [['Delivery'], ['vehicle_plate'], ['plate_number']]],
  Warehouse: [[['StockItem','StockMovement','HarvestBatch'], ['warehouse_id'], ['id']], [['StockItem','StockMovement'], ['warehouse_name'], ['name']]],
  Department: [[['Department'], ['parent_department_id'], ['id']], [['Employee'], ['department_id','sub_department_id'], ['id']], [['Employee'], ['department','department_name','sub_department','sub_department_name'], ['name']]],
  Employee: [[['Employee'], ['reports_to_employee_id'], ['id']], [['Attendance','FarmAttendance','LaborSchedule'], ['employee_id'], ['id']]],
  Equipment: [[['EquipmentUsage','ActivityEquipment','DailyActivity'], ['equipment_id'], ['id']], [['EquipmentUsage','ActivityEquipment'], ['equipment_name'], ['equipment_name','name']]],
  FarmInput: [[['InputUsage','ActivityInput'], ['input_id','farm_input_id'], ['id']], [['InputUsage'], ['input_name'], ['input_name','name']]],
  WorkOrder: [[['DailyActivity'], ['work_order_id'], ['id']]],
  FarmTask: [[['DailyActivity','WorkOrder'], ['task_id','farm_task_id'], ['id']]],
  FarmProject: [[['FarmTask','DailyActivity','WorkOrder'], ['project_id'], ['id']]],
  HarvestBatch: [[['HarvestGrade','QualityCheck','WasteLoss','StockMovement'], ['harvest_batch_id','batch_id'], ['id']], [['HarvestGrade','QualityCheck','WasteLoss','StockMovement'], ['batch_number'], ['batch_number']]],
  CalendarEvent: [[['FarmTask','DailyActivity'], ['calendar_event_id'], ['id']]],
};

export function assertIndependentDeletion(parent: Row, rows: Row[]) {
  if (parent.entity_name === 'Employee' && (parent.data.user_id || parent.data.account_user_id || parent.data.account_only)) {
    throw new EntityDeletionError('This employee has a staff account. Deactivate the staff member through HR to preserve their account history.');
  }
  if (parent.entity_name === 'CalendarEvent' && (parent.data.source_entity || parent.data.harvest_period_id || parent.data.external_id || parent.data.external_event_id || parent.data.outlook || parent.data.outlook_event_id)) {
    throw new EntityDeletionError('This event belongs to a linked activity or external calendar. Cancel or edit it at its source to preserve history.');
  }
  if (parent.entity_name === 'StockItem' && Number(parent.data.quantity_reserved || 0) > 0) throw new EntityDeletionError('Release the reserved stock before deleting this item.');
  for (const row of rows) {
    if (row.id === parent.id || row.organization_id !== parent.organization_id) continue;
    const dependency = (references[parent.entity_name] || []).some(([entities, childKeys, parentKeys]) => entities.includes(row.entity_name)
      && childKeys.some(childKey => parentKeys.some(parentKey => {
        const value = parentKey === 'id' ? parent.id : parent.data[parentKey];
        return value != null && value !== '' && row.data[childKey] != null && String(row.data[childKey]) === String(value);
      })));
    const stockDependency = parent.entity_name === 'StockItem' && row.entity_name === 'StockMovement'
      && (row.data.stock_item_id === parent.id || row.data.product_name === parent.data.product_name && row.data.warehouse_name === parent.data.warehouse_name);
    const customerName = parent.entity_name === 'Customer' && ['Order','Invoice','Payment','Quotation','Return','CustomerContract'].includes(row.entity_name)
      && [parent.data.company_name, [parent.data.first_name,parent.data.last_name].filter(Boolean).join(' ')].some(value => value && row.data.customer_name === value);
    if (dependency || stockDependency || customerName) throw new EntityDeletionError(`This record is used by ${row.entity_name}. Correct or archive its linked records before deleting it.`);
  }
}

export async function deleteIndependentEntity(sql: Database, name: string, id: string, user: AuthUser, ip: string) {
  return sql.begin(async tx => {
    // Serialize dependency inspection with entity inserts/updates/deletes to avoid a check/delete race.
    await tx`LOCK TABLE entity_records IN SHARE ROW EXCLUSIVE MODE`;
    const [parent] = await tx<Row[]>`SELECT id, entity_name, organization_id, data FROM entity_records WHERE id=${id} AND entity_name=${name} AND (${['super_admin','admin'].includes(user.role)} OR organization_id IS NOT DISTINCT FROM ${user.organizationId})`;
    if (!parent) throw new EntityDeletionError('Record not found.', 404);
    if (name === 'Employee' && parent.data.email) {
      // Some historical employee records were matched to accounts by email,
      // before user_id was persisted on the profile. Never delete that profile.
      const [account] = await tx<{ id: string }[]>`SELECT u.id FROM users u WHERE lower(u.email) = ${String(parent.data.email).toLowerCase()} AND (EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id=u.id AND om.organization_id IS NOT DISTINCT FROM ${parent.organization_id}) OR (${parent.organization_id}::text IS NULL AND NOT EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id=u.id))) LIMIT 1`;
      if (account) throw new EntityDeletionError('This employee has a staff account. Deactivate the staff member through HR to preserve their account history.');
    }
    if (name === 'Employee') {
      const [invitation] = await tx<{ id: string }[]>`SELECT id FROM staff_invitations WHERE employee_id = ${id} OR (${Boolean(parent.data.email)} AND lower(email) = ${String(parent.data.email || '').toLowerCase()}) LIMIT 1`;
      if (invitation) throw new EntityDeletionError('This employee has a staff invitation history. Deactivate the employee instead of deleting the profile.');
    }
    const rows = await tx<Row[]>`SELECT id, entity_name, organization_id, data FROM entity_records WHERE organization_id IS NOT DISTINCT FROM ${parent.organization_id}`;
    assertIndependentDeletion(parent, rows);
    await tx`DELETE FROM entity_records WHERE id=${id} AND entity_name=${name} AND organization_id IS NOT DISTINCT FROM ${parent.organization_id}`;
    await tx`INSERT INTO audit_events(id,user_id,action,target_table,record_id,old_values,ip_address) VALUES(${crypto.randomUUID()},${user.id},'delete',${name},${id},${tx.json(parent.data)},${ip})`;
    return { success: true };
  });
}
