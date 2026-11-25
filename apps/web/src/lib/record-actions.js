import { canAccessWorkspaceEntity } from '../../../../packages/authorization/src/page-access';

export function canCorrectEntity(user, entity) {
  if (['Department', 'Employee'].includes(entity)) {
    return ['super_admin', 'hr_officer'].includes(user?.role) && canAccessWorkspaceEntity(user, entity, true);
  }
  return canAccessWorkspaceEntity(user, entity, true);
}

export function recordLabel(record) {
  return String(record?.payment_reference || record?.invoice_number || record?.order_number || record?.po_number
    || record?.export_code || record?.delivery_code || record?.certificate_number || record?.equipment_code
    || record?.code || record?.title || record?.name || record?.product_name || record?.candidate_name
    || [record?.first_name, record?.last_name].filter(Boolean).join(' ') || record?.id || 'record');
}

export function editRecordValues(record, fields) {
  return Object.fromEntries(fields.map(field => {
    let value = record?.[field.name] ?? field.defaultValue ?? '';
    if (field.type === 'date') value = String(value).slice(0, 10);
    if (field.type === 'datetime-local') value = String(value).slice(0, 16);
    return [field.name, value];
  }));
}

// Guard shared parent records without deleting or reassigning their dependants.
export async function requireNoLinkedRecords(api, entity, references, message) {
  const records = await api.entities[entity].listAll();
  if (records.some(record => references.some(([key, value]) => value != null && value !== '' && String(record[key]) === String(value)))) {
    throw new Error(message);
  }
}
