import React, { useEffect, useState } from 'react';
import { Users, Briefcase } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/components/shared/format';
import DataTable from '@/components/shared/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminCreateDialog from '@/components/admin/AdminCreateDialog';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const staffAccessFields = [
  { name: 'fullName', label: 'Full Name', required: true },
  { name: 'email', label: 'Google Email', type: 'email', required: true },
  {
    name: 'role', label: 'Workspace Role', type: 'select', defaultValue: 'farm_supervisor', required: true,
    options: [
      { value: 'admin', label: 'Administrator' },
      { value: 'farm_manager', label: 'Farm Manager' },
      { value: 'farm_supervisor', label: 'Farm Supervisor' },
      { value: 'inventory_officer', label: 'Inventory Officer' },
      { value: 'quality_officer', label: 'Quality Officer' },
      { value: 'finance_officer', label: 'Finance Officer' },
      { value: 'hr_officer', label: 'HR Officer' },
      { value: 'sales_officer', label: 'Sales Officer' },
      { value: 'logistics_officer', label: 'Logistics Officer' },
      { value: 'content_editor', label: 'Content Editor' },
      { value: 'auditor', label: 'Auditor' },
    ],
  },
];

const employeeFields = [
  { name: 'first_name', label: 'First Name', required: true },
  { name: 'last_name', label: 'Last Name', required: true },
  { name: 'job_title', label: 'Job Title', required: true },
  { name: 'department', label: 'Department', required: true },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone' },
  { name: 'hire_date', label: 'Hire Date', type: 'date' },
  {
    name: 'employment_type',
    label: 'Employment Type',
    type: 'select',
    defaultValue: 'full_time',
    options: [
      { value: 'full_time', label: 'Full-time' },
      { value: 'part_time', label: 'Part-time' },
      { value: 'contract', label: 'Contract' },
    ],
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    defaultValue: 'active',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'on_leave', label: 'On Leave' },
    ],
  },
];

export default function HR() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Employee.list('-created_date', 100),
      base44.entities.Attendance.list('-attendance_date', 50),
    ]).then(([emps, atts]) => {
      setEmployees(emps || []);
      setAttendance(atts || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createEmployee = (payload) => base44.entities.Employee.create({
    ...payload,
    employee_code: `EMP-${Date.now().toString().slice(-6)}`,
  });
  const canInviteStaff = ['super_admin', 'admin', 'hr_officer'].includes(String(user?.role || '').toLowerCase());

  const departments = {};
  employees.forEach((e) => { departments[e.department] = (departments[e.department] || 0) + 1; });

  return (
    <div>
      <PageHeader title="Human Resources" description="Employee records, departments, attendance, and role management.">
        {canInviteStaff && (
          <AdminCreateDialog
            title="Invite Staff Member"
            description="Send a one-time account setup link to this staff member's Google email."
            buttonLabel="Invite Staff"
            fields={staffAccessFields}
            onCreate={(payload) => base44.staff.invite(payload)}
            submitLabel="Send Invitation"
          />
        )}
        <AdminCreateDialog
          title="Add Employee"
          description="Create a staff record for HR tracking."
          buttonLabel="Add Employee"
          fields={employeeFields}
          onCreate={createEmployee}
          onCreated={load}
          submitLabel="Add Employee"
        />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Users className="h-5 w-5 text-primary" /><p className="mt-2 font-heading text-2xl font-bold">{employees.length}</p><p className="text-xs text-muted-foreground">Total Employees</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Briefcase className="h-5 w-5 text-emerald-500" /><p className="mt-2 font-heading text-2xl font-bold">{Object.keys(departments).length}</p><p className="text-xs text-muted-foreground">Departments</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Users className="h-5 w-5 text-blue-500" /><p className="mt-2 font-heading text-2xl font-bold">{employees.filter((e) => e.status === 'active').length}</p><p className="text-xs text-muted-foreground">Active Staff</p></div>
      </div>

      <Tabs defaultValue="employees">
        <TabsList><TabsTrigger value="employees">Employees</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger></TabsList>

        <TabsContent value="employees" className="mt-4">
          {loading ? <div className="h-64 animate-pulse rounded-xl bg-muted" /> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {employees.length > 0 ? employees.map((e) => (
                <div key={e.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-mango text-white font-semibold">
                      {(e.first_name || '?')[0]}{(e.last_name || '')[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{e.first_name} {e.last_name}</p>
                      <p className="text-xs text-muted-foreground">{e.employee_code}</p>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p>{e.job_title || '—'}</p>
                    <p className="capitalize">{e.department}</p>
                    {e.email && <p className="text-xs">{e.email}</p>}
                    {e.phone && <p className="text-xs">{e.phone}</p>}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                    <span>Hired: {formatDate(e.hire_date)}</span>
                    <span className="capitalize">{e.employment_type}</span>
                  </div>
                </div>
              )) : <div className="col-span-full text-center py-12 text-muted-foreground">No employees registered.</div>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          {loading ? <div className="h-64 animate-pulse rounded-xl bg-muted" /> : (
            <DataTable items={attendance} columns={[
              { key: 'employee_name', label: 'Employee' },
              { key: 'attendance_date', label: 'Date', format: formatDate },
              { key: 'check_in_at', label: 'Check In', format: (v) => v ? new Date(v).toLocaleTimeString() : '—' },
              { key: 'check_out_at', label: 'Check Out', format: (v) => v ? new Date(v).toLocaleTimeString() : '—' },
              { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
            ]} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
