import { describe, expect, it, vi } from 'vitest';
import { guardCalendarEventDeletion, guardDepartmentDeletion, guardEmployeeDeletion, isSourceOwnedCalendarEvent, departmentCorrectionPayload } from './hr-calendar-record-guards';

const apiFor = (records = {}, users = []) => ({
  entities: Object.fromEntries(['Department', 'Employee', 'Attendance', 'FarmTask', 'DailyActivity'].map(entity => [entity, { listAll: vi.fn(async () => records[entity] || []) }])),
  staff: { directory: vi.fn(async () => ({ users })) },
});

describe('HR and calendar record deletion safety', () => {
  it('blocks a department with children or either staff assignment field', async () => {
    for (const records of [
      { Department: [{ parent_department_id: 'd' }] },
      { Employee: [{ department_id: 'd' }] },
      { Employee: [{ sub_department_id: 'd' }] },
    ]) await expect(guardDepartmentDeletion(apiFor(records), { id: 'd' })).rejects.toThrow();
    await expect(guardDepartmentDeletion(apiFor(), { id: 'd' })).resolves.toBeUndefined();
  });
  it('blocks account-backed employees even if the local directory linkage is missing', async () => {
    await expect(guardEmployeeDeletion(apiFor(), { id: 'e', user_id: 'u' })).rejects.toThrow('staff account');
    await expect(guardEmployeeDeletion(apiFor({}, [{ id: 'u', email: 'STAFF@example.com' }]), { id: 'e', email: 'staff@example.com' })).rejects.toThrow('staff account');
  });
  it('protects employee attendance and reporting lines while allowing a standalone record', async () => {
    await expect(guardEmployeeDeletion(apiFor({ Attendance: [{ employee_id: 'e' }] }), { id: 'e' })).rejects.toThrow('Attendance');
    await expect(guardEmployeeDeletion(apiFor({ Employee: [{ reports_to_employee_id: 'e' }] }), { id: 'e' })).rejects.toThrow('report');
    await expect(guardEmployeeDeletion(apiFor(), { id: 'e' })).resolves.toBeUndefined();
  });
  it('keeps derived, external, and preview calendar items source-owned', async () => {
    for (const owner of [{ source_entity: 'DailyActivity' }, { outlook: true }, { external_event_id: 'external' }, { preview: true }]) {
      expect(isSourceOwnedCalendarEvent(owner)).toBe(true);
      await expect(guardCalendarEventDeletion(apiFor(), { id: 'event', ...owner })).rejects.toThrow('source');
    }
  });
  it('protects task-log and harvest links and permits only unlinked local events', async () => {
    for (const entity of ['FarmTask', 'DailyActivity']) await expect(guardCalendarEventDeletion(apiFor({ [entity]: [{ calendar_event_id: 'event' }] }), { id: 'event' })).rejects.toThrow('Cancel');
    await expect(guardCalendarEventDeletion(apiFor(), { id: 'event', harvest_period_id: 'h' })).rejects.toThrow('harvest');
    await expect(guardCalendarEventDeletion(apiFor(), { id: 'event' })).resolves.toBeUndefined();
  });
  it('fails closed when dependency reads fail', async () => {
    const api = apiFor();
    api.entities.Employee.listAll.mockRejectedValue(new Error('Access denied'));
    await expect(guardDepartmentDeletion(api, { id: 'd' })).rejects.toThrow('Access denied');
  });
  it('blocks renaming a name-only department assignment until it is linked by ID', async () => {
    const department = { id: 'd', name: 'Operations' };
    const payload = { name: 'Farm Operations', code: ' farm-ops ', status: 'active' };
    await expect(departmentCorrectionPayload(apiFor({ Employee: [{ department_name: 'Operations' }] }), department, payload)).rejects.toThrow('assignments');
    await expect(departmentCorrectionPayload(apiFor({ Employee: [{ department_id: 'd', department_name: 'Operations' }] }), department, payload)).resolves.toEqual({ name: 'Farm Operations', code: 'FARM-OPS', status: 'active' });
    await expect(departmentCorrectionPayload(apiFor({ Department: [{ id: 'other', code: 'FARM-OPS' }] }), department, payload)).rejects.toThrow('already uses');
  });
});
