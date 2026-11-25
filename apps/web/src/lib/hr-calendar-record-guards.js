import { requireNoLinkedRecords } from './record-actions';

export async function guardDepartmentDeletion(api, department) {
  await requireNoLinkedRecords(api, 'Department', [['parent_department_id', department.id]], 'This department has sub-departments. Keep it until those records have been reviewed.');
  await requireNoLinkedRecords(api, 'Employee', [['department_id', department.id], ['sub_department_id', department.id]], 'Staff are assigned to this department. Review their assignments before deleting it.');
}

export async function departmentCorrectionPayload(api, department, payload) {
  const name = String(payload.name || '').trim();
  const code = String(payload.code || '').trim().toUpperCase();
  if (!name || !/^[A-Z0-9-]{1,16}$/.test(code)) throw new Error('Enter a department name and a code of up to 16 letters, numbers or hyphens.');
  const departments = await api.entities.Department.listAll();
  if (departments.some(item => item.id !== department.id && String(item.code || '').toUpperCase() === code)) throw new Error('Another department already uses this code.');
  if (name !== department.name) {
    const employees = await api.entities.Employee.listAll();
    if (employees.some(employee => !employee.department_id && [employee.department, employee.department_name].includes(department.name)
      || !employee.sub_department_id && [employee.sub_department, employee.sub_department_name].includes(department.name))) {
      throw new Error('Some employees are linked by this department name only. Save their department assignments in Staff before renaming it.');
    }
  }
  return { name, code, status: payload.status === 'inactive' ? 'inactive' : 'active' };
}

export async function guardEmployeeDeletion(api, employee) {
  if (employee.account_only || employee.user_id) throw new Error('This employee has a staff account. Use staff deactivation to preserve account history.');
  const directory = await api.staff.directory();
  if ((directory.users || []).some(user => user.id === employee.user_id || (employee.email && user.email?.toLowerCase() === employee.email.toLowerCase()))) {
    throw new Error('This employee has a staff account. Use staff deactivation to preserve account history.');
  }
  await requireNoLinkedRecords(api, 'Attendance', [['employee_id', employee.id]], 'Attendance history exists for this employee. Deactivate the employee instead of deleting the history.');
  await requireNoLinkedRecords(api, 'Employee', [['reports_to_employee_id', employee.id]], 'Other employees report to this employee. Review their reporting lines first.');
}

export const isSourceOwnedCalendarEvent = event => Boolean(event?.source_entity || event?.outlook || event?.outlook_event_id || event?.external_event_id || event?.external_id || event?.preview);

export async function guardCalendarEventDeletion(api, event) {
  if (isSourceOwnedCalendarEvent(event)) throw new Error('This calendar item belongs to its original source. Correct it on the source page.');
  if (event.harvest_period_id) throw new Error('This activity belongs to a harvest period. Cancel the activity to preserve the harvest link.');
  for (const entity of ['FarmTask', 'DailyActivity']) {
    await requireNoLinkedRecords(api, entity, [['calendar_event_id', event.id]], 'This event has linked task or Daily Task Log records. Cancel the activity to preserve those records and their links.');
  }
}
