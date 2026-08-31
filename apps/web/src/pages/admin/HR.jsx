import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2, CalendarDays, ChevronRight, Download, IdCard, Loader2,
  Mail, Maximize2, MoreHorizontal, Network, Pencil, Plus, ShieldCheck, UserPlus, UserRoundCog, Users,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import PageHeader from '@/components/shared/PageHeader';
import PageSkeleton from '@/components/shared/PageSkeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import BrandLogo from '@/components/shared/BrandLogo';
import { formatDate } from '@/components/shared/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ADMIN_PAGE_ACCESS, ROLE_PAGE_DEFAULTS, canManageHumanResources } from '@/lib/access-control';
import { subscribeToDataChanges } from '@/lib/data-sync';

const STAFF_ROLES = [
  ['admin', 'Administrator'], ['farm_manager', 'Farm Manager'], ['farm_supervisor', 'Farm Supervisor'],
  ['inventory_officer', 'Inventory Officer'], ['quality_officer', 'Quality Officer'], ['finance_officer', 'Finance Officer'],
  ['hr_officer', 'HR Officer'], ['sales_officer', 'Sales Officer'], ['logistics_officer', 'Logistics Officer'],
  ['content_editor', 'Content Editor'], ['auditor', 'Auditor'],
];

const employmentTypes = [
  ['full_time', 'Full-time'], ['part_time', 'Part-time'], ['contract', 'Contract'], ['seasonal', 'Seasonal'],
];

const localDateTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const nameOf = (employee) => employee?.full_name || `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || 'Unnamed employee';
const accessOf = (value, role) => {
  const explicit = value?.pageAccess ?? value?.page_access;
  return Array.isArray(explicit) ? explicit : ROLE_PAGE_DEFAULTS[role] || ['dashboard'];
};
const roleLabel = (role) => STAFF_ROLES.find(([value]) => value === role)?.[1] || String(role || 'Not assigned').replaceAll('_', ' ');

function Metric({ icon: Icon, value, label, tone }) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3"><Icon className={`h-6 w-6 ${tone}`} /><strong className="font-heading text-2xl">{value}</strong></div>
      <p className="ml-9 mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

const ATTENDANCE_STATUS = {
  present: { label: 'Present', color: '#2e7d32', soft: '#edf8ef' },
  absent: { label: 'Absent', color: '#d64545', soft: '#fff1f0' },
  late: { label: 'Late', color: '#e0a800', soft: '#fff9e6' },
  leave: { label: 'On Leave', color: '#2196c9', soft: '#eff9fd' },
};

const attendanceStatus = (value) => {
  const status = String(value || 'present').toLowerCase().replaceAll(' ', '_');
  if (['leave', 'on_leave', 'holiday'].includes(status)) return 'leave';
  if (status === 'half_day') return 'late';
  return ATTENDANCE_STATUS[status] ? status : 'present';
};

const recordDate = (record) => {
  const value = record?.attendance_date || record?.created_date || record?.created_at;
  if (!value) return null;
  const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const displayTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return String(value);
};

const percent = (value, total) => total ? Math.round((value / total) * 100) : 0;
const employeeInitials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

const ATTENDANCE_PERIODS = [
  ['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year'], ['custom', 'Custom'],
];

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const dateFromInput = (value, end = false) => {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : end ? endOfDay(date) : startOfDay(date);
};

function AttendancePeriodControls({ period, onPeriodChange, customStart, customEnd, onCustomStartChange, onCustomEndChange, idPrefix = 'attendance-trend', className = '' }) {
  const todayKey = dateKey(new Date());
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="inline-flex flex-wrap rounded-lg bg-muted p-1" aria-label="Attendance trend period">
        {ATTENDANCE_PERIODS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onPeriodChange(value)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${period === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            aria-pressed={period === value}
          >
            {label}
          </button>
        ))}
      </div>
      {period === 'custom' ? (
        <div className="flex flex-wrap items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
          <label className="sr-only" htmlFor={`${idPrefix}-start`}>Start date</label>
          <Input id={`${idPrefix}-start`} type="date" value={customStart} max={customEnd || todayKey} onChange={(event) => onCustomStartChange(event.target.value)} className="h-8 w-[136px] px-2 text-xs" />
          <span className="text-xs text-muted-foreground">to</span>
          <label className="sr-only" htmlFor={`${idPrefix}-end`}>End date</label>
          <Input id={`${idPrefix}-end`} type="date" value={customEnd} min={customStart || undefined} max={todayKey} onChange={(event) => onCustomEndChange(event.target.value)} className="h-8 w-[136px] px-2 text-xs" />
        </div>
      ) : null}
    </div>
  );
}

function AttendanceTrendChart({ data, expanded = false }) {
  const fillId = expanded ? 'attendanceTrendFillExpanded' : 'attendanceTrendFill';
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: expanded ? 22 : 10, left: expanded ? 0 : -20, bottom: expanded && data.length > 12 ? 36 : 0 }}>
        <defs><linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2e7d32" stopOpacity={0.18} /><stop offset="100%" stopColor="#2e7d32" stopOpacity={0.01} /></linearGradient></defs>
        <CartesianGrid stroke="#e7ece8" vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: expanded ? 11 : 10, fill: '#607067' }} minTickGap={expanded ? 0 : 20} interval={expanded ? 0 : 'preserveStartEnd'} angle={expanded && data.length > 12 ? -35 : 0} textAnchor={expanded && data.length > 12 ? 'end' : 'middle'} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: expanded ? 11 : 10, fill: '#607067' }} />
        <Tooltip contentStyle={{ borderColor: '#e7ece8', borderRadius: 8, fontSize: 12 }} labelStyle={{ fontWeight: 600 }} />
        <Area type="monotone" dataKey="present" name="Present or late" stroke="#2e7d32" fill={`url(#${fillId})`} strokeWidth={2} dot={expanded || data.length === 1 ? { r: 2.5, fill: '#2e7d32' } : false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function AttendancePanel({ title, action, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-border bg-card shadow-sm ${className}`}>
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function AttendanceDashboard({ attendance, employees, departments }) {
  const [period, setPeriod] = useState('week');
  const [trendExpanded, setTrendExpanded] = useState(false);
  const [overviewDateOpen, setOverviewDateOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
  const [customStart, setCustomStart] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return dateKey(date);
  });
  const [customEnd, setCustomEnd] = useState(() => dateKey(new Date()));
  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);
  const today = useMemo(() => { const date = new Date(); date.setHours(23, 59, 59, 999); return date; }, []);
  const { startDate, endDate } = useMemo(() => {
    let start = startOfDay(today);
    let end = today;
    if (period === 'day') {
      const day = dateFromInput(selectedDay);
      start = day || start;
      end = day ? endOfDay(day) : end;
    }
    if (period === 'week') start.setDate(start.getDate() - 6);
    if (period === 'month') start.setDate(1);
    if (period === 'year') start.setMonth(0, 1);
    if (period === 'custom') {
      const selectedStart = dateFromInput(customStart);
      const selectedEnd = dateFromInput(customEnd, true);
      start = selectedStart || start;
      end = selectedEnd && selectedEnd < today ? selectedEnd : today;
      if (start > end) start = startOfDay(end);
    }
    return { startDate: start, endDate: end };
  }, [customEnd, customStart, period, selectedDay, today]);

  const filtered = useMemo(() => attendance
    .filter((record) => {
      const date = recordDate(record);
      return date && date >= startDate && date <= endDate;
    })
    .sort((left, right) => (recordDate(right)?.getTime() || 0) - (recordDate(left)?.getTime() || 0)), [attendance, endDate, startDate]);

  const counts = useMemo(() => filtered.reduce((result, record) => {
    result[attendanceStatus(record.status)] += 1;
    return result;
  }, { present: 0, absent: 0, late: 0, leave: 0 }), [filtered]);

  const trendData = useMemo(() => {
    const spanDays = Math.round((endDate - startDate) / 86400000) + 1;
    const aggregateByMonth = period === 'year' || spanDays > 92;
    const buckets = [];
    const cursor = new Date(startDate);
    if (aggregateByMonth) cursor.setDate(1);
    while (cursor <= endDate) {
      const bucketStart = new Date(cursor);
      const bucketEnd = aggregateByMonth ? endOfDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)) : endOfDay(cursor);
      const rows = filtered.filter((record) => {
        const date = recordDate(record);
        return date && date >= bucketStart && date <= bucketEnd;
      });
      buckets.push({
        key: aggregateByMonth ? `${cursor.getFullYear()}-${cursor.getMonth() + 1}` : dateKey(cursor),
        label: cursor.toLocaleDateString('en-US', aggregateByMonth ? { month: 'short', ...(startDate.getFullYear() !== endDate.getFullYear() ? { year: '2-digit' } : {}) } : { month: 'short', day: 'numeric' }),
        present: rows.filter((record) => ['present', 'late'].includes(attendanceStatus(record.status))).length,
        absent: rows.filter((record) => attendanceStatus(record.status) === 'absent').length,
        late: rows.filter((record) => attendanceStatus(record.status) === 'late').length,
        leave: rows.filter((record) => attendanceStatus(record.status) === 'leave').length,
      });
      if (aggregateByMonth) cursor.setMonth(cursor.getMonth() + 1);
      else cursor.setDate(cursor.getDate() + 1);
    }
    return buckets;
  }, [endDate, filtered, period, startDate]);

  const mainDepartments = departments.filter((department) => !department.parent_department_id);
  const departmentAttendance = useMemo(() => mainDepartments.map((department) => {
    const staffIds = new Set(employees.filter((employee) => employee.department_id === department.id || employee.department_name === department.name || employee.department === department.name).map((employee) => employee.id));
    const rows = filtered.filter((record) => staffIds.has(record.employee_id) || record.department_id === department.id || record.department_name === department.name || record.department === department.name);
    const attended = rows.filter((record) => ['present', 'late'].includes(attendanceStatus(record.status))).length;
    return { id: department.id, name: department.name, rate: percent(attended, rows.length), records: rows.length };
  }).sort((left, right) => right.rate - left.rate).slice(0, 6), [employees, filtered, mainDepartments]);

  const upcomingLeaves = useMemo(() => {
    const rows = attendance.filter((record) => attendanceStatus(record.status) === 'leave' && recordDate(record) && recordDate(record) > today);
    const groups = new Map();
    rows.forEach((record) => {
      const employee = employeeById.get(record.employee_id);
      const name = record.employee_name || nameOf(employee);
      const key = record.employee_id || name;
      const existing = groups.get(key) || { key, name, dates: [], type: record.notes || 'Scheduled leave' };
      existing.dates.push(recordDate(record));
      groups.set(key, existing);
    });
    return [...groups.values()].map((leave) => ({ ...leave, dates: leave.dates.sort((a, b) => a - b) })).sort((a, b) => a.dates[0] - b.dates[0]).slice(0, 3);
  }, [attendance, employeeById, today]);

  const statusData = Object.entries(ATTENDANCE_STATUS).map(([key, config]) => ({ key, name: config.label, value: counts[key], color: config.color }));
  const dateLabel = period === 'day'
    ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        <AttendancePanel
          title="Attendance Overview"
          action={(
            <Popover open={overviewDateOpen} onOpenChange={setOverviewDateOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" aria-label={`Choose attendance overview date. Currently showing ${dateLabel}`}>
                  <span>{dateLabel}</span><CalendarDays className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="attendance-overview-date" className="text-sm font-semibold">View attendance for</Label>
                    <p className="mt-1 text-xs text-muted-foreground">Choose a date to update the complete overview.</p>
                  </div>
                  <Input
                    id="attendance-overview-date"
                    type="date"
                    value={selectedDay}
                    max={dateKey(today)}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      setSelectedDay(event.target.value);
                      setPeriod('day');
                      setOverviewDateOpen(false);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedDay(dateKey(today));
                      setPeriod('day');
                      setOverviewDateOpen(false);
                    }}
                  >
                    View today
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        >
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(ATTENDANCE_STATUS).map(([key, config]) => (
              <div key={key} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">{config.label}</p>
                <p className="mt-1 text-2xl font-semibold" style={{ color: config.color }}>{counts[key]}</p>
                <p className="mt-1 text-xs font-medium">{percent(counts[key], filtered.length)}%</p>
                <div className="mt-2 h-9" style={{ backgroundColor: config.soft }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
                      <Area type="monotone" dataKey={key} stroke={config.color} fill={config.color} fillOpacity={0.08} strokeWidth={1.5} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
          <div className="mx-4 mb-4 rounded-lg border border-border">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h4 className="text-sm font-semibold">Attendance Trend</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">{dateLabel}</p>
              </div>
              <AttendancePeriodControls period={period} onPeriodChange={setPeriod} customStart={customStart} customEnd={customEnd} onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd} />
            </div>
            <div
              className="group relative h-56 cursor-zoom-in p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
              role="button"
              tabIndex={0}
              aria-label="Open full attendance trend"
              onClick={() => setTrendExpanded(true)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setTrendExpanded(true); } }}
            >
              <AttendanceTrendChart data={trendData} />
              <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-background/95 px-2 py-1 text-[11px] font-medium text-muted-foreground opacity-100 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100"><Maximize2 className="h-3 w-3" /> Full view</span>
            </div>
          </div>
        </AttendancePanel>

        <Dialog open={trendExpanded} onOpenChange={setTrendExpanded}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-6xl gap-0 p-0 sm:rounded-xl">
            <DialogHeader className="border-b border-border px-6 py-5 pr-14">
              <DialogTitle>Attendance Trend</DialogTitle>
              <DialogDescription>{dateLabel} · {filtered.length} attendance records</DialogDescription>
            </DialogHeader>
            <div className="border-b border-border px-6 py-3">
              <AttendancePeriodControls period={period} onPeriodChange={setPeriod} customStart={customStart} customEnd={customEnd} onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd} idPrefix="attendance-trend-expanded" />
            </div>
            <div className="h-[min(62vh,560px)] min-h-[320px] px-4 py-5 sm:px-6">
              <AttendanceTrendChart data={trendData} expanded />
            </div>
            <DialogFooter className="border-t border-border px-6 py-4">
              <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <AttendancePanel title="Department Attendance" action={<span className="text-xs font-medium text-[#176e94]">Live totals</span>}>
            <div className="space-y-4 p-4">
              {departmentAttendance.length ? departmentAttendance.map((department, index) => {
                const color = index < 2 ? '#2e7d32' : index < 4 ? '#2196c9' : '#d4a017';
                return <div key={department.id}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate">{department.name}</span><strong>{department.rate}%</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all" style={{ width: `${department.rate}%`, backgroundColor: color }} /></div></div>;
              }) : <p className="py-8 text-center text-sm text-muted-foreground">Department attendance will appear as records are generated.</p>}
            </div>
          </AttendancePanel>

          <AttendancePanel title="Upcoming Leaves" action={<span className="text-xs font-medium text-[#176e94]">Scheduled</span>}>
            <div className="divide-y divide-border px-4">
              {upcomingLeaves.length ? upcomingLeaves.map((leave, index) => {
                const colors = ['#2e7d32', '#d4a017', '#2196c9'];
                const first = leave.dates[0]; const last = leave.dates[leave.dates.length - 1];
                const rangeLabel = first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + (dateKey(first) !== dateKey(last) ? ` – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : `, ${first.getFullYear()}`);
                return <div key={leave.key} className="flex items-center gap-3 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: colors[index % colors.length] }}>{employeeInitials(leave.name)}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{leave.name}</strong><span className="block text-xs text-muted-foreground">{rangeLabel}</span></span><span className="max-w-28 truncate rounded-md border border-border px-2 py-1 text-[10px] font-medium text-[#176e94]">{leave.type}</span></div>;
              }) : <p className="py-8 text-center text-sm text-muted-foreground">No upcoming leave is scheduled.</p>}
            </div>
          </AttendancePanel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.75fr)]">
        <AttendancePanel title="Recent Attendance Records" action={<span className="text-xs text-muted-foreground">{filtered.length} records</span>}>
          {filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-xs"><thead className="bg-muted/50 text-muted-foreground"><tr><th className="px-4 py-3 text-left font-medium">Employee</th><th className="px-4 py-3 text-left font-medium">Department</th><th className="px-4 py-3 text-left font-medium">Date</th><th className="px-4 py-3 text-left font-medium">Check In</th><th className="px-4 py-3 text-left font-medium">Check Out</th><th className="px-4 py-3 text-left font-medium">Status</th><th className="w-10 px-2 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-border">{filtered.slice(0, 8).map((record, index) => {
            const employee = employeeById.get(record.employee_id); const department = record.department_name || record.department || employee?.department_name || employee?.department || 'Not assigned';
            return <tr key={record.id || `${record.employee_id}-${record.attendance_date}-${index}`} className="hover:bg-muted/25"><td className="px-4 py-3 font-medium">{record.employee_name || nameOf(employee)}</td><td className="px-4 py-3 text-muted-foreground">{department}</td><td className="px-4 py-3">{formatDate(record.attendance_date)}</td><td className="px-4 py-3">{displayTime(record.check_in_at)}</td><td className="px-4 py-3">{displayTime(record.check_out_at)}</td><td className="px-4 py-3"><StatusBadge status={attendanceStatus(record.status)} /></td><td className="px-2 py-3 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></td></tr>;
          })}</tbody></table></div> : <p className="px-4 py-12 text-center text-sm text-muted-foreground">Attendance records will appear here as staff activity is generated.</p>}
        </AttendancePanel>

        <AttendancePanel title="Attendance by Status">
          <div className="grid min-h-64 items-center gap-2 p-4 sm:grid-cols-[minmax(140px,1fr)_minmax(130px,0.9fr)] xl:grid-cols-1 2xl:grid-cols-[minmax(140px,1fr)_minmax(130px,0.9fr)]">
            <div className="h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={filtered.length ? 1 : 0} stroke="none">{statusData.map((entry) => <Cell key={entry.key} fill={entry.value ? entry.color : '#e7ece8'} />)}</Pie><Tooltip contentStyle={{ borderColor: '#e7ece8', borderRadius: 8, fontSize: 12 }} /></PieChart></ResponsiveContainer></div>
            <div className="space-y-3">{statusData.map((item) => <div key={item.key} className="flex items-center gap-2 text-xs"><span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} /><span className="min-w-0 flex-1 truncate">{item.name}</span><strong className="tabular-nums">{item.value}</strong><span className="text-muted-foreground">({percent(item.value, filtered.length)}%)</span></div>)}</div>
          </div>
        </AttendancePanel>
      </div>
    </div>
  );
}

function PageAccessGrid({ selected, onChange, disabled = false }) {
  const groups = useMemo(() => ADMIN_PAGE_ACCESS.reduce((result, page) => {
    result[page.group] = [...(result[page.group] || []), page];
    return result;
  }, {}), []);
  const toggle = (key, checked) => onChange(checked ? [...new Set([...selected, key])] : selected.filter((item) => item !== key));

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([group, pages]) => (
        <div key={group}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {pages.map((page) => (
              <label key={page.key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                <span className="text-sm font-medium">{page.label}</span>
                <Switch checked={selected.includes(page.key)} onCheckedChange={(checked) => toggle(page.key, checked)} disabled={disabled} aria-label={`${page.label} access`} />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DepartmentDialog({ departments, parentId = '', trigger, onSaved }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parent, setParent] = useState(parentId);

  useEffect(() => { if (open) setParent(parentId); }, [open, parentId]);
  const mainDepartments = departments.filter((item) => !item.parent_department_id);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Department.create({
        name: name.trim(), code: code.trim().toUpperCase(), parent_department_id: parent || '', status: 'active',
      });
      toast({ title: parent ? 'Sub-department created' : 'Department created' });
      setName(''); setCode(''); setOpen(false); await onSaved();
    } catch (error) {
      toast({ title: 'Department could not be created', description: error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{parent ? 'Add sub-department' : 'Add department'}</DialogTitle><DialogDescription>Create a main department or place a sub-department beneath an existing one.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div><Label htmlFor="department-name">Name</Label><Input id="department-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} /></div>
          <div><Label htmlFor="department-code">Code</Label><Input id="department-code" value={code} onChange={(event) => setCode(event.target.value.replace(/[^a-zA-Z0-9-]/g, ''))} required maxLength={16} placeholder="e.g. HR or FARM-OPS" /></div>
          <div><Label>Main department</Label><Select value={parent || 'main'} onValueChange={(value) => setParent(value === 'main' ? '' : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="main">Create as main department</SelectItem>{mainDepartments.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
          <DialogFooter><Button type="submit" disabled={saving || !name.trim() || !code.trim()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeDialog({ employee, employees, departments, currentUser, trigger, onSaved }) {
  const { toast } = useToast();
  const editing = Boolean(employee);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState(null);
  const initialRole = employee?.workspace_role || 'farm_supervisor';
  const [form, setForm] = useState({});
  const [pageAccess, setPageAccess] = useState(accessOf(employee, initialRole));

  const reset = () => {
    const role = employee?.workspace_role || 'farm_supervisor';
    setForm({
      first_name: employee?.first_name || '', last_name: employee?.last_name || '', email: employee?.email || '', phone: employee?.phone || '',
      job_title: employee?.job_title || '', joining_at: employee?.joining_at?.slice(0, 16) || localDateTime(), employment_type: employee?.employment_type || 'full_time',
      department_id: employee?.department_id || '', sub_department_id: employee?.sub_department_id || '', reports_to_employee_id: employee?.reports_to_employee_id || '',
      workspace_role: role, status: employee?.status || 'active',
    });
    setPageAccess(accessOf(employee, role)); setPhoto(null);
  };
  useEffect(() => { if (open) reset(); }, [open, employee]);

  const mainDepartments = departments.filter((item) => !item.parent_department_id);
  const subDepartments = departments.filter((item) => item.parent_department_id === form.department_id);
  const roleOptions = STAFF_ROLES.filter(([role]) => currentUser?.role === 'super_admin' || role !== 'admin');
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const changeRole = (role) => { update('workspace_role', role); setPageAccess(ROLE_PAGE_DEFAULTS[role] || ['dashboard']); };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const department = departments.find((item) => item.id === form.department_id);
    const subDepartment = departments.find((item) => item.id === form.sub_department_id);
    const manager = employees.find((item) => item.id === form.reports_to_employee_id);
    const payload = {
      ...form,
      full_name: `${form.first_name} ${form.last_name}`.trim(),
      email: form.email.trim().toLowerCase(),
      hire_date: form.joining_at.slice(0, 10),
      department: department?.name || '', department_name: department?.name || '',
      sub_department: subDepartment?.name || '', sub_department_name: subDepartment?.name || '',
      reports_to_name: nameOf(manager), page_access: pageAccess,
    };
    if (!manager) payload.reports_to_name = '';
    try {
      let saved = editing ? await base44.entities.Employee.update(employee.id, payload) : await base44.entities.Employee.create(payload);
      if (photo) {
        const uploaded = await base44.files.upload(photo, saved.id);
        saved = await base44.entities.Employee.update(saved.id, { photo_file_id: uploaded.id, photo_url: uploaded.url.startsWith('blob:') ? uploaded.url : `${uploaded.url}?preview=1` });
      }
      if (!editing) {
        try {
          await base44.staff.invite({ fullName: payload.full_name, email: payload.email, role: payload.workspace_role, pageAccess, employeeId: saved.id });
        } catch (inviteError) {
          await base44.entities.Employee.update(saved.id, { invitation_status: 'attention' }).catch(() => {});
          toast({ title: `Employee ${saved.employee_code} created`, description: `The staff record and pass were created, but the Google invitation needs attention: ${inviteError.message}`, variant: 'destructive' });
          setOpen(false); await onSaved(); return;
        }
      }
      toast({ title: editing ? 'Employee updated' : `Employee ${saved.employee_code} onboarded` });
      setOpen(false); await onSaved();
    } catch (error) {
      toast({ title: editing ? 'Employee could not be updated' : 'Employee could not be onboarded', description: error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{editing ? 'Edit employee' : 'Onboard employee'}</DialogTitle><DialogDescription>{editing ? 'Update the employee’s organization and staff-pass details.' : 'Creates the employee record, automatic staff ID, staff pass, and Google workspace invitation.'}</DialogDescription></DialogHeader>
        <form onSubmit={save} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>First name</Label><Input value={form.first_name || ''} onChange={(event) => update('first_name', event.target.value)} required /></div>
            <div><Label>Last name</Label><Input value={form.last_name || ''} onChange={(event) => update('last_name', event.target.value)} required /></div>
            <div><Label>Google email</Label><Input type="email" value={form.email || ''} onChange={(event) => update('email', event.target.value)} required disabled={editing && Boolean(employee?.user_id)} /></div>
            <div><Label>Phone</Label><Input value={form.phone || ''} onChange={(event) => update('phone', event.target.value)} /></div>
            <div><Label>Job title</Label><Input value={form.job_title || ''} onChange={(event) => update('job_title', event.target.value)} required /></div>
            <div><Label>Joining date and time</Label><Input type="datetime-local" value={form.joining_at || ''} onChange={(event) => update('joining_at', event.target.value)} required disabled={editing} /></div>
            <div><Label>Main department</Label><Select value={form.department_id || ''} onValueChange={(value) => setForm((current) => ({ ...current, department_id: value, sub_department_id: '' }))}><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{mainDepartments.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Sub-department</Label><Select value={form.sub_department_id || 'none'} onValueChange={(value) => update('sub_department_id', value === 'none' ? '' : value)} disabled={!form.department_id}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="none">No sub-department</SelectItem>{subDepartments.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Reports to</Label><Select value={form.reports_to_employee_id || 'none'} onValueChange={(value) => update('reports_to_employee_id', value === 'none' ? '' : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No manager / top level</SelectItem>{employees.filter((item) => item.id !== employee?.id).map((item) => <SelectItem key={item.id} value={item.id}>{nameOf(item)} · {item.job_title || item.employee_code}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Employment type</Label><Select value={form.employment_type || 'full_time'} onValueChange={(value) => update('employment_type', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{employmentTypes.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Workspace role</Label><Select value={form.workspace_role || 'farm_supervisor'} onValueChange={changeRole} disabled={editing}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roleOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Staff photo</Label><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)} /></div>
          </div>
          {!editing && <div><div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-semibold">Page access</p><p className="text-xs text-muted-foreground">A page switched off will be hidden and blocked for this staff account.</p></div><span className="text-xs text-muted-foreground">{pageAccess.length} enabled</span></div><PageAccessGrid selected={pageAccess} onChange={setPageAccess} /></div>}
          <DialogFooter><Button type="submit" disabled={saving || !form.department_id}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{editing ? 'Save changes' : 'Create employee and invite'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccessDialog({ profile, currentUser, trigger, onSaved }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialRole = profile.account?.role || profile.invitation?.role || profile.employee.workspace_role || 'farm_supervisor';
  const [role, setRole] = useState(initialRole);
  const [status, setStatus] = useState(profile.account?.status || 'active');
  const [pageAccess, setPageAccess] = useState(accessOf(profile.account || profile.invitation || profile.employee, initialRole));
  useEffect(() => {
    if (!open) return;
    const nextRole = profile.account?.role || profile.invitation?.role || profile.employee.workspace_role || 'farm_supervisor';
    setRole(nextRole); setStatus(profile.account?.status || 'active'); setPageAccess(accessOf(profile.account || profile.invitation || profile.employee, nextRole));
  }, [open, profile]);
  const roleOptions = STAFF_ROLES.filter(([value]) => currentUser?.role === 'super_admin' || value !== 'admin');
  const changeRole = (value) => { setRole(value); setPageAccess(ROLE_PAGE_DEFAULTS[value] || ['dashboard']); };
  const save = async () => {
    setSaving(true);
    try {
      if (profile.account) await base44.staff.updateUser(profile.account.id, { role, pageAccess, status });
      else if (profile.invitation) await base44.staff.updateInvitation(profile.invitation.id, { role, pageAccess });
      else await base44.staff.invite({ fullName: nameOf(profile.employee), email: profile.employee.email, role, pageAccess, employeeId: profile.employee.id });
      toast({ title: profile.account ? 'Staff access updated' : profile.invitation ? 'Pending invitation updated' : 'Google invitation sent' });
      setOpen(false); await onSaved();
    } catch (error) {
      toast({ title: 'Staff access could not be saved', description: error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>Access for {nameOf(profile.employee)}</DialogTitle><DialogDescription>{profile.account ? 'Changes apply to the staff member’s next page request.' : profile.invitation ? 'These settings will apply when the Google invitation is accepted.' : 'Send the employee’s Google invitation with the selected access.'}</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2"><div><Label>Workspace role</Label><Select value={role} onValueChange={changeRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roleOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>{profile.account && <div><Label>Account status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>}</div>
        <PageAccessGrid selected={pageAccess} onChange={setPageAccess} />
        <DialogFooter><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{profile.account || profile.invitation ? 'Save access' : 'Send invitation'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StaffPassDialog({ employee, trigger }) {
  const { toast } = useToast();
  const passRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const exportPass = async () => {
    setExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(passRef.current, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] });
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 85.6, 54);
      doc.save(`${employee.employee_code || 'staff'}-pass.pdf`);
    } catch (error) {
      toast({ title: 'Staff pass could not be downloaded', description: error.message, variant: 'destructive' });
    } finally { setExporting(false); }
  };
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>Staff pass</DialogTitle><DialogDescription>Generated automatically from the employee’s HR record.</DialogDescription></DialogHeader>
        <div ref={passRef} className="relative mx-auto aspect-[1.585/1] w-full max-w-[520px] overflow-hidden rounded-2xl border border-emerald-950/15 bg-white p-6 text-slate-900 shadow-lg">
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-emerald-900 via-emerald-600 to-amber-400" />
          <div className="flex items-start justify-between gap-4"><BrandLogo className="h-12 w-auto" /><div className="text-right"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">Staff Pass</p><p className="mt-1 font-mono text-xs font-bold">{employee.employee_code}</p></div></div>
          <div className="mt-5 flex gap-5">
            <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-emerald-800/20 bg-emerald-50">{employee.photo_url ? <img src={employee.photo_url} alt={nameOf(employee)} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-2xl font-bold text-emerald-800">{(employee.first_name?.[0] || '?')}{employee.last_name?.[0] || ''}</div>}</div>
            <div className="min-w-0 flex-1"><p className="truncate font-heading text-xl font-bold">{nameOf(employee)}</p><p className="mt-1 text-sm font-semibold text-emerald-800">{employee.job_title || roleLabel(employee.workspace_role)}</p><div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]"><div><span className="block uppercase tracking-wide text-slate-500">Department</span><b>{employee.department_name || employee.department || '—'}</b></div><div><span className="block uppercase tracking-wide text-slate-500">Sub-department</span><b>{employee.sub_department_name || '—'}</b></div><div><span className="block uppercase tracking-wide text-slate-500">Joined</span><b>{formatDate(employee.hire_date || employee.joining_at)}</b></div><div><span className="block uppercase tracking-wide text-slate-500">Status</span><b className="capitalize">{employee.status || 'active'}</b></div></div></div>
          </div>
          <div className="absolute inset-x-6 bottom-4 flex items-center justify-between border-t border-slate-200 pt-2 text-[9px] text-slate-500"><span>JBA GreenGold Orchard</span><span>Company property · Return if found</span></div>
        </div>
        <DialogFooter><Button onClick={exportPass} disabled={exporting}><Download className="mr-2 h-4 w-4" />{exporting ? 'Generating…' : 'Download PDF'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HR() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const canManage = canManageHumanResources(user);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [employeeRows, attendanceRows, departmentRows, staffUsers, staffInvites] = await Promise.all([
        base44.entities.Employee.list('-created_date', 250), base44.entities.Attendance.list('-attendance_date', 250),
        base44.entities.Department.list('name', 250), canManage ? base44.staff.listUsers() : Promise.resolve({ users: [] }),
        canManage ? base44.staff.listInvitations() : Promise.resolve({ invitations: [] }),
      ]);
      setEmployees(employeeRows || []); setAttendance(attendanceRows || []); setDepartments(departmentRows || []);
      setAccounts(staffUsers?.users || []); setInvitations(staffInvites?.invitations || []);
    } catch (error) {
      toast({ title: 'HR records could not be loaded', description: error.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    return subscribeToDataChanges(load, ['Employee', 'Attendance', 'Department']);
  }, [canManage]);

  const mainDepartments = departments.filter((item) => !item.parent_department_id);
  const subDepartments = departments.filter((item) => item.parent_department_id);
  const activeInvitations = invitations.filter((item) => !item.accepted_at && !item.revoked_at && new Date(item.expires_at || Date.now() + 1) > new Date());
  const profiles = employees.map((employee) => ({
    employee,
    account: accounts.find((item) => item.email?.toLowerCase() === employee.email?.toLowerCase()),
    invitation: activeInvitations.find((item) => item.email?.toLowerCase() === employee.email?.toLowerCase()),
  }));
  const managerById = new Map(employees.map((employee) => [employee.id, employee]));

  return (
    <div>
      <PageHeader>
        {canManage && <DepartmentDialog departments={departments} onSaved={load} trigger={<Button variant="outline"><Building2 className="mr-2 h-4 w-4" />Add department</Button>} />}
        {canManage && <EmployeeDialog employees={employees} departments={departments} currentUser={user} onSaved={load} trigger={<Button><UserPlus className="mr-2 h-4 w-4" />Onboard employee</Button>} />}
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} value={employees.length} label="Employees" tone="text-primary" />
        <Metric icon={Building2} value={mainDepartments.length} label="Main departments" tone="text-emerald-600" />
        <Metric icon={Network} value={subDepartments.length} label="Sub-departments" tone="text-blue-600" />
        <Metric icon={ShieldCheck} value={employees.filter((employee) => employee.status === 'active').length} label="Active staff" tone="text-violet-600" />
      </div>

      <Tabs defaultValue="staff">
        <TabsList className="h-auto flex-wrap"><TabsTrigger value="staff">Staff</TabsTrigger><TabsTrigger value="departments">Departments</TabsTrigger>{canManage && <TabsTrigger value="access">Access</TabsTrigger>}<TabsTrigger value="attendance">Attendance</TabsTrigger></TabsList>

        <TabsContent value="staff" className="mt-5">
          {loading ? <PageSkeleton contentOnly /> : employees.length ? (
            <div className="divide-y rounded-xl border border-border bg-card">
              {employees.map((employee) => {
                const manager = managerById.get(employee.reports_to_employee_id);
                return <article key={employee.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-primary/10">{employee.photo_url ? <img src={employee.photo_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center font-semibold text-primary">{employee.first_name?.[0] || '?'}{employee.last_name?.[0] || ''}</div>}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{nameOf(employee)}</p><StatusBadge status={employee.status || 'active'} /></div><p className="mt-1 text-sm text-muted-foreground">{employee.job_title || roleLabel(employee.workspace_role)} · {employee.employee_code || 'ID pending'}</p><p className="mt-1 text-xs text-muted-foreground">{employee.department_name || employee.department || 'No department'}{employee.sub_department_name ? ` › ${employee.sub_department_name}` : ''}{manager ? ` · Reports to ${nameOf(manager)}` : ' · Top-level reporting line'}</p></div></div>
                  <div className="flex flex-wrap gap-2">{canManage && <EmployeeDialog employee={employee} employees={employees} departments={departments} currentUser={user} onSaved={load} trigger={<Button size="sm" variant="outline"><Pencil className="mr-2 h-4 w-4" />Edit</Button>} />}<StaffPassDialog employee={employee} trigger={<Button size="sm" variant="outline"><IdCard className="mr-2 h-4 w-4" />Staff pass</Button>} /></div>
                </article>;
              })}
            </div>
          ) : <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">No employees registered.</div>}
        </TabsContent>

        <TabsContent value="departments" className="mt-5">
          {loading ? <PageSkeleton contentOnly /> : mainDepartments.length ? <div className="space-y-4">{mainDepartments.map((department) => {
            const children = departments.filter((item) => item.parent_department_id === department.id);
            const directCount = employees.filter((item) => item.department_id === department.id).length;
            return <section key={department.id} className="rounded-xl border border-border bg-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><p className="font-semibold">{department.name}</p><span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px]">{department.code}</span></div><p className="mt-1 text-xs text-muted-foreground">{directCount} staff · {children.length} sub-departments</p></div>{canManage && <DepartmentDialog departments={departments} parentId={department.id} onSaved={load} trigger={<Button size="sm" variant="outline"><Plus className="mr-2 h-4 w-4" />Add sub-department</Button>} />}</div><div className="divide-y">{children.length ? children.map((child) => <div key={child.id} className="flex items-center gap-3 px-5 py-3 text-sm"><ChevronRight className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{child.name}</span><span className="font-mono text-xs text-muted-foreground">{child.code}</span><span className="ml-auto text-xs text-muted-foreground">{employees.filter((item) => item.sub_department_id === child.id).length} staff</span></div>) : <p className="px-5 py-4 text-sm text-muted-foreground">No sub-departments yet.</p>}</div></section>;
          })}</div> : <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">Create the first main department to begin the organization structure.</div>}
        </TabsContent>

        {canManage && <TabsContent value="access" className="mt-5"><div className="divide-y rounded-xl border border-border bg-card">{profiles.map((profile) => {
          const state = profile.account ? profile.account.status : profile.invitation ? 'invited' : 'not_invited';
          const role = profile.account?.role || profile.invitation?.role || profile.employee.workspace_role;
          const enabled = accessOf(profile.account || profile.invitation || profile.employee, role).length;
          return <div key={profile.employee.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{nameOf(profile.employee)}</p><StatusBadge status={state} /></div><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5" />{profile.employee.email}</p><p className="mt-1 text-xs text-muted-foreground">{roleLabel(role)} · {enabled} pages enabled</p></div><AccessDialog profile={profile} currentUser={user} onSaved={async () => { await load(); if (profile.account?.id === user.id) await checkUserAuth(); }} trigger={<Button size="sm" variant="outline"><UserRoundCog className="mr-2 h-4 w-4" />Manage access</Button>} /></div>;
        })}</div></TabsContent>}

        <TabsContent value="attendance" className="mt-5">{loading ? <PageSkeleton contentOnly /> : <AttendanceDashboard attendance={attendance} employees={employees} departments={departments} />}</TabsContent>
      </Tabs>
    </div>
  );
}
