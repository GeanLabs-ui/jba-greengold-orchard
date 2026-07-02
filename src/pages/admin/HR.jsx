import React, { useEffect, useState } from 'react';
import { Plus, Users, Calendar, Briefcase } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/components/shared/format';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/shared/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';

export default function HR() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Employee.list('-created_date', 100),
      base44.entities.Attendance.list('-attendance_date', 50),
    ]).then(([emps, atts]) => {
      setEmployees(emps || []);
      setAttendance(atts || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const departments = {};
  employees.forEach((e) => { departments[e.department] = (departments[e.department] || 0) + 1; });

  return (
    <div>
      <PageHeader title="Human Resources" description="Employee records, departments, attendance, and role management.">
        <Button className="gradient-mango text-white"><Plus className="mr-2 h-4 w-4" /> Add Employee</Button>
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