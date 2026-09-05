import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { farmDailyActivitiesNavigation } from '@/lib/farm-navigation';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCheck2,
  FileText,
  FolderOpen,
  Fuel,
  Leaf,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Scissors,
  Settings,
  Search,
  ShieldCheck,
  Sprout,
  ThermometerSun,
  Trash2,
  Truck,
  Users,
  Warehouse,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import MetricCard from '@/components/shared/MetricCard';
import StatusBadge from '@/components/shared/StatusBadge';
import DataTable from '@/components/shared/DataTable';
import AdminCreateDialog from '@/components/admin/AdminCreateDialog';
import FarmOperationsAnalytics from '@/pages/admin/FarmOperationsAnalytics';
import PageSkeleton from '@/components/shared/PageSkeleton';
import FarmDailyMasterSchedule from '@/pages/admin/FarmDailyMasterSchedule';
import FarmDailyBudgetHarvest from '@/pages/admin/FarmDailyBudgetHarvest';
import HarvestSeasonPlanner from '@/pages/admin/HarvestSeasonPlanner';
import DailyRoutineCheck from '@/pages/admin/DailyRoutineCheck';
import FarmsAdmin from '@/pages/admin/FarmsAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate, formatNumber } from '@/components/shared/format';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';

const today = new Date().toISOString().slice(0, 10);
const shortDate = (value) => String(value || '').slice(0, 10);
const sevenDaysFromToday = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const pageMap = [
  {
    name: 'Daily Activities',
    icon: ClipboardList,
    screens: ['Daily Activity Log', 'Activities List', 'Create Activity', 'Activity Details', 'Edit Activity', 'Activity Calendar View', 'Activity Timeline View', 'Activity Approval Queue', 'Master Schedule', 'Risk Register', 'Farms'],
  },
  {
    name: 'Work Orders',
    icon: ClipboardCheck,
    screens: ['Work Orders List', 'Create Work Order', 'Work Order Details', 'Edit Work Order', 'Scheduled Work Orders', 'Overdue Work Orders', 'Convert Work Order to Activity'],
  },
  {
    name: 'Harvest Operations',
    icon: Scissors,
    screens: ['Harvest Dashboard', 'Daily Harvest Log', 'Create Harvest Entry', 'Harvest Entry Details', 'Harvest by Farm', 'Harvest by Block', 'Harvest by Worker', 'Harvest Batch Details', 'Crate Tracking', 'Truck Loading', 'Budget & Harvest', 'Harvest Seasons'],
  },
  {
    name: 'Labour Management',
    icon: Users,
    screens: ['Labour Dashboard', 'Attendance List', 'Clock In / Clock Out', 'Worker Assignment', 'Worker Productivity', 'Daily Wage Calculation', 'Payroll Sync'],
  },
  {
    name: 'Equipment Management',
    icon: Wrench,
    screens: ['Equipment List', 'Add Equipment', 'Equipment Details', 'Equipment Usage Log', 'Equipment Issue & Return', 'Maintenance Schedule', 'Damaged Equipment Report'],
  },
  {
    name: 'Chemicals & Fertilizers',
    icon: Sprout,
    screens: ['Input Inventory', 'Add Input', 'Input Details', 'Chemical Application Log', 'Fertilizer Application Log', 'Spray Records', 'Expired Inputs', 'Low Stock Inputs'],
  },
  {
    name: 'Inventory Usage',
    icon: Package,
    screens: ['Inventory Usage Dashboard', 'Usage Log', 'Issue Items', 'Return Items', 'Stock Movement', 'Wastage Log'],
  },
  {
    name: 'Quality Control',
    icon: ShieldCheck,
    screens: ['QC Dashboard', 'QC Inspection List', 'Create QC Inspection', 'QC Inspection Details', 'Export Readiness Check', 'Rejected Batch Review'],
  },
  {
    name: 'Waste & Losses',
    icon: XCircle,
    screens: ['Waste Dashboard', 'Waste & Losses List', 'Create Loss Record', 'Loss Record Details', 'Loss Approval Queue'],
  },
  {
    name: 'Weather Log',
    icon: ThermometerSun,
    screens: ['Weather Dashboard', 'Daily Weather Log', 'Create Weather Entry', 'Weather History', 'Spray Weather Risk Alerts'],
  },
  {
    name: 'Farm Expenses',
    icon: Receipt,
    screens: ['Expense Dashboard', 'Expense List', 'Create Expense', 'Expense Details', 'Expense Approval Queue', 'Receipt Uploads'],
  },
  {
    name: 'Daily Supervisor Reports',
    icon: FileText,
    screens: ['Reports Dashboard', 'Daily Reports List', 'Generate Daily Report', 'Report Details', 'Report Approval Queue', 'Export Report'],
  },
  {
    name: 'Farm Analytics',
    icon: BarChart3,
    screens: ['Analytics Overview', 'Harvest Analytics', 'Labour Analytics', 'Equipment Analytics', 'Input Usage Analytics', 'Waste Analytics', 'Cost Analytics', 'Export-Ready Stock Analytics'],
  },
  {
    name: 'Approvals',
    icon: FileCheck2,
    screens: ['Approval Dashboard', 'Activity Approvals', 'Work Order Approvals', 'Expense Approvals', 'QC Approvals', 'Report Approvals'],
  },
  {
    name: 'Documents',
    icon: FolderOpen,
    screens: ['Farm Documents', 'Activity Attachments', 'Harvest Documents', 'Spray Compliance Documents', 'Daily Report PDFs', 'Receipts'],
  },
  {
    name: 'Notifications & Alerts',
    icon: Bell,
    screens: ['Notification Center', 'Alert Rules', 'Low Stock Alerts', 'Equipment Alerts', 'QC Alerts', 'Work Order Alerts', 'Weather Risk Alerts'],
  },
  {
    name: 'Settings',
    icon: Settings,
    screens: ['Farm Operations Settings', 'Activity Categories', 'Work Order Templates', 'Labour Rates', 'Equipment Categories', 'Input Categories', 'Approval Rules', 'Report Templates', 'User Permissions'],
  },
];

const activityCategories = [
  'Land Clearing',
  'Weeding',
  'Pruning',
  'Irrigation',
  'Spraying',
  'Fertilizer Application',
  'Pest Inspection',
  'Disease Inspection',
  'Harvesting',
  'Collection',
  'Sorting',
  'Washing',
  'Packing',
  'Cold Storage Transfer',
  'Loading',
  'Transport to Warehouse',
  'Equipment Maintenance',
  'Fence Repair',
  'Drain Cleaning',
  'Road Maintenance',
  'General Farm Work',
];

const activityStatuses = ['Planned', 'Assigned', 'In Progress', 'Completed', 'Cancelled', 'Delayed', 'Requires Review', 'Approved'];
const workOrderStatuses = ['Draft', 'Scheduled', 'Assigned', 'In Progress', 'Completed', 'Cancelled', 'Overdue', 'Approved'];
const priorities = ['low', 'medium', 'high', 'urgent'];
const equipmentTypes = ['Tractor', 'Sprayer', 'Cutlass', 'Hoe', 'Pruning Shears', 'Crates', 'Wheelbarrow', 'Generator', 'Water Pump', 'Pickup Truck', 'Scale', 'Sorting Table', 'Cold Room Equipment', 'Drone'];
const expenseCategories = ['Labour', 'Fuel', 'Equipment Repair', 'Fertilizer', 'Chemical', 'Transport', 'Food/Meals', 'Packaging', 'Maintenance', 'Security', 'Miscellaneous'];
const activityCostTypes = ['Administration', 'Materials', 'Fuel', 'Labour', 'Food', 'Tools', 'Transport', 'Equipment', 'Inputs', 'Other'];
const lossTypes = ['Rejected Fruit', 'Spoilage', 'Rot', 'Pest Damage', 'Transport Damage', 'Theft', 'Chemical Waste', 'Fuel Loss', 'Equipment Damage', 'Packaging Waste'];

const selectOptions = (values) => values.map((value) => ({ value, label: value }));
const code = (prefix) => `${prefix}-${Date.now().toString().slice(-6)}`;
const asNumber = (value) => Number(value || 0);
const byDate = (dateField) => (item) => shortDate(item[dateField] || item.created_date) === today;

const hoursBetween = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const minutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  return Math.max(0, Math.round((minutes / 60) * 100) / 100);
};

const groupSum = (items, key, valueKey) => (
  Object.values(items.reduce((acc, item) => {
    const group = item[key] || 'Unassigned';
    acc[group] = acc[group] || { name: group, value: 0 };
    acc[group].value += asNumber(item[valueKey]);
    return acc;
  }, {}))
);

const FieldGrid = ({ fields }) => (
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {fields.map(([label, value]) => {
      const semantic = /cost|expense/i.test(label) ? 'text-rose-600' : /yield|harvest/i.test(label) ? 'text-emerald-700' : /revenue|sales/i.test(label) ? 'text-blue-600' : '';
      return <div key={label} className="rounded-lg border border-border bg-card p-3">
        <p className={`text-xs font-medium ${semantic || 'text-muted-foreground'}`}>{label}</p>
        <p className={`mt-1 break-words text-sm font-semibold ${semantic}`}>{value || '—'}</p>
      </div>
    })}
  </div>
);

const Panel = ({ title, description, children, action }) => (
  <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="font-heading text-lg font-bold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const ListPanel = ({ title, items, columns, emptyMessage }) => (
  <Panel title={title}>
    <DataTable items={items} columns={columns} emptyMessage={emptyMessage} />
  </Panel>
);

const Timeline = ({ items }) => (
  <div className="space-y-3">
    {items.map((item) => (
      <div key={item.id} className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[7rem_1fr_auto] md:items-center">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{item.activity_date || item.scheduled_date}</p>
          <p className="text-sm font-semibold">{item.start_time || '—'} - {item.end_time || '—'}</p>
        </div>
        <div>
          <p className="font-semibold">{item.title}</p>
          <p className="text-sm text-muted-foreground">{item.farm_name} • {item.block_name || 'No block'} • {item.supervisor_name || item.supervisor}</p>
        </div>
        <StatusBadge status={String(item.status || '').toLowerCase().replaceAll(' ', '_')} label={item.status} />
      </div>
    ))}
  </div>
);

const emptyColumns = [{ key: 'name', label: 'Record' }];

const activityColumns = [
  { key: 'activity_code', label: 'Activity ID' },
  { key: 'activity_date', label: 'Date', format: formatDate },
  { key: 'farm_name', label: 'Farm' },
  { key: 'block_name', label: 'Block/Field' },
  { key: 'category', label: 'Activity Category' },
  { key: 'supervisor_name', label: 'Supervisor' },
  { key: 'total_hours', label: 'Hours', align: 'right', format: formatNumber },
  { key: 'harvest_quantity', label: 'Harvest kg', align: 'right', format: formatNumber },
  { key: 'cost', label: 'Cost', align: 'right', format: formatCurrency },
  { key: 'status', label: 'Status', render: (value) => <StatusBadge status={String(value).toLowerCase().replaceAll(' ', '_')} label={value} /> },
];

const workOrderColumns = [
  { key: 'work_order_code', label: 'Work Order ID' },
  { key: 'title', label: 'Title' },
  { key: 'farm_name', label: 'Farm' },
  { key: 'block_name', label: 'Block' },
  { key: 'category', label: 'Category' },
  { key: 'scheduled_date', label: 'Scheduled Date', format: formatDate },
  { key: 'estimated_cost', label: 'Estimated Cost', align: 'right', format: formatCurrency },
  { key: 'actual_cost', label: 'Actual Cost', align: 'right', format: formatCurrency },
  { key: 'status', label: 'Status', render: (value) => <StatusBadge status={String(value).toLowerCase().replaceAll(' ', '_')} label={value} /> },
];

const harvestColumns = [
  { key: 'harvest_code', label: 'Harvest ID' },
  { key: 'harvest_date', label: 'Date', format: formatDate },
  { key: 'farm_name', label: 'Farm' },
  { key: 'block_name', label: 'Block' },
  { key: 'team', label: 'Team' },
  { key: 'mango_variety', label: 'Mango Variety' },
  { key: 'quantity_harvested_kg', label: 'Quantity Harvested kg', align: 'right', format: formatNumber },
  { key: 'grade_a_kg', label: 'Grade A kg', align: 'right', format: formatNumber },
  { key: 'grade_b_kg', label: 'Grade B kg', align: 'right', format: formatNumber },
  { key: 'rejected_kg', label: 'Rejected kg', align: 'right', format: formatNumber },
  { key: 'batch_number', label: 'Batch Number' },
  { key: 'status', label: 'Status', render: (value) => <StatusBadge status={String(value).toLowerCase().replaceAll(' ', '_')} label={value} /> },
];

const attendanceColumns = [
  { key: 'worker_id', label: 'Worker ID' },
  { key: 'worker_name', label: 'Worker Name' },
  { key: 'role', label: 'Role' },
  { key: 'team', label: 'Team' },
  { key: 'attendance_date', label: 'Date', format: formatDate },
  { key: 'clock_in', label: 'Clock In' },
  { key: 'clock_out', label: 'Clock Out' },
  { key: 'hours_worked', label: 'Hours Worked', align: 'right', format: formatNumber },
  { key: 'output_kg', label: 'Output kg', align: 'right', format: formatNumber },
  { key: 'total_pay', label: 'Total Pay', align: 'right', format: formatCurrency },
  { key: 'payment_status', label: 'Payment Status', render: (value) => <StatusBadge status={String(value).toLowerCase()} label={value} /> },
];

const equipmentColumns = [
  { key: 'equipment_code', label: 'Equipment ID' },
  { key: 'equipment_name', label: 'Equipment Name' },
  { key: 'category', label: 'Category' },
  { key: 'farm_assigned', label: 'Farm Assigned' },
  { key: 'current_location', label: 'Current Location' },
  { key: 'condition', label: 'Condition' },
  { key: 'status', label: 'Status', render: (value) => <StatusBadge status={String(value).toLowerCase().replaceAll(' ', '_')} label={value} /> },
  { key: 'assigned_operator', label: 'Assigned Operator' },
  { key: 'next_maintenance_date', label: 'Next Maintenance Date', format: formatDate },
];

const inputColumns = [
  { key: 'input_code', label: 'Input ID' },
  { key: 'input_name', label: 'Input Name' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'batch_number', label: 'Batch Number' },
  { key: 'expiry_date', label: 'Expiry Date', format: formatDate },
  { key: 'stock_quantity', label: 'Stock Quantity', align: 'right', format: formatNumber },
  { key: 'unit', label: 'Unit' },
  { key: 'status', label: 'Status', render: (value) => <StatusBadge status={String(value).toLowerCase().replaceAll(' ', '_')} label={value} /> },
];

const inputUsageColumns = [
  { key: 'application_code', label: 'Application ID' },
  { key: 'application_date', label: 'Date', format: formatDate },
  { key: 'farm_name', label: 'Farm' },
  { key: 'block_name', label: 'Block' },
  { key: 'activity', label: 'Activity' },
  { key: 'input_name', label: 'Input Name' },
  { key: 'input_type', label: 'Input Type' },
  { key: 'quantity_used', label: 'Quantity Used', align: 'right', format: formatNumber },
  { key: 'weather_condition', label: 'Weather Condition' },
  { key: 'wind_speed', label: 'Wind Speed', align: 'right', format: formatNumber },
  { key: 'status', label: 'Status', render: (value) => <StatusBadge status={String(value).toLowerCase()} label={value} /> },
];

const inventoryUsageColumns = [
  { key: 'usage_code', label: 'Usage ID' },
  { key: 'usage_date', label: 'Date', format: formatDate },
  { key: 'item', label: 'Item' },
  { key: 'item_category', label: 'Item Category' },
  { key: 'farm_name', label: 'Farm' },
  { key: 'activity', label: 'Activity' },
  { key: 'quantity_issued', label: 'Issued', align: 'right', format: formatNumber },
  { key: 'quantity_used', label: 'Used', align: 'right', format: formatNumber },
  { key: 'quantity_returned', label: 'Returned', align: 'right', format: formatNumber },
  { key: 'wastage', label: 'Wastage', align: 'right', format: formatNumber },
  { key: 'total_cost', label: 'Total Cost', align: 'right', format: formatCurrency },
];

const qcColumns = [
  { key: 'qc_code', label: 'QC ID' },
  { key: 'inspection_date', label: 'Date', format: formatDate },
  { key: 'batch_number', label: 'Batch Number' },
  { key: 'farm_name', label: 'Farm' },
  { key: 'inspector', label: 'Inspector' },
  { key: 'stage', label: 'Stage' },
  { key: 'defect_percentage', label: 'Defect %', align: 'right', format: formatNumber },
  { key: 'export_approved', label: 'Export Approved' },
  { key: 'status', label: 'Status', render: (value) => <StatusBadge status={String(value).toLowerCase()} label={value} /> },
];

const lossColumns = [
  { key: 'loss_code', label: 'Loss ID' },
  { key: 'loss_date', label: 'Date', format: formatDate },
  { key: 'farm_name', label: 'Farm' },
  { key: 'block_name', label: 'Block' },
  { key: 'batch_number', label: 'Batch Number' },
  { key: 'loss_type', label: 'Loss Type' },
  { key: 'quantity', label: 'Quantity', align: 'right', format: formatNumber },
  { key: 'estimated_value', label: 'Estimated Value', align: 'right', format: formatCurrency },
  { key: 'status', label: 'Status', render: (value) => <StatusBadge status={String(value).toLowerCase()} label={value} /> },
];

const weatherColumns = [
  { key: 'weather_code', label: 'Weather ID' },
  { key: 'weather_date', label: 'Date', format: formatDate },
  { key: 'farm_name', label: 'Farm' },
  { key: 'temperature', label: 'Temperature', align: 'right', format: (value) => `${formatNumber(value)}°C` },
  { key: 'humidity', label: 'Humidity', align: 'right', format: (value) => `${formatNumber(value)}%` },
  { key: 'rainfall', label: 'Rainfall', align: 'right', format: (value) => `${formatNumber(value)} mm` },
  { key: 'wind_speed', label: 'Wind Speed', align: 'right', format: (value) => `${formatNumber(value)} km/h` },
  { key: 'weather_condition', label: 'Weather Condition' },
  { key: 'recorded_by', label: 'Recorded By' },
];

const expenseColumns = [
  { key: 'expense_code', label: 'Expense ID' },
  { key: 'expense_date', label: 'Date', format: formatDate },
  { key: 'farm_name', label: 'Farm' },
  { key: 'activity', label: 'Activity' },
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Cost Amount', semantic: 'cost', align: 'right', format: formatCurrency },
  { key: 'approved_by', label: 'Approved By' },
  { key: 'status', label: 'Status', render: (value) => <StatusBadge status={String(value).toLowerCase()} label={value} /> },
];

const reportColumns = [
  { key: 'report_code', label: 'Report ID' },
  { key: 'report_date', label: 'Date', format: formatDate },
  { key: 'farm_name', label: 'Farm' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'workers_present', label: 'Workers Present', align: 'right', format: formatNumber },
  { key: 'harvest_quantity', label: 'Harvest Quantity', align: 'right', format: formatNumber },
  { key: 'expenses', label: 'Expenses', semantic: 'cost', align: 'right', format: formatCurrency },
  { key: 'manager_approval', label: 'Manager Approval' },
  { key: 'status', label: 'Status', render: (value) => <StatusBadge status={String(value).toLowerCase()} label={value} /> },
];

const approvalColumns = [
  { key: 'approval_code', label: 'Approval ID' },
  { key: 'module', label: 'Module' },
  { key: 'record_code', label: 'Record' },
  { key: 'requested_by', label: 'Requested By' },
  { key: 'approver', label: 'Approver' },
  { key: 'created_date', label: 'Created', format: formatDate },
  { key: 'status', label: 'Status', render: (value) => <StatusBadge status={String(value).toLowerCase()} label={value} /> },
];

const routeToPageName = {
  'activities': 'Daily Activities',
  'harvests': 'Harvest Operations',
  'equipment': 'Equipment Management',
  'reports': 'Daily Supervisor Reports'
};

const removedSectionPaths = [
  '/admin/farm-daily-activities/activities/report',
  '/admin/farm-daily-activities/dashboard',
  '/admin/farm-daily-activities/work-orders',
  '/admin/farm-daily-activities/labour',
  '/admin/farm-daily-activities/inputs',
  '/admin/farm-daily-activities/quality-control',
  '/admin/farm-daily-activities/expenses',
];

const activityLogColumns = [
  { key: 'activity_date', label: 'Date', className: 'w-[92px]', headerClassName: 'bg-[#ecf0f1] text-[#407933]', render: (item) => formatDate(item.activity_date) },
  { key: 'title', label: 'Task Description', className: 'w-[168px]', headerClassName: 'bg-[#ecf0f1] text-[#407933]', render: (item) => item.title || item.activity_title || item.description },
  { key: 'status', label: 'Status', className: 'w-[96px]', headerClassName: 'bg-[#ecf0f1] text-[#407933]' },
  { key: 'category', label: 'Activity Type', className: 'w-[110px]', headerClassName: 'bg-[#ecf0f1] text-[#407933]', render: (item) => item.category },
  { key: 'item_tag', label: 'Item Tag', className: 'w-[92px]', headerClassName: 'bg-[#ecf0f1] text-[#407933]', render: (item) => item.item_tag || item.input_name || item.equipment_used },
  { key: 'quantity', label: 'Quantity', className: 'w-[72px] text-center', headerClassName: 'bg-[#ecf0f1] text-[#407933]', render: (item) => formatNumber(item.quantity_used ?? item.harvest_quantity ?? item.crates_used) },
  { key: 'responsible', label: 'Responsible', className: 'w-[116px]', headerClassName: 'bg-[#ecf0f1] text-[#407933]', render: (item) => item.responsible || item.assigned_workers || item.supervisor_name },
  { key: 'contact', label: 'Contact', className: 'w-[92px]', headerClassName: 'bg-[#ecf0f1] text-[#407933]', render: (item) => item.contact },
  { key: 'block_name', label: 'Farm Block', className: 'w-[102px]', headerClassName: 'bg-[#ecf0f1] text-[#407933]', render: (item) => item.block_name || item.block_code },
  { key: 'projected_cost', label: 'Projected Cost', className: 'w-[96px] text-center', headerClassName: 'bg-[#ecf0f1] text-[#407933]', render: (item) => <span className="font-semibold text-[#407933]">{formatCurrency(item.projected_cost)}</span> },
  { key: 'actual_cost', label: 'Actual Cost', className: 'w-[96px] text-center', headerClassName: 'bg-[#ecf0f1] text-[#407933]', render: (item) => <span className="font-semibold text-[#407933]">{formatCurrency(item.actual_cost ?? item.cost)}</span> },
  { key: 'revenue', label: 'Actual Revenue', className: 'w-[84px] text-center', headerClassName: 'bg-[#ecf0f1] text-[#407933]', render: (item) => <span className="font-semibold text-[#407933]">{formatCurrency(item.actual_revenue ?? item.revenue)}</span> },
  { key: 'output_quantity_kg', label: 'Harvest / Output kg', className: 'w-[104px] text-center', headerClassName: 'bg-[#ecf0f1] text-[#407933]', render: (item) => <span className="font-semibold text-[#407933]">{formatNumber(item.harvest_quantity ?? item.output_quantity_kg)} kg</span> },
  { key: 'cost_type', label: 'Type of Cost', className: 'w-[86px] text-center', headerClassName: 'bg-[#ecf0f1] text-[#407933]', render: (item) => item.cost_type },
  { key: 'notes', label: 'Notes', className: 'w-[170px]', headerClassName: 'bg-[#ecf0f1] text-[#407933]', render: (item) => item.notes },
];

const activityStatusFilterOptions = ['All', 'Completed', 'Pending', 'In Progress'];
const activityTypeFilterOptions = ['All', ...activityCategories];
const farmBlockFilterOptions = [
  { value: 'All', label: 'Farm Block: All' },
  { value: 'A&B', label: 'Farm A & B' },
  { value: 'A', label: 'Farm A' },
  ...Array.from({ length: 5 }, (_, index) => ({ value: `A${index + 1}`, label: `Block A${index + 1}` })),
  { value: 'B', label: 'Farm B' },
  ...Array.from({ length: 5 }, (_, index) => ({ value: `B${index + 1}`, label: `Block B${index + 1}` })),
];

const activityMatchesFarmBlock = (activity, filter) => {
  if (filter === 'All') return true;

  const farmBlockText = [activity.farm_name, activity.block_name, activity.block_code]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
  const hasCode = (code) => new RegExp(`(^|[^A-Z0-9])${code}($|[^A-Z0-9])`).test(farmBlockText);

  if (filter === 'A&B') return /(^|[^A-Z0-9])[AB](?:\d+)?($|[^A-Z0-9])/.test(farmBlockText);
  if (filter === 'A' || filter === 'B') return new RegExp(`(^|[^A-Z0-9])${filter}(?:\\d+)?($|[^A-Z0-9])`).test(farmBlockText);
  return hasCode(filter);
};

const DailyActivityLog = ({
  items,
  statusFilter,
  onStatusFilterChange,
  farmBlockFilter,
  onFarmBlockFilterChange,
  activityTypeFilter,
  onActivityTypeFilterChange,
  search,
  onSearchChange,
  renderCreateAction,
  deletingId,
  onDelete,
  renderEditAction,
}) => {
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [pinnedId, setPinnedId] = useState(null);
  const suppressedPointerRef = useRef(null);
  const rowId = (item, index = 0) => item.id || item.activity_code || `activity-${index}`;
  const visibleItems = useMemo(() => {
    if (dateFilter === 'all') return items;

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const toDateKey = (date) => date.toISOString().slice(0, 10);
    let startDate = '';
    let endDate = '';

    if (dateFilter === 'today') {
      startDate = toDateKey(currentDate);
      endDate = startDate;
    } else if (dateFilter === 'week') {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - ((currentDate.getDay() + 6) % 7));
      startDate = toDateKey(weekStart);
      endDate = toDateKey(currentDate);
    } else if (dateFilter === 'month') {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      startDate = toDateKey(monthStart);
      endDate = toDateKey(currentDate);
    } else if (dateFilter === 'custom') {
      startDate = customStartDate;
      endDate = customEndDate;
    }

    return items.filter((item) => {
      const itemDate = shortDate(item.activity_date || item.created_date);
      return itemDate && (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate);
    });
  }, [items, dateFilter, customStartDate, customEndDate]);
  const pageCount = Math.max(1, Math.ceil(visibleItems.length / rowsPerPage));
  const safePage = Math.min(currentPage, pageCount);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageItems = visibleItems.slice(pageStart, pageStart + rowsPerPage);
  const selectedItem = visibleItems.find((item, index) => rowId(item, index) === selectedId) || null;
  const totalProjectedCost = visibleItems.reduce((sum, item) => sum + asNumber(item.projected_cost), 0);
  const totalActualCost = visibleItems.reduce((sum, item) => sum + asNumber(item.actual_cost ?? item.cost), 0);
  const totalProjectedRevenue = visibleItems.reduce((sum, item) => sum + asNumber(item.projected_revenue), 0);
  const totalActualRevenue = visibleItems.reduce((sum, item) => sum + asNumber(item.actual_revenue ?? item.revenue), 0);
  const totalOutput = visibleItems.reduce((sum, item) => sum + asNumber(item.harvest_quantity ?? item.output_quantity_kg), 0);
  const completedCount = visibleItems.filter((item) => String(item.status || '').toLowerCase() === 'completed').length;
  const completedPercent = visibleItems.length ? Math.round((completedCount / visibleItems.length) * 100) : 0;
  const displayValue = (value) => (value === null || value === undefined || value === '' ? '—' : value);

  const closeDetails = (event) => {
    setSelectedId(null);
    setPinnedId(null);
    if (event) {
      suppressedPointerRef.current = { until: Date.now() + 250, x: event.clientX, y: event.clientY };
    }
  };

  const previewDetails = (itemId, event) => {
    const suppressedPointer = suppressedPointerRef.current;
    if (suppressedPointer && Date.now() < suppressedPointer.until
      && Math.abs(event.clientX - suppressedPointer.x) < 3
      && Math.abs(event.clientY - suppressedPointer.y) < 3) return;
    suppressedPointerRef.current = null;
    setSelectedId(itemId);
    setPinnedId((current) => (current === itemId ? current : null));
  };

  const pinDetails = (itemId) => {
    setSelectedId(itemId);
    setPinnedId(itemId);
  };

  const closePreview = (itemId, event) => {
    if (pinnedId === itemId) return;
    setSelectedId((current) => (current === itemId ? null : current));
    setPinnedId(null);
    // Ignore only a layout-caused enter at the same pointer position, never real movement.
    suppressedPointerRef.current = { until: Date.now() + 250, x: event.clientX, y: event.clientY };
  };

  const exportActivityLogPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3', compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const rowLineHeight = 8;
    const columns = [
      { label: 'Date', width: 50, value: (item) => formatDate(item.activity_date) },
      { label: 'Task Description', width: 100, value: (item) => item.title || item.activity_title || item.description },
      { label: 'Status', width: 58, value: (item) => item.status },
      { label: 'Activity Type', width: 64, value: (item) => item.category },
      { label: 'Item Tag', width: 58, value: (item) => item.item_tag || item.input_name || item.equipment_used },
      { label: 'Quantity', width: 44, value: (item) => formatNumber(item.quantity_used ?? item.harvest_quantity ?? item.crates_used) },
      { label: 'Responsible', width: 70, value: (item) => item.responsible || item.assigned_workers || item.supervisor_name },
      { label: 'Contact', width: 65, value: (item) => item.contact },
      { label: 'Farm Block', width: 56, value: (item) => item.block_name || item.block_code },
      { label: 'Projected Cost', width: 63, value: (item) => item.projected_cost },
      { label: 'Actual Cost', width: 63, value: (item) => item.actual_cost ?? item.cost },
      { label: 'Actual Revenue', width: 65, value: (item) => item.actual_revenue ?? item.revenue },
      { label: 'Harvest / Output kg', width: 66, value: (item) => `${formatNumber(item.harvest_quantity ?? item.output_quantity_kg)} kg` },
      { label: 'Type of Cost', width: 55, value: (item) => item.cost_type },
      { label: 'Notes', width: 105, value: (item) => item.notes },
    ];
    const groupHeaders = [
      { label: 'Activity', count: 4, fill: [234, 248, 232], text: [22, 115, 41] },
      { label: 'Assignment & Inputs', count: 5, fill: [237, 244, 255], text: [59, 111, 201] },
      { label: 'Financials & Output', count: 5, fill: [255, 240, 242], text: [225, 75, 90] },
      { label: 'Record', count: 1, fill: [246, 240, 255], text: [128, 90, 213] },
    ];
    const money = (value) => `GHS ${asNumber(value).toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    const dateLabel = { all: 'All dates', today: 'Today', week: 'This week', month: 'This month', custom: 'Custom range' }[dateFilter];
    const selectedBlock = farmBlockFilterOptions.find((option) => option.value === farmBlockFilter)?.label || 'Farm Block: All';
    const filters = [dateLabel, selectedBlock, activityTypeFilter === 'All' ? 'All activity types' : activityTypeFilter, statusFilter === 'All' ? 'All status' : statusFilter].join('  |  ');

    const drawReportHeader = (continuation = false) => {
      doc.setFillColor(13, 91, 28);
      doc.rect(0, 0, pageWidth, 58, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(19);
      doc.text('Daily Activity Log', margin, 35);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(continuation ? 'Activity report - continued' : 'Activities, inputs, costs and outputs', margin, 49);
      doc.text(`Generated ${new Date().toLocaleString('en-GB')}`, pageWidth - margin, 35, { align: 'right' });
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.text(filters, margin, 76);

      if (continuation) return 92;

      const summaries = [
        { label: 'TOTAL ACTIVITIES', value: formatNumber(visibleItems.length), fill: [247, 252, 247], text: [22, 115, 41] },
        { label: 'PROJECTED / ACTUAL COST', value: `${money(totalProjectedCost)} / ${money(totalActualCost)}`, fill: [255, 248, 248], text: [225, 75, 90] },
        { label: 'PROJECTED / ACTUAL REVENUE', value: `${money(totalProjectedRevenue)} / ${money(totalActualRevenue)}`, fill: [245, 249, 255], text: [37, 99, 235] },
        { label: 'HARVEST OUTPUT', value: `${formatNumber(totalOutput)} kg`, fill: [255, 251, 235], text: [180, 83, 9] },
        { label: 'COMPLETION RATE', value: `${completedPercent}%`, fill: [250, 245, 255], text: [124, 58, 237] },
      ];
      const cardGap = 8;
      const cardWidth = (pageWidth - (margin * 2) - (cardGap * (summaries.length - 1))) / summaries.length;
      summaries.forEach((summary, index) => {
        const x = margin + (index * (cardWidth + cardGap));
        doc.setFillColor(...summary.fill);
        doc.roundedRect(x, 90, cardWidth, 50, 5, 5, 'F');
        doc.setTextColor(...summary.text);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(summary.label, x + 8, 106);
        doc.setFontSize(index === 1 || index === 2 ? 8 : 13);
        doc.text(summary.value, x + 8, 128, { maxWidth: cardWidth - 16 });
      });
      return 158;
    };

    const drawTableHeader = (y) => {
      let x = margin;
      let columnIndex = 0;
      groupHeaders.forEach((group) => {
        const width = columns.slice(columnIndex, columnIndex + group.count).reduce((sum, column) => sum + column.width, 0);
        doc.setFillColor(...group.fill);
        doc.rect(x, y, width, 16, 'F');
        doc.setTextColor(...group.text);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(group.label, x + (width / 2), y + 11, { align: 'center' });
        x += width;
        columnIndex += group.count;
      });

      x = margin;
      columns.forEach((column) => {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.rect(x, y + 16, column.width, 22, 'FD');
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        const label = doc.splitTextToSize(column.label, column.width - 6);
        doc.text(label, x + (column.width / 2), y + 24, { align: 'center', lineHeightFactor: 1.05 });
        x += column.width;
      });
      return y + 38;
    };

    let y = drawReportHeader();
    y = drawTableHeader(y);

    visibleItems.forEach((item, index) => {
      const values = columns.map((column) => {
        const rawValue = column.value(item);
        const value = [9, 10, 11].includes(columns.indexOf(column)) ? money(rawValue) : String(rawValue || '-');
        return doc.splitTextToSize(value, column.width - 6);
      });
      const rowHeight = Math.max(20, ...values.map((lines) => (lines.length * rowLineHeight) + 10));
      if (y + rowHeight > pageHeight - 34) {
        doc.addPage();
        y = drawReportHeader(true);
        y = drawTableHeader(y);
      }

      let x = margin;
      values.forEach((lines, columnIndex) => {
        doc.setFillColor(index % 2 === 0 ? 255 : 249, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 251);
        doc.setDrawColor(226, 232, 240);
        doc.rect(x, y, columns[columnIndex].width, rowHeight, 'FD');
        doc.setTextColor(columnIndex === 9 || columnIndex === 10 ? 225 : columnIndex === 11 ? 37 : 51, columnIndex === 9 || columnIndex === 10 ? 75 : columnIndex === 11 ? 99 : 65, columnIndex === 9 || columnIndex === 10 ? 90 : columnIndex === 11 ? 235 : 85);
        doc.setFont('helvetica', columnIndex === 9 || columnIndex === 10 || columnIndex === 11 ? 'bold' : 'normal');
        doc.setFontSize(6.5);
        doc.text(lines, x + 3, y + 9, { maxWidth: columns[columnIndex].width - 6, lineHeightFactor: 1.1 });
        x += columns[columnIndex].width;
      });
      y += rowHeight;
    });

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 24, pageWidth - margin, pageHeight - 24);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('Mango Farm - Daily Activity Log', margin, pageHeight - 12);
      doc.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
    }
    doc.save(`daily-activity-log-${today}.pdf`);
  };

  useEffect(() => {
    setCurrentPage(1);
    closeDetails();
  }, [statusFilter, farmBlockFilter, activityTypeFilter, dateFilter, customStartDate, customEndDate, rowsPerPage]);

  useEffect(() => {
    if (selectedId && !selectedItem) closeDetails();
  }, [visibleItems, selectedId, selectedItem]);

  const renderActivityDetails = (item, itemId) => (
    <section
      className="m-2 rounded-md border border-emerald-800/20 bg-white px-4 py-3 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
      onPointerLeave={(event) => closePreview(itemId, event)}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-900">Activity Details</h3>
        <button type="button" onClick={(event) => closeDetails(event)} className="rounded p-1 text-slate-600 hover:bg-slate-100" aria-label="Close activity details">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 grid gap-0 text-[11px] leading-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="pr-6 xl:border-r xl:border-slate-200">
          <p className="mb-1 font-semibold text-[#167329]">Details</p>
          {[
            ['Date', formatDate(item.activity_date)],
            ['Activity Type', item.category],
            ['Item Tag', item.item_tag || item.input_name || item.equipment_used],
            ['Quantity', formatNumber(item.quantity_used ?? item.harvest_quantity ?? item.crates_used)],
            ['Responsible', item.responsible || item.assigned_workers || item.supervisor_name],
            ['Contact', item.contact],
          ].map(([label, value]) => <p key={label} className="grid grid-cols-[118px_1fr] gap-3"><span className="text-slate-600">{label}</span><span>{displayValue(value)}</span></p>)}
        </div>
        <div className="px-0 pt-4 md:pl-6 md:pt-0 xl:border-r xl:border-slate-200 xl:pr-6">
          <p className="mb-1 font-semibold text-[#167329]">Financials</p>
          {[
            ['Projected Cost', formatCurrency(item.projected_cost)],
            ['Actual Cost', formatCurrency(item.actual_cost ?? item.cost)],
            ['Projected Revenue', formatCurrency(item.projected_revenue)],
            ['Actual Revenue', formatCurrency(item.actual_revenue ?? item.revenue)],
          ].map(([label, value]) => <p key={label} className="grid grid-cols-[132px_1fr] gap-3"><span className={label.includes('Revenue') ? 'text-blue-600' : 'text-rose-600'}>{label}</span><span className={label.includes('Revenue') ? 'font-semibold text-blue-600' : 'font-semibold text-rose-600'}>{value}</span></p>)}
        </div>
        <div className="px-0 pt-4 md:pr-6 xl:border-r xl:border-slate-200 xl:pl-6 xl:pt-0">
          <p className="mb-1 font-semibold text-[#167329]">Production</p>
          {[
            ['Harvest / Output', `${formatNumber(item.harvest_quantity ?? item.output_quantity_kg)} kg`],
            ['Farm Block', item.block_name || item.block_code],
            ['Main Farm', item.farm_name],
          ].map(([label, value]) => <p key={label} className="grid grid-cols-[132px_1fr] gap-3"><span className={label === 'Harvest / Output' ? 'text-emerald-700' : 'text-slate-600'}>{label}</span><span className={label === 'Harvest / Output' ? 'font-semibold text-emerald-700' : ''}>{displayValue(value)}</span></p>)}
        </div>
        <div className="flex min-h-32 flex-col pl-0 pt-4 md:pl-6 xl:pt-0">
          <p className="mb-1 font-semibold text-[#167329]">Notes</p>
          <p className="max-w-xs leading-5 text-slate-700">{displayValue(item.notes)}</p>
          <div className="mt-auto flex justify-end gap-3 pt-4">
            {renderEditAction?.(item)}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deletingId === item.id}
              onClick={() => onDelete(item)}
              className="h-8 border-rose-300 px-4 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
            </Button>
          </div>
        </div>
      </div>
    </section>
  );

  const renderActivityLogColumnHeader = (column) => {
    const selectClassName = 'w-full cursor-pointer bg-transparent text-center text-[10px] font-semibold text-current outline-none';

    if (column.key === 'activity_date') {
      return (
        <div className="relative">
          <label className="flex items-center justify-center gap-1">
            <CalendarDays className="h-3 w-3 shrink-0" />
            <span className="sr-only">Filter activities by date</span>
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className={selectClassName} aria-label="Filter activities by date">
              <option value="all">Date</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {dateFilter === 'custom' ? (
            <div className="absolute left-0 top-full z-50 mt-1 grid w-64 gap-2 rounded-md border border-slate-200 bg-white p-3 text-left text-[10px] text-slate-600 shadow-lg">
              <label className="grid gap-1">From
                <Input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} className="h-8 bg-white text-[10px]" aria-label="Custom date range start" />
              </label>
              <label className="grid gap-1">To
                <Input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} className="h-8 bg-white text-[10px]" aria-label="Custom date range end" />
              </label>
            </div>
          ) : null}
        </div>
      );
    }

    if (column.key === 'block_name') {
      return <label className="block"><span className="sr-only">Filter activities by farm block</span><select value={farmBlockFilter} onChange={(event) => onFarmBlockFilterChange(event.target.value)} className={selectClassName} aria-label="Filter activities by farm block">{farmBlockFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.value === 'All' ? 'Farm Block' : option.label}</option>)}</select></label>;
    }

    if (column.key === 'category') {
      return <label className="block"><span className="sr-only">Filter activities by type</span><select value={activityTypeFilter} onChange={(event) => onActivityTypeFilterChange(event.target.value)} className={selectClassName} aria-label="Filter activities by type">{activityTypeFilterOptions.map((activityType) => <option key={activityType} value={activityType}>{activityType === 'All' ? 'Activity Type' : activityType}</option>)}</select></label>;
    }

    if (column.key === 'status') {
      return <label className="block"><span className="sr-only">Filter activities by status</span><select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)} className={selectClassName} aria-label="Filter activities by status">{activityStatusFilterOptions.map((status) => <option key={status} value={status}>{status === 'All' ? 'Status' : status}</option>)}</select></label>;
    }

    return <span>{column.label}</span>;
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search activity logs..."
              className="h-9 border-slate-200 bg-white pl-8 text-[11px] shadow-none placeholder:text-slate-400"
              aria-label="Search activity logs"
            />
          </label>
          <Button type="button" variant="outline" onClick={exportActivityLogPdf} className="h-9 border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900">
            <Download className="mr-1.5 h-3.5 w-3.5" />Export
          </Button>
          {renderCreateAction}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <section className="min-h-[92px] rounded-lg border border-emerald-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex h-full items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e7f5e4] text-[#167329]">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total Activities</p>
              <p className="mt-1 text-xl font-bold leading-none text-slate-900">{formatNumber(visibleItems.length)}</p>
              <p className="mt-1 text-[10px] text-slate-500">Current selection</p>
            </div>
          </div>
        </section>

        <section className="min-h-[92px] rounded-lg border border-rose-100 bg-[linear-gradient(135deg,#fff_0%,#fff8f8_100%)] px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-center text-[10px] font-semibold text-rose-600">Total Cost</p>
          <div className="mt-2 grid grid-cols-2 divide-x divide-rose-100">
            <div className="pr-3">
              <p className="text-[9px] text-slate-500">Projected Cost</p>
              <p className="mt-1 whitespace-nowrap text-sm font-bold text-rose-600">{formatCurrency(totalProjectedCost)}</p>
            </div>
            <div className="pl-3">
              <p className="text-[9px] text-slate-500">Actual Cost</p>
              <p className="mt-1 whitespace-nowrap text-sm font-bold text-rose-600">{formatCurrency(totalActualCost)}</p>
            </div>
          </div>
        </section>

        <section className="min-h-[92px] rounded-lg border border-blue-100 bg-[linear-gradient(135deg,#fff_0%,#f5f9ff_100%)] px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-center text-[10px] font-semibold text-blue-600">Total Revenue</p>
          <div className="mt-2 grid grid-cols-2 divide-x divide-blue-100">
            <div className="pr-3">
              <p className="text-[9px] text-slate-500">Projected Revenue</p>
              <p className="mt-1 whitespace-nowrap text-sm font-bold text-blue-600">{formatCurrency(totalProjectedRevenue)}</p>
            </div>
            <div className="pl-3">
              <p className="text-[9px] text-slate-500">Actual Revenue</p>
              <p className="mt-1 whitespace-nowrap text-sm font-bold text-blue-600">{formatCurrency(totalActualRevenue)}</p>
            </div>
          </div>
        </section>

        <section className="min-h-[92px] rounded-lg border border-amber-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex h-full items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600">
              <Leaf className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Total Harvest Output</p>
              <p className="mt-1 text-xl font-bold leading-none text-slate-900">{formatNumber(totalOutput)} <small className="text-xs font-semibold text-slate-500">kg</small></p>
              <p className="mt-1 text-[10px] text-slate-500">Current selection</p>
            </div>
          </div>
        </section>

        <section className="min-h-[92px] rounded-lg border border-violet-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex h-full items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">Completion Rate</p>
              <p className="mt-1 text-xl font-bold leading-none text-violet-600">{completedPercent}%</p>
              <p className="mt-1 text-[10px] text-slate-500">Completed</p>
            </div>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="max-h-[calc(100vh-12rem)] overflow-auto">
        <table className="w-full min-w-[1320px] table-fixed border-collapse text-[11px] leading-4 text-slate-800">
          <thead>
            <tr className="h-8">
              <th colSpan={4} className="sticky top-0 z-30 h-8 border border-slate-100 bg-[#eaf8e8] px-2 py-1 text-center text-[10px] font-semibold text-[#167329]">Activity</th>
              <th colSpan={5} className="sticky top-0 z-30 h-8 border border-slate-100 bg-[#edf4ff] px-2 py-1 text-center text-[10px] font-semibold text-[#3b6fc9]">Assignment &amp; Inputs</th>
              <th colSpan={5} className="sticky top-0 z-30 h-8 border border-slate-100 bg-[#fff0f2] px-2 py-1 text-center text-[10px] font-semibold text-[#e14b5a]">Financials &amp; Output</th>
              <th colSpan={1} className="sticky top-0 z-30 h-8 border border-slate-100 bg-[#f6f0ff] px-2 py-1 text-center text-[10px] font-semibold text-[#805ad5]">Record</th>
            </tr>
            <tr className="h-14">
              {activityLogColumns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`sticky top-8 z-30 h-14 border border-slate-100 px-3 py-2 text-center text-[10px] font-semibold ${column.headerClassName || 'bg-[#eff9ee] text-[#167329]'} ${column.className || ''}`}
                >
                  {renderActivityLogColumnHeader(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item, index) => {
              const itemId = rowId(item, pageStart + index);
              const isSelected = selectedId === itemId;
              return (
              <React.Fragment key={itemId}>
              <tr
                onClick={() => pinDetails(itemId)}
                onPointerEnter={(event) => previewDetails(itemId, event)}
                onPointerLeave={(event) => closePreview(itemId, event)}
                onFocus={() => pinDetails(itemId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    pinDetails(itemId);
                  }
                  if (event.key === 'Escape') {
                    closeDetails();
                  }
                }}
                tabIndex={0}
                aria-selected={isSelected}
                className={`h-16 cursor-pointer transition-colors hover:bg-[#f3faf2] ${isSelected ? 'bg-[#eff8ef]' : 'bg-white'}`}
              >
                {activityLogColumns.map((column) => {
                  const value = column.key === 'status' ? (
                    <span className="inline-flex rounded-sm bg-[#dff1d8] px-2 py-0.5 text-[10px] font-medium text-[#167329]">
                      {item.status || 'Pending'}
                    </span>
                  ) : column.render ? column.render(item) : item[column.key];
                  return (
                    <td key={column.key} className={`h-16 border border-slate-200 px-3 py-2 align-middle ${column.className || ''}`}>
                      <span className="block max-h-10 overflow-hidden break-words leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                        {value || '—'}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {isSelected && (
                <tr className="bg-[#f8fbf8]">
                  <td colSpan={activityLogColumns.length} className="border border-slate-200 p-0 align-top">
                    {renderActivityDetails(item, itemId)}
                  </td>
                </tr>
              )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      </section>

      <footer className="grid items-center gap-4 border-t border-slate-200 px-5 py-4 text-[11px] text-slate-600 md:grid-cols-3">
        <p>Showing {visibleItems.length ? pageStart + 1 : 0}–{Math.min(pageStart + rowsPerPage, visibleItems.length)} of {visibleItems.length}</p>
        <label className="flex items-center justify-center gap-3">
          <span>Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(event) => setRowsPerPage(Number(event.target.value))}
            className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-[#167329]"
          >
            {[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <nav className="flex items-center justify-end gap-2" aria-label="Activity log pagination">
          <Button type="button" variant="outline" size="sm" disabled={safePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="h-8 px-3 text-[11px]">
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />Previous
          </Button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
            <Button
              key={page}
              type="button"
              variant={page === safePage ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentPage(page)}
              className={`h-8 min-w-8 px-2 text-[11px] ${page === safePage ? 'bg-[#116b25] text-white hover:bg-[#0d5c1f]' : ''}`}
            >
              {page}
            </Button>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={safePage === pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} className="h-8 px-3 text-[11px]">
            Next<ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </nav>
      </footer>
    </div>
  );
};

export default function FarmDailyActivities() {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const activeSection = farmDailyActivitiesNavigation.find(
    (section) => pathname.startsWith(section.path)
  ) || farmDailyActivitiesNavigation[0];

  const activeChild = activeSection.children.find(
    (child) => pathname === child.path
  ) || activeSection.children[0];

  const activePage = routeToPageName[activeSection.path.split('/').pop()] || activeSection.title;
  const activeScreen = activeChild.screen;
  const activeChildFilter = activeChild.filter;

  const [search, setSearch] = useState('');
  const [activityStatusFilter, setActivityStatusFilter] = useState('All');
  const [activityFarmBlockFilter, setActivityFarmBlockFilter] = useState('All');
  const [activityTypeFilter, setActivityTypeFilter] = useState('All');
  const [deletingActivityId, setDeletingActivityId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});
  const [selectedRecords, setSelectedRecords] = useState({});

  const selectRecord = (key, record) => {
    setSelectedRecords((current) => ({ ...current, [key]: record?.id }));
  };

  const getSelectedRecord = (key, rows) => (
    rows.find((row) => row.id === selectedRecords[key]) || rows[0] || null
  );

  const load = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true);
    return Promise.all([
      base44.entities.Farm.listAll('-created_date').catch(() => []),
      base44.entities.FarmBlock.listAll('-created_date').catch(() => []),
      base44.entities.Worker.listAll('-created_date').catch(() => []),
      base44.entities.DailyActivity.listAll('-activity_date').catch(() => []),
      base44.entities.WorkOrder.listAll('-scheduled_date').catch(() => []),
      base44.entities.HarvestBatch.listAll('-harvest_date').catch(() => []),
      base44.entities.HarvestGrade.listAll('-created_date').catch(() => []),
      base44.entities.FarmAttendance.listAll('-attendance_date').catch(() => []),
      base44.entities.Equipment.listAll('-created_date').catch(() => []),
      base44.entities.EquipmentUsage.listAll('-usage_date').catch(() => []),
      base44.entities.FarmInput.listAll('-created_date').catch(() => []),
      base44.entities.InputUsage.listAll('-application_date').catch(() => []),
      base44.entities.InventoryUsage.listAll('-usage_date').catch(() => []),
      base44.entities.QualityCheck.listAll('-inspection_date').catch(() => []),
      base44.entities.WasteLoss.listAll('-loss_date').catch(() => []),
      base44.entities.WeatherLog.listAll('-weather_date').catch(() => []),
      base44.entities.FarmExpense.listAll('-expense_date').catch(() => []),
      base44.entities.DailyReport.listAll('-report_date').catch(() => []),
      base44.entities.Approval.listAll('-created_date').catch(() => []),
      base44.entities.Notification.listAll('-created_date').catch(() => []),
      base44.entities.Certification.listAll('-created_date').catch(() => []),
      base44.entities.StockMovement.listAll('-created_date').catch(() => []),
      base44.entities.FarmFinanceRecord.listAll('-record_date').catch(() => []),
      base44.entities.FarmComplianceRecord.listAll('-created_date').catch(() => []),
      base44.entities.AuditLog.listAll('-created_date').catch(() => []),
      base44.entities.FarmNote.listAll('-created_date').catch(() => []),
    ]).then(([
      farms,
      blocks,
      workers,
      dailyActivities,
      workOrders,
      harvestBatches,
      harvestGrades,
      attendance,
      equipment,
      equipmentUsage,
      farmInputs,
      inputUsage,
      inventoryUsage,
      qualityChecks,
      wasteLosses,
      weatherLogs,
      farmExpenses,
      dailyReports,
      approvals,
      notifications,
      certifications,
      stockMovements,
      financeRecords,
      complianceRecords,
      auditLogs,
      farmNotes,
    ]) => {
      setData({
        farms,
        blocks,
        workers,
        dailyActivities,
        workOrders,
        harvestBatches,
        harvestGrades,
        attendance,
        equipment,
        equipmentUsage,
        farmInputs,
        inputUsage,
        inventoryUsage,
        qualityChecks,
        wasteLosses,
        weatherLogs,
        farmExpenses,
        dailyReports,
        approvals,
        notifications,
        certifications,
        stockMovements,
        financeRecords,
        complianceRecords,
        auditLogs,
        farmNotes,
      });
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let refreshTimer;
    const unsubscribe = subscribeToDataChanges(() => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => load(false), 180);
    }, [
      'Farm', 'FarmBlock', 'Worker', 'DailyActivity', 'WorkOrder', 'HarvestBatch',
      'HarvestGrade', 'FarmAttendance', 'Equipment', 'EquipmentUsage', 'FarmInput',
      'InputUsage', 'InventoryUsage', 'QualityCheck', 'WasteLoss', 'WeatherLog',
      'FarmExpense', 'DailyReport', 'Approval', 'Notification', 'Certification',
      'StockMovement', 'FarmFinanceRecord', 'FarmComplianceRecord', 'AuditLog', 'FarmNote',
    ]);
    return () => {
      window.clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [load]);

  const deleteDailyLogEntry = async (activity) => {
    if (!activity?.id) return;
    const label = activity.title || activity.activity_title || activity.activity_code || 'this activity';
    if (!window.confirm(`Delete ${label}? This removes the saved Daily Activity Log record and updates analytics.`)) return;
    setDeletingActivityId(activity.id);
    try {
      await base44.entities.DailyActivity.delete(activity.id);
      setData((current) => ({
        ...current,
        dailyActivities: (current.dailyActivities || []).filter((item) => item.id !== activity.id),
      }));
      toast({ title: 'Daily activity deleted', description: 'Analytics have been recalculated from the remaining log records.' });
    } catch (error) {
      toast({ title: 'Unable to delete activity', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingActivityId(null);
    }
  };

  useEffect(() => {
    if (removedSectionPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
      navigate('/admin/farm-daily-activities/activities/overview', { replace: true });
      return;
    }

    const matchedSection = farmDailyActivitiesNavigation.find(
      (section) => pathname === section.path || pathname === `${section.path}/`
    );
    if (matchedSection && matchedSection.children?.[0]) {
      navigate(matchedSection.children[0].path, { replace: true });
    } else if (pathname === '/admin/farm-daily-activities' || pathname === '/admin/farm-daily-activities/') {
      navigate('/admin/farm-daily-activities/activities/overview', { replace: true });
    }
  }, [pathname, navigate]);

  const activePageConfig = pageMap.find((page) => page.name === activePage) || pageMap[0];
  const lowerSearch = search.toLowerCase();
  const filterRows = (rows, keys) => (
    lowerSearch
      ? rows.filter((row) => keys.some((key) => String(row[key] || '').toLowerCase().includes(lowerSearch)))
      : rows
  );

  const farmOptions = useMemo(() => (
    (data.farms || []).length
      ? data.farms.map((farm) => ({ value: farm.id, label: farm.name }))
      : [{ value: 'farm_001', label: 'Eastern Ridge Orchard' }]
  ), [data.farms]);

  const blockOptions = useMemo(() => (
    (data.blocks || []).length
      ? data.blocks.map((block) => ({ value: block.id, label: `${block.name} (${block.farm_name})` }))
      : [{ value: 'block_001', label: 'North Kent Block' }]
  ), [data.blocks]);

  const resolveFarmBlock = (payload) => {
    const farm = (data.farms || []).find((item) => item.id === payload.farm_id || item.name === payload.farm_name);
    const block = (data.blocks || []).find((item) => item.id === payload.block_id || item.name === payload.block_name);
    return {
      farm_id: payload.farm_id || farm?.id || block?.farm_id || '',
      farm_name: farm?.name || payload.farm_name || block?.farm_name || '',
      block_id: payload.block_id || block?.id || '',
      block_name: block?.name || payload.block_name || '',
    };
  };

  const notify = (title, message, type = 'farm_operations') => (
    base44.entities.Notification.create({
      title,
      message,
      type,
      notification_type: type,
      channel: 'Admin',
      status: 'new',
    }).catch(() => null)
  );

  const createApproval = (module, recordCode, status = 'Requested') => (
    base44.entities.Approval.create({
      approval_code: code('APR'),
      module,
      record_code: recordCode,
      requested_by: 'Supervisor',
      approver: 'Farm Manager',
      status,
    }).catch(() => null)
  );

  const createAuditLog = (action, recordType, recordCode, comment = '') => (
    base44.entities.AuditLog.create({
      log_code: code('AUD'),
      action,
      record_type: recordType,
      record_code: recordCode,
      performed_by: 'Farm Manager',
      comment,
      event_date: today,
    }).catch(() => null)
  );

  const updateApproval = async (approval, nextStatus, comment = '') => {
    const approvalComment = [approval.comment, comment].filter(Boolean).join('\n');
    await base44.entities.Approval.update(approval.id, {
      status: nextStatus,
      comment: approvalComment,
      approval_history: [
        approval.approval_history,
        `${new Date().toISOString()} - ${nextStatus}${comment ? `: ${comment}` : ''}`,
      ].filter(Boolean).join('\n'),
      decided_at: new Date().toISOString(),
      decided_by: 'Farm Manager',
    });

    const statusPayload = nextStatus === 'Approved'
      ? { status: 'Approved', manager_approval: 'Approved', approved_by: 'Farm Manager' }
      : { status: 'Rejected', manager_approval: 'Rejected', approved_by: 'Farm Manager' };

    const recordUpdates = {
      'Daily Activity': ['DailyActivity', 'activity_code'],
      'Work Order': ['WorkOrder', 'work_order_code'],
      Expense: ['FarmExpense', 'expense_code'],
      'Quality Control': ['QualityCheck', 'qc_code'],
      'Waste & Losses': ['WasteLoss', 'loss_code'],
      'Daily Report': ['DailyReport', 'report_code'],
    };
    const [entityName, codeField] = recordUpdates[approval.module] || [];
    if (entityName) {
      const record = (data[{
        DailyActivity: 'dailyActivities',
        WorkOrder: 'workOrders',
        FarmExpense: 'farmExpenses',
        QualityCheck: 'qualityChecks',
        WasteLoss: 'wasteLosses',
        DailyReport: 'dailyReports',
      }[entityName]] || []).find((item) => item[codeField] === approval.record_code);
      if (record?.id) await base44.entities[entityName].update(record.id, statusPayload).catch(() => null);
    }

    await createAuditLog(nextStatus, approval.module, approval.record_code, comment);
    toast({ title: `${approval.record_code} ${nextStatus.toLowerCase()}` });
    load();
  };

  const findFarmInput = (name, type) => (
    (data.farmInputs || []).find((item) => (
      String(item.input_name || '').toLowerCase() === String(name || '').toLowerCase()
      || String(item.input_code || '').toLowerCase() === String(name || '').toLowerCase()
    ) && (!type || item.type === type || item.category === type))
  );

  const deductFarmInputStock = async ({ inputName, inputType, quantity, reference }) => {
    const stockItem = findFarmInput(inputName, inputType);
    if (!stockItem || asNumber(quantity) <= 0) return null;
    if (stockItem.expiry_date && new Date(stockItem.expiry_date) < new Date(today)) {
      throw new Error(`${stockItem.input_name} is expired and cannot be issued.`);
    }
    if (['Expired', 'Blocked'].includes(stockItem.status)) {
      throw new Error(`${stockItem.input_name} is ${stockItem.status.toLowerCase()} and cannot be issued.`);
    }
    if (asNumber(stockItem.stock_quantity) < asNumber(quantity)) {
      throw new Error(`${stockItem.input_name} has insufficient stock.`);
    }

    const nextStock = asNumber(stockItem.stock_quantity) - asNumber(quantity);
    const nextStatus = nextStock <= asNumber(stockItem.reorder_level) ? 'Low Stock' : 'Available';
    await base44.entities.FarmInput.update(stockItem.id, { stock_quantity: nextStock, status: nextStatus });
    await base44.entities.StockMovement.create({
      product_name: stockItem.input_name,
      warehouse_name: stockItem.storage_location || 'Farm store',
      movement_type: 'out',
      quantity: asNumber(quantity),
      movement_date: today,
      reference,
    }).catch(() => null);
    if (nextStatus === 'Low Stock') {
      await notify('Procurement request needed', `${stockItem.input_name} is at ${formatNumber(nextStock)} ${stockItem.unit || ''}.`, 'procurement');
    }
    return stockItem;
  };

  const assertEquipmentAvailable = (payload, ignoreActivityCode) => {
    if (!payload.equipment_used && !payload.equipment_required) return;
    const equipmentName = payload.equipment_used || payload.equipment_required;
    const date = payload.activity_date || payload.scheduled_date;
    const start = payload.start_time || '00:00';
    const end = payload.end_time || '23:59';
    const overlaps = (existing) => (
      existing.id !== payload.id
      && existing.activity_code !== ignoreActivityCode
      && (existing.equipment_used === equipmentName || existing.equipment_required === equipmentName || existing.equipment_name === equipmentName)
      && shortDate(existing.activity_date || existing.scheduled_date || existing.usage_date) === shortDate(date)
      && !['Cancelled', 'Completed', 'Approved'].includes(existing.status)
      && existing.returned !== 'Yes'
      && (existing.start_time || '00:00') < end
      && start < (existing.end_time || '23:59')
    );
    if ((data.dailyActivities || []).some(overlaps) || (data.workOrders || []).some(overlaps) || (data.equipmentUsage || []).some(overlaps)) {
      throw new Error(`${equipmentName} is already booked for that date and time.`);
    }
  };

  const createFinanceRecord = (payload) => (
    base44.entities.FarmFinanceRecord.create({
      record_code: code('FF'),
      farm_id: payload.farm_id,
      farm_name: payload.farm_name,
      block_id: payload.block_id,
      block_name: payload.block_name,
      record_date: payload.record_date || payload.activity_date || payload.expense_date || today,
      record_type: 'expense',
      category: payload.category || payload.activity || 'Farm Operations',
      description: payload.description || payload.title || 'Farm operation cost',
      amount: asNumber(payload.amount || payload.cost || payload.total_cost),
      currency: 'GHS',
      status: 'recorded',
    }).catch(() => null)
  );

  const createDocumentRecord = (name, evidenceReference, status = 'valid') => (
    base44.entities.Certification.create({
      name,
      issuer: 'Farm Daily Activities',
      certificate_number: evidenceReference,
      valid_from: today,
      valid_to: today,
      status,
    }).catch(() => null)
  );

  const syncActivityExpense = async (activity, payload, farmBlock, cost) => {
    const activityCode = activity.activity_code || payload.activity_code;
    const expensePayload = {
      expense_date: payload.activity_date || today,
      ...farmBlock,
      activity_code: activityCode,
      activity: payload.title || payload.activity_title || payload.category,
      category: payload.cost_type || (payload.category === 'Harvesting' ? 'Labour' : payload.category),
      description: payload.description || payload.title || payload.activity_title || payload.category,
      amount: cost,
      projected_cost: asNumber(payload.projected_cost),
      actual_cost: asNumber(payload.actual_cost || cost),
      cost_type: payload.cost_type,
      labour_cost: asNumber(payload.labour_cost),
      equipment_cost: asNumber(payload.equipment_cost),
      fuel_cost: asNumber(payload.fuel_cost),
      input_cost: asNumber(payload.input_cost),
      transport_cost: asNumber(payload.transport_cost),
      currency: 'GHS',
      source: 'Daily Activity',
      vendor: 'Farm operations',
      payment_method: 'Internal',
      approved_by: payload.approved_by,
      status: cost > 0
        ? (payload.status === 'Approved' ? 'Approved' : 'Pending')
        : 'Cancelled',
      notes: `Automatically synchronized from daily activity ${activityCode}.`,
    };

    let expense;
    if (activity.expense_id) {
      expense = await base44.entities.FarmExpense.update(activity.expense_id, expensePayload);
    } else if (cost > 0) {
      expense = await base44.entities.FarmExpense.create({
        ...expensePayload,
        expense_code: code('FEXP'),
      });
    }

    if (expense?.id && activity.id && activity.expense_id !== expense.id) {
      await base44.entities.DailyActivity.update(activity.id, {
        expense_id: expense.id,
        expense_code: expense.expense_code,
        expense_recorded_at: new Date().toISOString(),
      });
    }

    return expense;
  };

  const syncHarvestBatch = async (payload) => {
    const totalHarvest = asNumber(payload.grade_a_kg) + asNumber(payload.grade_b_kg) + asNumber(payload.rejected_kg);
    if (totalHarvest <= 0) throw new Error('Harvest activity must include Grade A, Grade B, and/or Rejected quantities.');

    const farmBlock = resolveFarmBlock(payload);
    const batchNumber = payload.batch_number || `BATCH-${Date.now().toString().slice(-8)}`;
    const harvestCode = payload.harvest_code || code('HB');
    const batch = await base44.entities.HarvestBatch.create({
      ...payload,
      ...farmBlock,
      harvest_code: harvestCode,
      harvest_date: payload.harvest_date || payload.activity_date || today,
      quantity_harvested_kg: totalHarvest,
      batch_number: batchNumber,
      qr_code: payload.qr_code || `QR-${batchNumber}`,
      destination: payload.destination || 'Warehouse',
      status: payload.status || 'QC Pending',
    });

    await Promise.all([
      base44.entities.HarvestGrade.create({ batch_number: batchNumber, grade: 'Grade A', quantity_kg: asNumber(payload.grade_a_kg), destination: 'Export/Warehouse' }).catch(() => null),
      base44.entities.HarvestGrade.create({ batch_number: batchNumber, grade: 'Grade B', quantity_kg: asNumber(payload.grade_b_kg), destination: 'Local Sales/Processing' }).catch(() => null),
      base44.entities.HarvestGrade.create({ batch_number: batchNumber, grade: 'Rejected', quantity_kg: asNumber(payload.rejected_kg), destination: 'Waste/Losses' }).catch(() => null),
      base44.entities.StockMovement.create({
        product_name: `${payload.mango_variety || 'Mango'} harvest batch ${batchNumber}`,
        warehouse_name: payload.warehouse || payload.destination || 'Main Packhouse',
        movement_type: 'in',
        quantity: totalHarvest,
        movement_date: payload.harvest_date || today,
      }).catch(() => null),
      base44.entities.QualityCheck.create({
        qc_code: code('QC'),
        inspection_date: payload.harvest_date || today,
        batch_number: batchNumber,
        ...farmBlock,
        inspector: payload.inspector || 'QC Officer',
        stage: 'Harvest inspection',
        total_quantity: totalHarvest,
        sample_size: Math.max(1, Math.round(totalHarvest * 0.04)),
        grade_a_kg: asNumber(payload.grade_a_kg),
        grade_b_kg: asNumber(payload.grade_b_kg),
        rejected_kg: asNumber(payload.rejected_kg),
        defect_type: payload.defect_type || 'Pending inspection',
        defect_percentage: totalHarvest ? Math.round((asNumber(payload.rejected_kg) / totalHarvest) * 1000) / 10 : 0,
        export_approved: 'Pending',
        status: 'Pending',
        notes: 'Auto-created from harvest batch.',
      }).catch(() => null),
      asNumber(payload.rejected_kg) > 0 ? base44.entities.WasteLoss.create({
        loss_code: code('WL'),
        loss_date: payload.harvest_date || today,
        ...farmBlock,
        batch_number: batchNumber,
        loss_type: 'Rejected Fruit',
        quantity: asNumber(payload.rejected_kg),
        unit: 'kg',
        estimated_value: asNumber(payload.rejected_kg) * 8.5,
        reason: 'Rejected during harvest grading.',
        reported_by: payload.supervisor || 'Supervisor',
        action_taken: 'Moved to Waste & Losses review.',
        status: 'Recorded',
      }).catch(() => null) : null,
      notify('Harvest batch created', `${batchNumber} created with ${formatNumber(totalHarvest)} kg and QR traceability.`, 'harvest'),
    ]);

    return batch;
  };

  const createDailyActivity = async (payload) => {
    const harvestTotal = asNumber(payload.grade_a_quantity) + asNumber(payload.grade_b_quantity) + asNumber(payload.rejected_quantity);
    const isHarvest = payload.category === 'Harvesting';
    const isChemical = payload.category === 'Spraying' || asNumber(payload.chemical_used) > 0;
    const usesEquipment = Boolean(payload.equipment_used);

    assertEquipmentAvailable(payload);
    if (!payload.log_entry && isHarvest && harvestTotal <= 0) throw new Error('Harvest activity must require grade quantities.');
    if (!payload.log_entry && isChemical && !payload.weather_condition) throw new Error('Chemical application must require weather condition.');
    if (usesEquipment && (!payload.equipment_operator || !payload.equipment_condition)) throw new Error('Equipment usage must require operator and condition.');
    if (payload.status === 'Approved' && (usesEquipment && (!payload.equipment_operator || !payload.equipment_condition))) {
      throw new Error('Activity cannot be approved unless required usage logs are completed.');
    }

    const farmBlock = resolveFarmBlock(payload);
    const activityCode = payload.activity_code || code('DA');
    const totalHours = hoursBetween(payload.start_time, payload.end_time);
    const itemizedCost = asNumber(payload.labour_cost) + asNumber(payload.equipment_cost) + asNumber(payload.fuel_cost) + asNumber(payload.input_cost) + asNumber(payload.transport_cost);
    const cost = payload.actual_cost === '' || payload.actual_cost == null ? itemizedCost : asNumber(payload.actual_cost);
    if (asNumber(payload.chemical_used) || asNumber(payload.fertilizer_used) || asNumber(payload.quantity_used)) {
      await deductFarmInputStock({
        inputName: payload.input_name || payload.category,
        inputType: isChemical ? 'Chemical' : payload.fertilizer_used ? 'Fertilizer' : undefined,
        quantity: asNumber(payload.quantity_used || payload.chemical_used || payload.fertilizer_used),
        reference: activityCode,
      });
    }
    const activity = await base44.entities.DailyActivity.create({
      ...payload,
      ...farmBlock,
      activity_code: activityCode,
      activity_date: payload.activity_date || today,
      title: payload.title || payload.activity_title,
      total_hours: totalHours,
      harvest_quantity: isHarvest
        ? (harvestTotal || asNumber(payload.output_quantity_kg ?? payload.quantity_used))
        : asNumber(payload.harvest_quantity),
      cost,
      created_by: payload.created_by || 'Supervisor',
      updated_by: payload.updated_by || 'Supervisor',
    });

    await syncActivityExpense(activity, payload, farmBlock, cost);

    await Promise.all([
      payload.assigned_workers ? base44.entities.ActivityWorker.create({
        activity_code: activityCode,
        worker_name: payload.assigned_workers,
        team: payload.team_name,
        output_kg: asNumber(payload.harvest_quantity || harvestTotal),
        output_crates: asNumber(payload.crates_used),
        hours_worked: totalHours,
      }).catch(() => null) : null,
      usesEquipment ? base44.entities.ActivityEquipment.create({
        activity_code: activityCode,
        equipment_name: payload.equipment_used,
        operator: payload.equipment_operator,
        condition: payload.equipment_condition,
        fuel_consumed: asNumber(payload.fuel_used),
      }).catch(() => null) : null,
      usesEquipment ? base44.entities.EquipmentUsage.create({
        usage_code: code('EU'),
        usage_date: payload.activity_date || today,
        equipment_name: payload.equipment_used,
        activity: payload.category,
        ...farmBlock,
        operator: payload.equipment_operator,
        start_time: payload.start_time,
        end_time: payload.end_time,
        hours_used: totalHours,
        fuel_issued: asNumber(payload.fuel_used),
        fuel_consumed: asNumber(payload.fuel_used),
        opening_condition: payload.equipment_condition,
        closing_condition: payload.equipment_condition,
        damage_reported: payload.equipment_condition === 'Damaged' ? 'Damage reported' : 'None',
        returned: 'Yes',
        returned_time: payload.end_time,
        supervisor_approval: payload.status === 'Approved' ? 'Approved' : 'Pending',
      }).catch(() => null) : null,
      usesEquipment && payload.equipment_condition === 'Damaged' ? base44.entities.Equipment.update(
        (data.equipment || []).find((item) => item.equipment_name === payload.equipment_used)?.id,
        { status: 'Needs Repair', condition: 'Damaged' },
      ).catch(() => null) : null,
      (asNumber(payload.fertilizer_used) || asNumber(payload.chemical_used) || asNumber(payload.quantity_used) || asNumber(payload.crates_used)) ? base44.entities.ActivityInput.create({
        activity_code: activityCode,
        input_name: payload.input_name || payload.category,
        quantity_used: asNumber(payload.quantity_used || payload.fertilizer_used || payload.chemical_used || payload.crates_used),
        unit: payload.unit,
      }).catch(() => null) : null,
      (asNumber(payload.fuel_used) || asNumber(payload.quantity_used)) ? base44.entities.InventoryUsage.create({
        usage_code: code('IU'),
        usage_date: payload.activity_date || today,
        item: payload.input_name || (asNumber(payload.fuel_used) ? 'Fuel' : payload.category),
        item_category: asNumber(payload.fuel_used) ? 'Fuel' : payload.category,
        ...farmBlock,
        activity: payload.category,
        quantity_issued: asNumber(payload.quantity_used || payload.fuel_used),
        quantity_used: asNumber(payload.quantity_used || payload.fuel_used),
        quantity_returned: 0,
        wastage: 0,
        unit_cost: asNumber(payload.unit_cost),
        total_cost: asNumber(payload.input_cost || payload.fuel_cost),
        issued_by: 'Inventory Officer',
        received_by: payload.equipment_operator || payload.supervisor_name,
        approved_by: payload.supervisor_name,
        notes: `Auto-created from ${activityCode}`,
      }).catch(() => null) : null,
      cost > 0 ? createFinanceRecord({ ...payload, ...farmBlock, amount: cost, category: payload.cost_type || payload.category, description: payload.title }) : null,
      isChemical ? base44.entities.FarmComplianceRecord.create({
        record_code: code('FC'),
        ...farmBlock,
        compliance_area: 'Spray Records',
        requirement: 'Weather condition and chemical usage logged',
        status: 'complete',
        due_date: payload.activity_date || today,
        completed_date: payload.activity_date || today,
        evidence_reference: activityCode,
        notes: payload.weather_condition,
      }).catch(() => null) : null,
      isChemical ? createDocumentRecord('Spray Compliance Documents', activityCode) : null,
      (payload.photos || payload.videos) ? createDocumentRecord('Activity Attachments', activityCode) : null,
      base44.entities.FarmProcessLog.create({
        log_code: code('FPL'),
        phase: isHarvest ? 'harvest' : 'crop_management',
        ...farmBlock,
        activity_title: payload.title || payload.activity_title || payload.category,
        performed_by_name: payload.assigned_workers || payload.team_name || payload.supervisor_name,
        role_or_team: payload.team_name,
        activity_date: payload.activity_date || today,
        start_time: payload.start_time,
        end_time: payload.end_time,
        quantity: isHarvest ? harvestTotal : asNumber(payload.quantity_used),
        unit_of_measure: payload.unit,
        status: String(payload.status || '').toLowerCase().replaceAll(' ', '_') === 'completed' ? 'completed' : 'in_progress',
        created_by_name: payload.created_by || 'Supervisor',
        recorded_at: new Date().toISOString(),
        notes: payload.notes,
      }).catch(() => null),
      base44.entities.DailyReport.create({
        report_code: code('DR'),
        ...farmBlock,
        report_date: payload.activity_date || today,
        supervisor: payload.supervisor_name,
        workers_present: payload.assigned_workers ? String(payload.assigned_workers).split(',').length : 0,
        workers_absent: 0,
        activities_completed: payload.status === 'Completed' || payload.status === 'Approved' ? 1 : 0,
        activities_pending: payload.status === 'Completed' || payload.status === 'Approved' ? 0 : 1,
        harvest_quantity: isHarvest ? harvestTotal : 0,
        grade_a: asNumber(payload.grade_a_quantity),
        grade_b: asNumber(payload.grade_b_quantity),
        rejected: asNumber(payload.rejected_quantity),
        equipment_used: payload.equipment_used,
        fuel_used: asNumber(payload.fuel_used),
        fertilizers_used: asNumber(payload.fertilizer_used),
        chemicals_used: asNumber(payload.chemical_used),
        weather: payload.weather_condition,
        incidents: payload.safety_incident || 'None',
        losses: asNumber(payload.rejected_quantity),
        expenses: cost,
        photos: payload.photos,
        tomorrow_plan: '',
        supervisor_signature: payload.supervisor_name,
        manager_approval: payload.status === 'Approved' ? 'Approved' : 'Pending',
        status: payload.status === 'Approved' ? 'Approved' : 'Submitted',
      }).catch(() => null),
      createDocumentRecord('Daily Report PDFs', activityCode),
      createApproval('Daily Activity', activityCode, payload.status === 'Approved' ? 'Approved' : 'Requested'),
      notify('Activity awaiting review', `${activityCode} ${payload.category} recorded for ${farmBlock.farm_name}.`, 'daily_activity'),
      isHarvest ? syncHarvestBatch({
        harvest_date: payload.activity_date || today,
        ...farmBlock,
        team: payload.team_name,
        supervisor: payload.supervisor_name,
        picker_worker: payload.assigned_workers,
        mango_variety: payload.mango_variety || 'Kent',
        grade_a_kg: asNumber(payload.grade_a_quantity),
        grade_b_kg: asNumber(payload.grade_b_quantity),
        rejected_kg: asNumber(payload.rejected_quantity),
        crates_used: asNumber(payload.crates_used),
        destination: payload.destination,
        warehouse: payload.destination || 'Main Packhouse',
        truck: payload.truck,
        driver: payload.driver,
        notes: `Created from daily activity ${activityCode}`,
      }).catch(() => null) : null,
    ]);

    return activity;
  };

  const createDailyLogEntry = (payload) => createDailyActivity({
    ...payload,
    log_entry: true,
    // Keep the legacy revenue property synchronized for historical reports.
    revenue: asNumber(payload.actual_revenue),
    supervisor_name: payload.responsible,
    assigned_workers: payload.responsible,
    status: 'Completed',
    created_by: payload.responsible || 'Supervisor',
    updated_by: payload.responsible || 'Supervisor',
  });

  const createWorkOrder = async (payload) => {
    const farmBlock = resolveFarmBlock(payload);
    assertEquipmentAvailable(payload);
    const workOrderCode = payload.work_order_code || code('WO');
    const record = await base44.entities.WorkOrder.create({
      ...payload,
      ...farmBlock,
      work_order_code: workOrderCode,
      status: payload.status || 'Draft',
    });
    await Promise.all([
      createApproval('Work Order', workOrderCode, payload.status === 'Approved' ? 'Approved' : 'Requested'),
      notify('Work order created', `${workOrderCode} scheduled for ${formatDate(payload.scheduled_date)}.`, 'work_order'),
    ]);
    return record;
  };

  const updateDailyActivity = async (record, payload) => {
    if (!record?.id) throw new Error('Select an activity to edit.');
    const nextPayload = { ...record, ...payload, id: record.id };
    const harvestTotal = asNumber(nextPayload.grade_a_quantity) + asNumber(nextPayload.grade_b_quantity) + asNumber(nextPayload.rejected_quantity);
    const isHarvest = nextPayload.category === 'Harvesting';
    const isChemical = nextPayload.category === 'Spraying' || asNumber(nextPayload.chemical_used) > 0;
    const usesEquipment = Boolean(nextPayload.equipment_used);

    assertEquipmentAvailable(nextPayload, record.activity_code);
    if (!nextPayload.log_entry && isHarvest && harvestTotal <= 0) throw new Error('Harvest activity must require grade quantities.');
    if (!nextPayload.log_entry && isChemical && !nextPayload.weather_condition) throw new Error('Chemical application must require weather condition.');
    if (usesEquipment && (!nextPayload.equipment_operator || !nextPayload.equipment_condition)) throw new Error('Equipment usage must require operator and condition.');

    const farmBlock = resolveFarmBlock(nextPayload);
    const totalHours = hoursBetween(nextPayload.start_time, nextPayload.end_time);
    const itemizedCost = asNumber(nextPayload.labour_cost) + asNumber(nextPayload.equipment_cost) + asNumber(nextPayload.fuel_cost) + asNumber(nextPayload.input_cost) + asNumber(nextPayload.transport_cost);
    const cost = nextPayload.actual_cost === '' || nextPayload.actual_cost == null ? itemizedCost : asNumber(nextPayload.actual_cost);
    const updated = await base44.entities.DailyActivity.update(record.id, {
      ...payload,
      ...farmBlock,
      title: nextPayload.title || nextPayload.activity_title,
      total_hours: totalHours,
      harvest_quantity: isHarvest
        ? (harvestTotal || asNumber(nextPayload.output_quantity_kg ?? nextPayload.quantity_used))
        : asNumber(nextPayload.harvest_quantity),
      cost,
      updated_by: nextPayload.updated_by || 'Supervisor',
    });
    await syncActivityExpense({ ...record, ...updated }, nextPayload, farmBlock, cost);
    await createAuditLog('Edited', 'Daily Activity', record.activity_code, 'Activity fields updated');
    load();
    return updated;
  };

  const updateWorkOrder = async (record, payload) => {
    if (!record?.id) throw new Error('Select a work order to edit.');
    const nextPayload = { ...record, ...payload, id: record.id };
    assertEquipmentAvailable(nextPayload, record.work_order_code);
    const farmBlock = resolveFarmBlock(nextPayload);
    const updated = await base44.entities.WorkOrder.update(record.id, {
      ...payload,
      ...farmBlock,
      status: nextPayload.status || 'Draft',
    });
    await createAuditLog('Edited', 'Work Order', record.work_order_code, 'Work order fields updated');
    load();
    return updated;
  };

  const convertCompletedWorkOrders = async () => {
    const candidates = (data.workOrders || []).filter((order) => order.status === 'Completed' && !String(order.completion_notes || '').includes('Converted by Farm Daily Activities'));
    if (candidates.length === 0) {
      toast({ title: 'No completed work orders need conversion' });
      return;
    }

    await Promise.all(candidates.map((order) => createDailyActivity({
      activity_date: order.scheduled_date || today,
      farm_id: order.farm_id,
      farm_name: order.farm_name,
      block_id: order.block_id,
      block_name: order.block_name,
      category: order.category,
      title: order.title,
      description: order.completion_notes,
      priority: order.priority,
      supervisor_name: order.supervisor_name,
      team_name: order.assigned_team,
      assigned_workers: order.workers,
      start_time: order.start_time,
      end_time: order.end_time,
      equipment_used: order.equipment_required,
      equipment_operator: order.supervisor_name || 'Supervisor',
      equipment_condition: 'Good',
      labour_cost: order.actual_cost || order.estimated_cost,
      status: 'Completed',
      approved_by: order.approved_by,
    })));
    await Promise.all(candidates.map((order) => base44.entities.WorkOrder.update(order.id, {
      completion_notes: `${order.completion_notes || ''} Converted by Farm Daily Activities.`,
    })));
    toast({ title: `${candidates.length} work order(s) converted` });
    load();
  };

  const createAttendance = async (payload) => {
    const farmBlock = resolveFarmBlock(payload);
    const hoursWorked = hoursBetween(payload.clock_in, payload.clock_out);
    const overtime = Math.max(0, hoursWorked - 8);
    const totalPay = asNumber(payload.daily_rate) + (asNumber(payload.piece_rate) * asNumber(payload.output_kg)) + asNumber(payload.bonus) - asNumber(payload.deduction);
    const record = await base44.entities.FarmAttendance.create({
      ...payload,
      ...farmBlock,
      attendance_code: code('ATT'),
      attendance_date: payload.attendance_date || today,
      hours_worked: hoursWorked,
      overtime_hours: overtime,
      total_pay: totalPay,
    });
    await Promise.all([
      base44.entities.Expense.create({
        expense_number: code('EXP'),
        category: 'Labour',
        expense_date: payload.attendance_date || today,
        amount: totalPay,
        status: 'pending',
      }).catch(() => null),
      createFinanceRecord({ ...payload, ...farmBlock, amount: totalPay, category: 'Labour', description: `Daily wage for ${payload.worker_name}` }),
    ]);
    return record;
  };

  const createEquipment = (payload) => base44.entities.Equipment.create({
    ...payload,
    equipment_code: payload.equipment_code || code('EQ'),
  });

  const createEquipmentUsage = async (payload) => {
    assertEquipmentAvailable({
      ...payload,
      equipment_used: payload.equipment_name,
      activity_date: payload.usage_date,
      status: payload.returned === 'Yes' ? 'Completed' : 'In Use',
    });
    const farmBlock = resolveFarmBlock(payload);
    const record = await base44.entities.EquipmentUsage.create({
      ...payload,
      ...farmBlock,
      usage_code: payload.usage_code || code('EU'),
      usage_date: payload.usage_date || today,
      hours_used: asNumber(payload.hours_used || hoursBetween(payload.start_time, payload.end_time)),
      supervisor_approval: payload.supervisor_approval || 'Pending',
    });
    const equipmentRecord = (data.equipment || []).find((item) => item.equipment_name === payload.equipment_name);
    if (equipmentRecord?.id) {
      await base44.entities.Equipment.update(equipmentRecord.id, {
        status: payload.returned === 'Yes' ? 'Available' : 'In Use',
        condition: payload.closing_condition || payload.opening_condition || equipmentRecord.condition,
        current_location: payload.block_name || payload.farm_name || equipmentRecord.current_location,
      }).catch(() => null);
    }
    await createAuditLog('Issued/Returned', 'Equipment', payload.equipment_name, payload.returned === 'Yes' ? 'Equipment returned' : 'Equipment issued');
    return record;
  };

  const createInput = (payload) => base44.entities.FarmInput.create({
    ...payload,
    input_code: payload.input_code || code('IN'),
    status: asNumber(payload.stock_quantity) <= asNumber(payload.reorder_level) ? 'Low Stock' : (payload.status || 'Available'),
  });

  const createInputUsage = async (payload) => {
    if (payload.input_type === 'Chemical' && (!payload.weather_condition || !payload.wind_speed)) {
      throw new Error('Chemical application requires weather condition and wind speed.');
    }
    const farmBlock = resolveFarmBlock(payload);
    const remaining = asNumber(payload.quantity_issued) - asNumber(payload.quantity_used);
    await deductFarmInputStock({
      inputName: payload.input_name,
      inputType: payload.input_type,
      quantity: payload.quantity_used,
      reference: payload.application_code,
    });
    const record = await base44.entities.InputUsage.create({
      ...payload,
      ...farmBlock,
      application_code: payload.application_code || code('IA'),
      application_date: payload.application_date || today,
      remaining_quantity: remaining,
      status: payload.status || 'Recorded',
    });
    await Promise.all([
      base44.entities.InventoryUsage.create({
        usage_code: code('IU'),
        usage_date: payload.application_date || today,
        item: payload.input_name,
        item_category: payload.input_type,
        ...farmBlock,
        activity: payload.activity,
        quantity_issued: asNumber(payload.quantity_issued),
        quantity_used: asNumber(payload.quantity_used),
        quantity_returned: remaining,
        wastage: 0,
        unit_cost: asNumber(payload.unit_cost),
        total_cost: asNumber(payload.unit_cost) * asNumber(payload.quantity_used),
        issued_by: 'Inventory Officer',
        received_by: payload.applied_by,
        approved_by: payload.supervisor,
        notes: 'Auto-created from chemical/fertilizer usage.',
      }).catch(() => null),
      base44.entities.FarmComplianceRecord.create({
        record_code: code('FC'),
        ...farmBlock,
        compliance_area: payload.input_type === 'Chemical' ? 'Spray Records' : 'Fertilizer Records',
        requirement: `${payload.input_type} usage logged with batch and weather data`,
        status: 'complete',
        due_date: payload.application_date || today,
        completed_date: payload.application_date || today,
        evidence_reference: record.application_code,
        notes: payload.notes,
      }).catch(() => null),
      createDocumentRecord(payload.input_type === 'Chemical' ? 'Spray Compliance Documents' : 'Fertilizer Application Log', record.application_code),
      notify(`${payload.input_type} usage recorded`, `${payload.input_name} usage deducted from inventory.`, 'input_usage'),
    ]);
    return record;
  };

  const createInventoryUsage = async (payload) => {
    const farmBlock = resolveFarmBlock(payload);
    const totalCost = asNumber(payload.quantity_used) * asNumber(payload.unit_cost);
    await deductFarmInputStock({
      inputName: payload.item,
      inputType: payload.item_category,
      quantity: asNumber(payload.quantity_used) + asNumber(payload.wastage),
      reference: payload.usage_code,
    });
    const record = await base44.entities.InventoryUsage.create({
      ...payload,
      ...farmBlock,
      usage_code: payload.usage_code || code('IU'),
      usage_date: payload.usage_date || today,
      total_cost: totalCost,
    });
    await createFinanceRecord({ ...payload, ...farmBlock, amount: totalCost, category: payload.item_category, description: payload.item });
    return record;
  };

  const createQc = async (payload) => {
    const farmBlock = resolveFarmBlock(payload);
    const total = asNumber(payload.grade_a_kg) + asNumber(payload.grade_b_kg) + asNumber(payload.rejected_kg);
    const record = await base44.entities.QualityCheck.create({
      ...payload,
      ...farmBlock,
      qc_code: payload.qc_code || code('QC'),
      inspection_date: payload.inspection_date || today,
      total_quantity: asNumber(payload.total_quantity || total),
    });
    if (asNumber(payload.rejected_kg) > 0) {
      await base44.entities.WasteLoss.create({
        loss_code: code('WL'),
        loss_date: payload.inspection_date || today,
        ...farmBlock,
        batch_number: payload.batch_number,
        loss_type: 'Rejected Fruit',
        quantity: asNumber(payload.rejected_kg),
        unit: 'kg',
        estimated_value: asNumber(payload.rejected_kg) * 8.5,
        reason: payload.defect_type || 'QC rejection',
        reported_by: payload.inspector,
        action_taken: 'Auto-created from QC inspection.',
        status: 'Recorded',
      }).catch(() => null);
    }
    await createApproval('Quality Control', record.qc_code, payload.status === 'Approved' ? 'Approved' : 'Requested');
    return record;
  };

  const createLoss = async (payload) => {
    const farmBlock = resolveFarmBlock(payload);
    const record = await base44.entities.WasteLoss.create({
      ...payload,
      ...farmBlock,
      loss_code: payload.loss_code || code('WL'),
      loss_date: payload.loss_date || today,
    });
    await createFinanceRecord({ ...payload, ...farmBlock, amount: payload.estimated_value, category: 'Waste & Losses', description: payload.reason });
    await createApproval('Waste & Losses', record.loss_code, payload.status === 'Approved' ? 'Approved' : 'Requested');
    return record;
  };

  const createWeather = (payload) => base44.entities.WeatherLog.create({
    ...payload,
    ...resolveFarmBlock(payload),
    weather_code: payload.weather_code || code('WL'),
    weather_date: payload.weather_date || today,
  });

  const createConfigRecord = (noteType) => async (payload) => (
    base44.entities.FarmNote.create({
      note_code: code('CFG'),
      note_type: noteType,
      title: payload.name || payload.role || noteType,
      content: JSON.stringify(payload),
      status: payload.status || 'Active',
      created_by: 'Farm Manager',
    })
  );

  const createReceiptUpload = async (payload) => {
    await createDocumentRecord('Receipts', payload.receipt_upload || payload.expense_code || code('RCT'));
    const expense = (data.farmExpenses || []).find((item) => item.expense_code === payload.expense_code);
    if (expense?.id) await base44.entities.FarmExpense.update(expense.id, { receipt_upload: payload.receipt_upload }).catch(() => null);
    await createAuditLog('Uploaded', 'Receipt', payload.expense_code || payload.receipt_upload, 'Receipt file attached');
  };

  const createExpense = async (payload) => {
    const farmBlock = resolveFarmBlock(payload);
    const record = await base44.entities.FarmExpense.create({
      ...payload,
      ...farmBlock,
      expense_code: payload.expense_code || code('FEXP'),
      expense_date: payload.expense_date || today,
    });
    if (payload.status === 'Approved') await createFinanceRecord({ ...payload, ...farmBlock, amount: payload.amount, category: payload.category, description: payload.description });
    await createApproval('Expense', record.expense_code, payload.status === 'Approved' ? 'Approved' : 'Requested');
    return record;
  };

  const createReport = async (payload) => {
    const farmBlock = resolveFarmBlock(payload);
    const record = await base44.entities.DailyReport.create({
      ...payload,
      ...farmBlock,
      report_code: payload.report_code || code('DR'),
      report_date: payload.report_date || today,
    });
    await Promise.all([
      createApproval('Daily Report', record.report_code, payload.status === 'Approved' ? 'Approved' : 'Requested'),
      createDocumentRecord('Daily Report PDFs', record.report_code),
      notify('Daily supervisor report submitted', `${record.report_code} is ready for manager approval.`, 'daily_report'),
    ]);
    return record;
  };

  const dailyActivityLogFields = [
    { name: 'activity_date', label: 'Date', type: 'date', defaultValue: today, required: true },
    { name: 'title', label: 'Task Description', placeholder: 'Describe the work completed', required: true },
    { name: 'item_tag', label: 'Item Tag', placeholder: 'Item, tool, material, or reference' },
    { name: 'quantity_used', label: 'Quantity', type: 'number', defaultValue: 0 },
    { name: 'responsible', label: 'Responsible', placeholder: 'Person or team responsible', required: true },
    { name: 'contact', label: 'Contact', type: 'tel', placeholder: 'Phone number' },
    { name: 'block_id', label: 'Farm Block', type: 'select', options: blockOptions, defaultValue: blockOptions[0]?.value, required: true },
    { name: 'projected_cost', label: 'Projected Cost (₵)', type: 'number', defaultValue: 0 },
    { name: 'actual_cost', label: 'Actual Cost (₵)', type: 'number', defaultValue: 0 },
    { name: 'projected_revenue', label: 'Projected Revenue (₵)', type: 'number', defaultValue: 0 },
    { name: 'actual_revenue', label: 'Actual Revenue (₵)', type: 'number', defaultValue: 0 },
    { name: 'output_quantity_kg', label: 'Harvest / Output Quantity (kg)', type: 'number', defaultValue: 0 },
    { name: 'cost_type', label: 'Type of Cost', type: 'select', options: selectOptions(activityCostTypes), defaultValue: 'Labour', required: true },
    { name: 'category', label: 'Farm Activity Type', type: 'select', options: selectOptions(activityCategories), defaultValue: 'Land Clearing', required: true },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ];

  const activityFields = [
    { name: 'activity_code', label: 'Activity ID', placeholder: 'Auto if blank' },
    { name: 'activity_date', label: 'Date', type: 'date', defaultValue: today, required: true },
    { name: 'farm_id', label: 'Farm', type: 'select', options: farmOptions, defaultValue: farmOptions[0]?.value, required: true },
    { name: 'block_id', label: 'Block/Field', type: 'select', options: blockOptions, defaultValue: blockOptions[0]?.value },
    { name: 'category', label: 'Activity Category', type: 'select', options: selectOptions(activityCategories), defaultValue: 'Harvesting', required: true },
    { name: 'title', label: 'Activity Title', required: true },
    { name: 'description', label: 'Description', type: 'textarea', wide: true },
    { name: 'priority', label: 'Priority', type: 'select', options: selectOptions(priorities), defaultValue: 'high' },
    { name: 'supervisor_name', label: 'Supervisor', required: true },
    { name: 'team_name', label: 'Assigned Team' },
    { name: 'assigned_workers', label: 'Assigned Workers' },
    { name: 'start_time', label: 'Start Time', type: 'time', required: true },
    { name: 'end_time', label: 'End Time', type: 'time', required: true },
    { name: 'equipment_used', label: 'Equipment Used' },
    { name: 'equipment_operator', label: 'Equipment Operator' },
    { name: 'equipment_condition', label: 'Equipment Condition' },
    { name: 'fuel_used', label: 'Fuel Used', type: 'number', defaultValue: 0 },
    { name: 'fertilizer_used', label: 'Fertilizer Used', type: 'number', defaultValue: 0 },
    { name: 'chemical_used', label: 'Chemical Used', type: 'number', defaultValue: 0 },
    { name: 'quantity_used', label: 'Quantity Used', type: 'number', defaultValue: 0 },
    { name: 'unit', label: 'Unit', defaultValue: 'kg' },
    { name: 'grade_a_quantity', label: 'Grade A Quantity', type: 'number', defaultValue: 0 },
    { name: 'grade_b_quantity', label: 'Grade B Quantity', type: 'number', defaultValue: 0 },
    { name: 'rejected_quantity', label: 'Rejected Quantity', type: 'number', defaultValue: 0 },
    { name: 'crates_used', label: 'Crates Used', type: 'number', defaultValue: 0 },
    { name: 'destination', label: 'Destination' },
    { name: 'labour_cost', label: 'Labour Cost (₵)', type: 'number', defaultValue: 0 },
    { name: 'equipment_cost', label: 'Equipment Cost (₵)', type: 'number', defaultValue: 0 },
    { name: 'fuel_cost', label: 'Fuel Cost (₵)', type: 'number', defaultValue: 0 },
    { name: 'input_cost', label: 'Input Cost (₵)', type: 'number', defaultValue: 0 },
    { name: 'transport_cost', label: 'Transport Cost (₵)', type: 'number', defaultValue: 0 },
    { name: 'revenue', label: 'Revenue (₵)', type: 'number', defaultValue: 0 },
    { name: 'photos', label: 'Photos', type: 'file', accept: 'image/*' },
    { name: 'videos', label: 'Videos', type: 'file', accept: 'video/*' },
    { name: 'gps_coordinates', label: 'GPS Coordinates' },
    { name: 'weather_condition', label: 'Weather Condition' },
    { name: 'safety_incident', label: 'Safety Incident' },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
    { name: 'status', label: 'Status', type: 'select', options: selectOptions(activityStatuses), defaultValue: 'Completed' },
    { name: 'approved_by', label: 'Approved By' },
    { name: 'created_by', label: 'Created By', defaultValue: 'Supervisor' },
    { name: 'updated_by', label: 'Updated By', defaultValue: 'Supervisor' },
  ];

  const workOrderFields = [
    { name: 'work_order_code', label: 'Work Order ID', placeholder: 'Auto if blank' },
    { name: 'title', label: 'Title', required: true },
    { name: 'farm_id', label: 'Farm', type: 'select', options: farmOptions, defaultValue: farmOptions[0]?.value, required: true },
    { name: 'block_id', label: 'Block', type: 'select', options: blockOptions, defaultValue: blockOptions[0]?.value },
    { name: 'category', label: 'Category', type: 'select', options: selectOptions(activityCategories), defaultValue: 'Harvesting' },
    { name: 'priority', label: 'Priority', type: 'select', options: selectOptions(priorities), defaultValue: 'high' },
    { name: 'supervisor_name', label: 'Supervisor' },
    { name: 'assigned_team', label: 'Assigned Team' },
    { name: 'workers', label: 'Workers' },
    { name: 'scheduled_date', label: 'Scheduled Date', type: 'date', defaultValue: today },
    { name: 'start_time', label: 'Start Time', type: 'time' },
    { name: 'end_time', label: 'End Time', type: 'time' },
    { name: 'equipment_required', label: 'Equipment Required' },
    { name: 'inputs_required', label: 'Inputs Required' },
    { name: 'estimated_cost', label: 'Estimated Cost', type: 'number', defaultValue: 0 },
    { name: 'actual_cost', label: 'Actual Cost', type: 'number', defaultValue: 0 },
    { name: 'status', label: 'Status', type: 'select', options: selectOptions(workOrderStatuses), defaultValue: 'Scheduled' },
    { name: 'completion_notes', label: 'Completion Notes', type: 'textarea', wide: true },
    { name: 'photos', label: 'Photos', type: 'file', accept: 'image/*' },
    { name: 'approved_by', label: 'Approved By' },
  ];

  const harvestFields = [
    { name: 'harvest_code', label: 'Harvest ID', placeholder: 'Auto if blank' },
    { name: 'harvest_date', label: 'Date', type: 'date', defaultValue: today, required: true },
    { name: 'farm_id', label: 'Farm', type: 'select', options: farmOptions, defaultValue: farmOptions[0]?.value, required: true },
    { name: 'block_id', label: 'Block', type: 'select', options: blockOptions, defaultValue: blockOptions[0]?.value },
    { name: 'team', label: 'Team' },
    { name: 'supervisor', label: 'Supervisor' },
    { name: 'picker_worker', label: 'Picker/Worker' },
    { name: 'mango_variety', label: 'Mango Variety', defaultValue: 'Kent' },
    { name: 'grade_a_kg', label: 'Grade A kg', type: 'number', defaultValue: 0 },
    { name: 'grade_b_kg', label: 'Grade B kg', type: 'number', defaultValue: 0 },
    { name: 'rejected_kg', label: 'Rejected kg', type: 'number', defaultValue: 0 },
    { name: 'crates_used', label: 'Crates Used', type: 'number', defaultValue: 0 },
    { name: 'average_crate_weight', label: 'Average Crate Weight', type: 'number', defaultValue: 20 },
    { name: 'destination', label: 'Destination', defaultValue: 'Warehouse' },
    { name: 'warehouse', label: 'Warehouse', defaultValue: 'Main Packhouse' },
    { name: 'truck', label: 'Truck' },
    { name: 'driver', label: 'Driver' },
    { name: 'batch_number', label: 'Batch Number' },
    { name: 'photos', label: 'Photos', type: 'file', accept: 'image/*' },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
    { name: 'status', label: 'Status', type: 'select', options: selectOptions(['QC Pending', 'QC Approved', 'Warehouse Transfer', 'Export Ready', 'Closed']), defaultValue: 'QC Pending' },
  ];

  const attendanceFields = [
    { name: 'worker_id', label: 'Worker ID' },
    { name: 'worker_name', label: 'Worker Name', required: true },
    { name: 'role', label: 'Role' },
    { name: 'team', label: 'Team' },
    { name: 'farm_id', label: 'Farm', type: 'select', options: farmOptions, defaultValue: farmOptions[0]?.value },
    { name: 'block_id', label: 'Block', type: 'select', options: blockOptions, defaultValue: blockOptions[0]?.value },
    { name: 'attendance_date', label: 'Date', type: 'date', defaultValue: today },
    { name: 'clock_in', label: 'Clock In', type: 'time', required: true },
    { name: 'clock_out', label: 'Clock Out', type: 'time', required: true },
    { name: 'activity', label: 'Activity' },
    { name: 'output_kg', label: 'Output kg', type: 'number', defaultValue: 0 },
    { name: 'output_crates', label: 'Output crates', type: 'number', defaultValue: 0 },
    { name: 'daily_rate', label: 'Daily Rate', type: 'number', defaultValue: 0 },
    { name: 'piece_rate', label: 'Piece Rate', type: 'number', defaultValue: 0 },
    { name: 'bonus', label: 'Bonus', type: 'number', defaultValue: 0 },
    { name: 'deduction', label: 'Deduction', type: 'number', defaultValue: 0 },
    { name: 'payment_status', label: 'Payment Status', type: 'select', options: selectOptions(['Pending', 'Approved', 'Paid']), defaultValue: 'Pending' },
  ];

  const equipmentFields = [
    { name: 'equipment_code', label: 'Equipment ID', placeholder: 'Auto if blank' },
    { name: 'equipment_name', label: 'Equipment Name', required: true },
    { name: 'category', label: 'Category', type: 'select', options: selectOptions(equipmentTypes), defaultValue: 'Pickup Truck' },
    { name: 'serial_number', label: 'Serial Number' },
    { name: 'farm_assigned', label: 'Farm Assigned' },
    { name: 'current_location', label: 'Current Location' },
    { name: 'condition', label: 'Condition', type: 'select', options: selectOptions(['Good', 'Fair', 'Needs Service', 'Damaged']), defaultValue: 'Good' },
    { name: 'status', label: 'Status', type: 'select', options: selectOptions(['Available', 'In Use', 'Needs Repair', 'Retired']), defaultValue: 'Available' },
    { name: 'assigned_operator', label: 'Assigned Operator' },
    { name: 'purchase_date', label: 'Purchase Date', type: 'date' },
    { name: 'maintenance_schedule', label: 'Maintenance Schedule' },
    { name: 'last_maintenance_date', label: 'Last Maintenance Date', type: 'date' },
    { name: 'next_maintenance_date', label: 'Next Maintenance Date', type: 'date' },
    { name: 'usage_hours', label: 'Usage Hours', type: 'number', defaultValue: 0 },
    { name: 'fuel_type', label: 'Fuel Type' },
    { name: 'fuel_consumption', label: 'Fuel Consumption', type: 'number', defaultValue: 0 },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ];

  const equipmentUsageFields = [
    { name: 'usage_date', label: 'Date', type: 'date', defaultValue: today, required: true },
    { name: 'equipment_name', label: 'Equipment Name', required: true },
    { name: 'farm_id', label: 'Farm', type: 'select', options: farmOptions, defaultValue: farmOptions[0]?.value },
    { name: 'block_id', label: 'Block', type: 'select', options: blockOptions, defaultValue: blockOptions[0]?.value },
    { name: 'activity', label: 'Activity' },
    { name: 'operator', label: 'Operator', required: true },
    { name: 'start_time', label: 'Issue Time', type: 'time' },
    { name: 'end_time', label: 'Return Time', type: 'time' },
    { name: 'hours_used', label: 'Hours Used', type: 'number', defaultValue: 0 },
    { name: 'fuel_issued', label: 'Fuel Issued', type: 'number', defaultValue: 0 },
    { name: 'fuel_consumed', label: 'Fuel Consumed', type: 'number', defaultValue: 0 },
    { name: 'opening_condition', label: 'Opening Condition', type: 'select', options: selectOptions(['Good', 'Fair', 'Needs Service', 'Damaged']), defaultValue: 'Good' },
    { name: 'closing_condition', label: 'Closing Condition', type: 'select', options: selectOptions(['Good', 'Fair', 'Needs Service', 'Damaged']), defaultValue: 'Good' },
    { name: 'damage_reported', label: 'Damage Reported' },
    { name: 'returned', label: 'Returned', type: 'select', options: selectOptions(['No', 'Yes']), defaultValue: 'No' },
    { name: 'supervisor_approval', label: 'Supervisor Approval', type: 'select', options: selectOptions(['Pending', 'Approved', 'Rejected']), defaultValue: 'Pending' },
  ];

  const inputFields = [
    { name: 'input_code', label: 'Input ID', placeholder: 'Auto if blank' },
    { name: 'input_name', label: 'Input Name', required: true },
    { name: 'type', label: 'Type', type: 'select', options: selectOptions(['Chemical', 'Fertilizer', 'Fuel', 'Packaging', 'PPE', 'Tool', 'Spare Part']), defaultValue: 'Chemical' },
    { name: 'category', label: 'Category' },
    { name: 'supplier', label: 'Supplier' },
    { name: 'batch_number', label: 'Batch Number' },
    { name: 'expiry_date', label: 'Expiry Date', type: 'date' },
    { name: 'stock_quantity', label: 'Stock Quantity', type: 'number', defaultValue: 0 },
    { name: 'unit', label: 'Unit', defaultValue: 'kg' },
    { name: 'storage_location', label: 'Storage Location' },
    { name: 'safety_notes', label: 'Safety Notes', type: 'textarea', wide: true },
    { name: 'reorder_level', label: 'Reorder Level', type: 'number', defaultValue: 0 },
    { name: 'status', label: 'Status', type: 'select', options: selectOptions(['Available', 'Low Stock', 'Expired', 'Blocked']), defaultValue: 'Available' },
  ];

  const inputUsageFields = [
    { name: 'application_date', label: 'Date', type: 'date', defaultValue: today, required: true },
    { name: 'farm_id', label: 'Farm', type: 'select', options: farmOptions, defaultValue: farmOptions[0]?.value },
    { name: 'block_id', label: 'Block', type: 'select', options: blockOptions, defaultValue: blockOptions[0]?.value },
    { name: 'activity', label: 'Activity' },
    { name: 'input_name', label: 'Input Name', required: true },
    { name: 'input_type', label: 'Input Type', type: 'select', options: selectOptions(['Chemical', 'Fertilizer']), defaultValue: 'Chemical' },
    { name: 'quantity_issued', label: 'Quantity Issued', type: 'number', defaultValue: 0 },
    { name: 'quantity_used', label: 'Quantity Used', type: 'number', defaultValue: 0 },
    { name: 'unit', label: 'Unit', defaultValue: 'kg' },
    { name: 'unit_cost', label: 'Unit Cost', type: 'number', defaultValue: 0 },
    { name: 'applied_by', label: 'Applied By' },
    { name: 'supervisor', label: 'Supervisor' },
    { name: 'weather_condition', label: 'Weather Condition' },
    { name: 'wind_speed', label: 'Wind Speed', type: 'number', defaultValue: 0 },
    { name: 'purpose', label: 'Purpose' },
    { name: 'target_pest_disease', label: 'Target Pest/Disease' },
    { name: 'application_method', label: 'Application Method' },
    { name: 'next_application_date', label: 'Next Application Date', type: 'date' },
    { name: 'photos', label: 'Photos', type: 'file', accept: 'image/*' },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
    { name: 'status', label: 'Status', type: 'select', options: selectOptions(['Recorded', 'Approved', 'Requires Review']), defaultValue: 'Recorded' },
  ];

  const inventoryUsageFields = [
    { name: 'usage_date', label: 'Date', type: 'date', defaultValue: today },
    { name: 'item', label: 'Item', required: true },
    { name: 'item_category', label: 'Item Category', type: 'select', options: selectOptions(['Fertilizers', 'Chemicals', 'Fuel', 'Crates', 'Packaging materials', 'Protective gear', 'Tools', 'Spare parts']), defaultValue: 'Fuel' },
    { name: 'farm_id', label: 'Farm', type: 'select', options: farmOptions, defaultValue: farmOptions[0]?.value },
    { name: 'block_id', label: 'Block', type: 'select', options: blockOptions, defaultValue: blockOptions[0]?.value },
    { name: 'activity', label: 'Activity' },
    { name: 'quantity_issued', label: 'Quantity Issued', type: 'number', defaultValue: 0 },
    { name: 'quantity_used', label: 'Quantity Used', type: 'number', defaultValue: 0 },
    { name: 'quantity_returned', label: 'Quantity Returned', type: 'number', defaultValue: 0 },
    { name: 'wastage', label: 'Wastage', type: 'number', defaultValue: 0 },
    { name: 'unit_cost', label: 'Unit Cost', type: 'number', defaultValue: 0 },
    { name: 'issued_by', label: 'Issued By' },
    { name: 'received_by', label: 'Received By' },
    { name: 'approved_by', label: 'Approved By' },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ];

  const qcFields = [
    { name: 'inspection_date', label: 'Date', type: 'date', defaultValue: today },
    { name: 'batch_number', label: 'Batch Number', required: true },
    { name: 'farm_id', label: 'Farm', type: 'select', options: farmOptions, defaultValue: farmOptions[0]?.value },
    { name: 'block_id', label: 'Block', type: 'select', options: blockOptions, defaultValue: blockOptions[0]?.value },
    { name: 'inspector', label: 'Inspector', required: true },
    { name: 'stage', label: 'Stage', type: 'select', options: selectOptions(['Harvest inspection', 'Sorting inspection', 'Packing inspection', 'Export readiness inspection']), defaultValue: 'Harvest inspection' },
    { name: 'total_quantity', label: 'Total Quantity', type: 'number', defaultValue: 0 },
    { name: 'sample_size', label: 'Sample Size', type: 'number', defaultValue: 0 },
    { name: 'grade_a_kg', label: 'Grade A kg', type: 'number', defaultValue: 0 },
    { name: 'grade_b_kg', label: 'Grade B kg', type: 'number', defaultValue: 0 },
    { name: 'rejected_kg', label: 'Rejected kg', type: 'number', defaultValue: 0 },
    { name: 'defect_type', label: 'Defect Type' },
    { name: 'defect_percentage', label: 'Defect Percentage', type: 'number', defaultValue: 0 },
    { name: 'fruit_size', label: 'Fruit Size' },
    { name: 'fruit_color', label: 'Fruit Color' },
    { name: 'ripeness_level', label: 'Ripeness Level' },
    { name: 'disease_signs', label: 'Disease Signs' },
    { name: 'bruising', label: 'Bruising' },
    { name: 'export_approved', label: 'Export Approved', type: 'select', options: selectOptions(['Pending', 'Yes', 'No']), defaultValue: 'Pending' },
    { name: 'photos', label: 'Photos', type: 'file', accept: 'image/*' },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
    { name: 'status', label: 'Status', type: 'select', options: selectOptions(['Pending', 'Approved', 'Rejected', 'Requires Review']), defaultValue: 'Pending' },
  ];

  const lossFields = [
    { name: 'loss_date', label: 'Date', type: 'date', defaultValue: today },
    { name: 'farm_id', label: 'Farm', type: 'select', options: farmOptions, defaultValue: farmOptions[0]?.value },
    { name: 'block_id', label: 'Block', type: 'select', options: blockOptions, defaultValue: blockOptions[0]?.value },
    { name: 'batch_number', label: 'Batch Number' },
    { name: 'loss_type', label: 'Loss Type', type: 'select', options: selectOptions(lossTypes), defaultValue: 'Rejected Fruit' },
    { name: 'quantity', label: 'Quantity', type: 'number', defaultValue: 0 },
    { name: 'unit', label: 'Unit', defaultValue: 'kg' },
    { name: 'estimated_value', label: 'Estimated Value', type: 'number', defaultValue: 0 },
    { name: 'reason', label: 'Reason', type: 'textarea', wide: true },
    { name: 'reported_by', label: 'Reported By' },
    { name: 'approved_by', label: 'Approved By' },
    { name: 'photos', label: 'Photos', type: 'file', accept: 'image/*' },
    { name: 'action_taken', label: 'Action Taken', type: 'textarea', wide: true },
    { name: 'status', label: 'Status', type: 'select', options: selectOptions(['Recorded', 'Pending Approval', 'Approved', 'Rejected']), defaultValue: 'Recorded' },
  ];

  const weatherFields = [
    { name: 'weather_date', label: 'Date', type: 'date', defaultValue: today },
    { name: 'farm_id', label: 'Farm', type: 'select', options: farmOptions, defaultValue: farmOptions[0]?.value },
    { name: 'temperature', label: 'Temperature', type: 'number', defaultValue: 0 },
    { name: 'humidity', label: 'Humidity', type: 'number', defaultValue: 0 },
    { name: 'rainfall', label: 'Rainfall', type: 'number', defaultValue: 0 },
    { name: 'wind_speed', label: 'Wind Speed', type: 'number', defaultValue: 0 },
    { name: 'cloud_cover', label: 'Cloud Cover' },
    { name: 'soil_moisture', label: 'Soil Moisture', type: 'number', defaultValue: 0 },
    { name: 'weather_condition', label: 'Weather Condition' },
    { name: 'forecast', label: 'Forecast' },
    { name: 'recorded_by', label: 'Recorded By' },
    { name: 'source', label: 'Source' },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ];

  const expenseFields = [
    { name: 'expense_date', label: 'Date', type: 'date', defaultValue: today },
    { name: 'farm_id', label: 'Farm', type: 'select', options: farmOptions, defaultValue: farmOptions[0]?.value },
    { name: 'activity', label: 'Activity' },
    { name: 'category', label: 'Category', type: 'select', options: selectOptions(expenseCategories), defaultValue: 'Labour' },
    { name: 'description', label: 'Description', type: 'textarea', wide: true },
    { name: 'amount', label: 'Amount', type: 'number', defaultValue: 0, required: true },
    { name: 'vendor', label: 'Vendor' },
    { name: 'payment_method', label: 'Payment Method' },
    { name: 'receipt_upload', label: 'Receipt Upload', type: 'file', accept: 'image/*,.pdf' },
    { name: 'approved_by', label: 'Approved By' },
    { name: 'status', label: 'Status', type: 'select', options: selectOptions(['Pending', 'Approved', 'Rejected']), defaultValue: 'Pending' },
  ];

  const receiptFields = [
    { name: 'expense_code', label: 'Expense ID', required: true },
    { name: 'receipt_upload', label: 'Receipt Upload', type: 'file', accept: 'image/*,.pdf', required: true },
  ];

  const reportFields = [
    { name: 'report_date', label: 'Date', type: 'date', defaultValue: today },
    { name: 'farm_id', label: 'Farm', type: 'select', options: farmOptions, defaultValue: farmOptions[0]?.value },
    { name: 'supervisor', label: 'Supervisor', required: true },
    { name: 'workers_present', label: 'Workers Present', type: 'number', defaultValue: 0 },
    { name: 'workers_absent', label: 'Workers Absent', type: 'number', defaultValue: 0 },
    { name: 'activities_completed', label: 'Activities Completed', type: 'number', defaultValue: 0 },
    { name: 'activities_pending', label: 'Activities Pending', type: 'number', defaultValue: 0 },
    { name: 'harvest_quantity', label: 'Harvest Quantity', type: 'number', defaultValue: 0 },
    { name: 'grade_a', label: 'Grade A', type: 'number', defaultValue: 0 },
    { name: 'grade_b', label: 'Grade B', type: 'number', defaultValue: 0 },
    { name: 'rejected', label: 'Rejected', type: 'number', defaultValue: 0 },
    { name: 'equipment_used', label: 'Equipment Used' },
    { name: 'fuel_used', label: 'Fuel Used', type: 'number', defaultValue: 0 },
    { name: 'fertilizers_used', label: 'Fertilizers Used', type: 'number', defaultValue: 0 },
    { name: 'chemicals_used', label: 'Chemicals Used', type: 'number', defaultValue: 0 },
    { name: 'weather', label: 'Weather' },
    { name: 'incidents', label: 'Incidents' },
    { name: 'losses', label: 'Losses', type: 'number', defaultValue: 0 },
    { name: 'expenses', label: 'Expenses', type: 'number', defaultValue: 0 },
    { name: 'photos', label: 'Photos', type: 'file', accept: 'image/*,.pdf' },
    { name: 'tomorrow_plan', label: 'Tomorrow’s Plan', type: 'textarea', wide: true },
    { name: 'supervisor_signature', label: 'Supervisor Signature' },
    { name: 'manager_approval', label: 'Manager Approval', type: 'select', options: selectOptions(['Pending', 'Approved', 'Rejected']), defaultValue: 'Pending' },
    { name: 'status', label: 'Status', type: 'select', options: selectOptions(['Draft', 'Submitted', 'Approved', 'Rejected']), defaultValue: 'Submitted' },
  ];

  const alertRuleFields = [
    { name: 'name', label: 'Rule Name', required: true },
    { name: 'trigger', label: 'Trigger', type: 'textarea', wide: true },
    { name: 'channel', label: 'Channel', type: 'select', options: selectOptions(['Admin', 'Email', 'SMS', 'Dashboard']), defaultValue: 'Dashboard' },
    { name: 'status', label: 'Status', type: 'select', options: selectOptions(['Active', 'Paused']), defaultValue: 'Active' },
  ];

  const workOrderTemplateFields = [
    { name: 'name', label: 'Template Name', required: true },
    { name: 'category', label: 'Category', type: 'select', options: selectOptions(activityCategories), defaultValue: 'Harvesting' },
    { name: 'priority', label: 'Priority', type: 'select', options: selectOptions(priorities), defaultValue: 'medium' },
    { name: 'supervisor_name', label: 'Default Supervisor' },
    { name: 'equipment_required', label: 'Equipment Required' },
    { name: 'inputs_required', label: 'Inputs Required' },
    { name: 'estimated_cost', label: 'Estimated Cost', type: 'number', defaultValue: 0 },
  ];

  const reportTemplateFields = [
    { name: 'name', label: 'Template Name', required: true },
    { name: 'sections', label: 'Sections', type: 'textarea', wide: true },
    { name: 'approval_required', label: 'Approval Required', type: 'select', options: selectOptions(['Yes', 'No']), defaultValue: 'Yes' },
    { name: 'status', label: 'Status', type: 'select', options: selectOptions(['Active', 'Paused']), defaultValue: 'Active' },
  ];

  const permissionFields = [
    { name: 'role', label: 'Role', required: true },
    { name: 'scope', label: 'Permission Scope', type: 'textarea', wide: true },
    { name: 'can_create', label: 'Can Create', type: 'select', options: selectOptions(['Yes', 'No']), defaultValue: 'Yes' },
    { name: 'can_approve', label: 'Can Approve', type: 'select', options: selectOptions(['Yes', 'No']), defaultValue: 'No' },
    { name: 'status', label: 'Status', type: 'select', options: selectOptions(['Active', 'Paused']), defaultValue: 'Active' },
  ];

  const todaysActivities = (data.dailyActivities || []).filter(byDate('activity_date'));
  const todaysHarvests = (data.harvestBatches || []).filter(byDate('harvest_date'));
  const todaysAttendance = (data.attendance || []).filter(byDate('attendance_date'));
  const todaysExpenses = (data.farmExpenses || []).filter(byDate('expense_date'));
  const todaysInventory = (data.inventoryUsage || []).filter(byDate('usage_date'));
  const pendingQc = (data.qualityChecks || []).filter((item) => ['Pending', 'Requires Review'].includes(item.status)).length;
  const activeWorkOrders = (data.workOrders || []).filter((item) => !['Completed', 'Cancelled', 'Approved'].includes(item.status)).length;
  const equipmentInUse = (data.equipment || []).filter((item) => item.status === 'In Use').length;
  const todaysHarvestKg = todaysHarvests.reduce((sum, item) => sum + asNumber(item.quantity_harvested_kg), 0);
  const todaysGradeA = todaysHarvests.reduce((sum, item) => sum + asNumber(item.grade_a_kg), 0);
  const todaysRejected = todaysHarvests.reduce((sum, item) => sum + asNumber(item.rejected_kg), 0);
  const todaysFuel = todaysInventory.filter((item) => item.item_category === 'Fuel').reduce((sum, item) => sum + asNumber(item.quantity_used), 0);
  const todaysChemical = (data.inputUsage || []).filter((item) => item.input_type === 'Chemical' && shortDate(item.application_date) === today).reduce((sum, item) => sum + asNumber(item.quantity_used), 0);
  const todaysFertilizer = (data.inputUsage || []).filter((item) => item.input_type === 'Fertilizer' && shortDate(item.application_date) === today).reduce((sum, item) => sum + asNumber(item.quantity_used), 0);
  const dailyFarmCost = todaysExpenses.reduce((sum, item) => sum + asNumber(item.amount), 0);
  const warehouseTransfer = todaysHarvests.filter((item) => ['Warehouse', 'Warehouse Transfer'].includes(item.destination)).reduce((sum, item) => sum + asNumber(item.quantity_harvested_kg), 0);

  const alerts = [
    ...(data.farmInputs || []).filter((item) => asNumber(item.stock_quantity) <= asNumber(item.reorder_level)).map((item) => ({ title: `Low ${item.type?.toLowerCase()} stock`, detail: `${item.input_name} has ${formatNumber(item.stock_quantity)} ${item.unit}`, type: 'Low Stock Alerts' })),
    ...(data.farmInputs || []).filter((item) => item.expiry_date && new Date(item.expiry_date) < new Date(today)).map((item) => ({ title: 'Expired chemical', detail: item.input_name, type: 'Low Stock Alerts' })),
    ...(data.equipment || []).filter((item) => item.status === 'Needs Repair' || item.condition === 'Damaged' || (item.next_maintenance_date && shortDate(item.next_maintenance_date) <= sevenDaysFromToday)).map((item) => ({ title: 'Equipment alert', detail: `${item.equipment_name} requires attention`, type: 'Equipment Alerts' })),
    ...(data.workOrders || []).filter((item) => item.status === 'Overdue' || (item.scheduled_date && new Date(item.scheduled_date) < new Date(today) && !['Completed', 'Cancelled'].includes(item.status))).map((item) => ({ title: 'Work order overdue', detail: item.title, type: 'Work Order Alerts' })),
    ...(data.qualityChecks || []).filter((item) => item.status === 'Rejected' || asNumber(item.defect_percentage) >= 10).map((item) => ({ title: 'QC alert', detail: `${item.batch_number} defect rate ${item.defect_percentage}%`, type: 'QC Alerts' })),
    ...(data.weatherLogs || []).filter((item) => asNumber(item.wind_speed) > 15 || asNumber(item.rainfall) > 5).map((item) => ({ title: 'Spraying weather risk', detail: `${item.farm_name}: wind ${item.wind_speed} km/h, rainfall ${item.rainfall} mm`, type: 'Weather Risk Alerts' })),
  ];

  const gradePie = [
    { name: 'Grade A', value: (data.harvestBatches || []).reduce((sum, item) => sum + asNumber(item.grade_a_kg), 0), color: 'hsl(150 45% 42%)' },
    { name: 'Grade B', value: (data.harvestBatches || []).reduce((sum, item) => sum + asNumber(item.grade_b_kg), 0), color: 'hsl(33 95% 52%)' },
    { name: 'Rejected', value: (data.harvestBatches || []).reduce((sum, item) => sum + asNumber(item.rejected_kg), 0), color: 'hsl(0 72% 51%)' },
  ];

  const harvestByFarm = groupSum(data.harvestBatches || [], 'farm_name', 'quantity_harvested_kg');
  const harvestByBlock = groupSum(data.harvestBatches || [], 'block_name', 'quantity_harvested_kg');
  const harvestByWorker = groupSum(data.harvestBatches || [], 'picker_worker', 'quantity_harvested_kg');
  const labourByWorker = groupSum(data.attendance || [], 'worker_name', 'output_kg');
  const costByCategory = groupSum(data.farmExpenses || [], 'category', 'amount');

  const createAction = (title, fields, onCreate, buttonLabel = title, buttonClassName) => (
    <AdminCreateDialog
      title={title}
      description="Complete the required operational fields. Related logs, approvals, stock, finance, reports, and alerts are synced automatically where applicable."
      buttonLabel={buttonLabel}
      buttonIcon={Plus}
      fields={fields}
      onCreate={onCreate}
      onCreated={load}
      submitLabel={title === 'Add Daily Activity' ? 'Save Activity' : 'Save'}
      buttonClassName={buttonClassName}
      formVariant={title === 'Add Daily Activity' ? 'daily-activity-log' : undefined}
    />
  );

  const editAction = (title, fields, record, onSubmit, buttonLabel, buttonClassName = '') => (
    <AdminCreateDialog
      title={title}
      description="Update the selected record. Related audit logs are written automatically."
      buttonLabel={buttonLabel || (record ? `Edit ${record.activity_code || record.work_order_code || 'Record'}` : 'Select a record')}
      buttonIcon={Pencil}
      fields={fields}
      initialValues={record || {}}
      onSubmit={(payload) => onSubmit(record, payload)}
      onCreated={load}
      submitLabel="Update"
      buttonVariant="outline"
      buttonClassName={buttonClassName}
    />
  );

  const renderEditPanel = ({ title, rows, columns, selectedKey, fields, onSubmit }) => {
    const selected = getSelectedRecord(selectedKey, rows);
    return (
      <Panel title={title} description="Select a row, then update that exact record." action={editAction(title, fields, selected, onSubmit)}>
        <DataTable
          items={rows}
          columns={columns}
          selectedId={selected?.id}
          onRowClick={(record) => selectRecord(selectedKey, record)}
        />
      </Panel>
    );
  };

  const renderSelectableDetail = (title, rows, columns, selectedKey, fields) => {
    const selected = getSelectedRecord(selectedKey, rows);
    return (
      <div className="space-y-4">
        <Panel title={`${title} Records`} description="Click a row to inspect that specific record below.">
          <DataTable
            items={rows}
            columns={columns}
            selectedId={selected?.id}
            onRowClick={(record) => selectRecord(selectedKey, record)}
          />
        </Panel>
        {renderDetail(selected, fields)}
      </div>
    );
  };

  const approvalActionColumns = [
    ...approvalColumns,
    {
      key: 'comment',
      label: 'Comment',
      render: (value) => value || '—',
    },
  ];

  const renderApprovalQueue = (title, rows) => (
    <Panel title={title} description="Approve or reject requests with an optional manager comment. Decisions are written to the source record and audit log.">
      <DataTable
        items={rows}
        columns={approvalActionColumns}
        rowActions={(approval) => (
          <>
            <Button
              size="sm"
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={() => updateApproval(approval, 'Approved', window.prompt('Approval comment') || '')}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => updateApproval(approval, 'Rejected', window.prompt('Rejection reason') || '')}
            >
              <XCircle className="mr-2 h-4 w-4" />Reject
            </Button>
          </>
        )}
      />
    </Panel>
  );

  const filterApprovalsForScreen = (rows, screen) => rows.filter((item) => (
    screen === 'Activity Approvals' ? item.module === 'Daily Activity'
      : screen === 'Work Order Approvals' ? item.module === 'Work Order'
        : screen === 'Expense Approvals' ? item.module === 'Expense'
          : screen === 'QC Approvals' ? item.module === 'Quality Control'
            : screen === 'Report Approvals' ? item.module === 'Daily Report'
              : true
  ));

  const configRows = (noteType) => (data.farmNotes || [])
    .filter((item) => item.note_type === noteType)
    .map((item) => {
      try {
        return { id: item.id, note_code: item.note_code, ...JSON.parse(item.content || '{}'), status: item.status };
      } catch {
        return { id: item.id, note_code: item.note_code, name: item.title, status: item.status };
      }
    });

  const renderConfigPanel = (title, noteType, fields, columns) => (
    <Panel title={title} action={createAction(`Add ${title}`, fields, createConfigRecord(noteType), `Add ${title}`)}>
      <DataTable items={configRows(noteType)} columns={columns} />
    </Panel>
  );

  const exportReportsPdf = async (rows) => {
    if (!rows.length) {
      toast({ title: 'No reports to export', variant: 'destructive' });
      return;
    }
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Daily Farm Reports', 14, 18);
    rows.forEach((report, index) => {
      const y = 30 + (index % 4) * 58;
      if (index > 0 && index % 4 === 0) doc.addPage();
      doc.setFontSize(11);
      doc.text(`${report.report_code || 'Report'} - ${report.farm_name || 'Farm'} - ${formatDate(report.report_date)}`, 14, y);
      doc.setFontSize(9);
      doc.text(`Supervisor: ${report.supervisor || '—'} | Harvest: ${formatNumber(report.harvest_quantity)} kg | Expenses: ${formatCurrency(report.expenses)}`, 14, y + 8);
      doc.text(`Activities: ${formatNumber(report.activities_completed)} completed, ${formatNumber(report.activities_pending)} pending`, 14, y + 16);
      doc.text(`Approval: ${report.manager_approval || report.status || 'Pending'}`, 14, y + 24);
      doc.text(`Tomorrow Plan: ${String(report.tomorrow_plan || '—').slice(0, 95)}`, 14, y + 32);
    });
    doc.save(`farm-daily-reports-${today}.pdf`);
    await createAuditLog('Exported', 'Daily Report', `${rows.length} reports`, 'PDF export generated');
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Today’s Harvest kg" value={`${formatNumber(todaysHarvestKg)} kg`} icon={Scissors} color="green" subtitle="Harvest batches logged today" />
        <MetricCard title="Grade A Harvest kg" value={`${formatNumber(todaysGradeA)} kg`} icon={PackageCheck} color="primary" subtitle="Export-ready grading" />
        <MetricCard title="Workers Present" value={formatNumber(todaysAttendance.length)} icon={Users} color="blue" subtitle="Clocked in or reported today" />
        <MetricCard title="Active Work Orders" value={formatNumber(activeWorkOrders)} icon={ClipboardCheck} color="purple" subtitle="Scheduled, assigned, or in progress" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Activities Completed Today" value={formatNumber(todaysActivities.filter((item) => item.status === 'Completed' || item.status === 'Approved').length)} icon={CheckCircle2} color="green" />
        <MetricCard title="Equipment In Use" value={formatNumber(equipmentInUse)} icon={Wrench} color="amber" />
        <MetricCard title="Fuel Used Today" value={`${formatNumber(todaysFuel)} L`} icon={Fuel} color="red" />
        <MetricCard title="Daily Farm Cost" value={formatCurrency(dailyFarmCost)} icon={Receipt} color="primary" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Chemical Usage Today" value={formatNumber(todaysChemical)} icon={Sprout} color="blue" />
        <MetricCard title="Fertilizer Usage Today" value={formatNumber(todaysFertilizer)} icon={Leaf} color="green" />
        <MetricCard title="Rejected Fruit kg" value={`${formatNumber(todaysRejected)} kg`} icon={XCircle} color="red" />
        <MetricCard title="Pending QC" value={formatNumber(pendingQc)} icon={ShieldCheck} color="amber" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard title="Warehouse Transfer kg" value={`${formatNumber(warehouseTransfer)} kg`} icon={Warehouse} color="blue" />
        <MetricCard title="Trucks Loaded" value={formatNumber(todaysHarvests.filter((item) => item.truck).length)} icon={Truck} color="purple" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Today’s Activities" description="Execution status for farm, block, labour, equipment, input, and harvest work.">
          <DataTable items={todaysActivities} columns={activityColumns} emptyMessage="No activities recorded today." />
        </Panel>
        <Panel title="Alerts & Notifications" description="Operational alerts from inventory, equipment, QC, weather, work orders, and expenses.">
          <div className="space-y-3">
            {alerts.slice(0, 8).map((alert, index) => (
              <div key={`${alert.title}-${index}`} className="flex gap-3 rounded-lg border border-border p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.detail}</p>
                </div>
              </div>
            ))}
            {alerts.length === 0 && <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No active alerts.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );

  const renderDetail = (record, fields) => (
    <Panel title={record?.title || record?.batch_number || record?.report_code || record?.activity_code || 'Record Details'} description="Complete field-level view for the selected operational record.">
      {record ? <FieldGrid fields={fields(record)} /> : <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No record available.</p>}
    </Panel>
  );

  const renderChartPanel = (title, chartData, type = 'bar') => (
    <Panel title={title}>
      <ResponsiveContainer width="100%" height={280}>
        {type === 'pie' ? (
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {chartData.map((entry) => <Cell key={entry.name} fill={entry.color || 'hsl(33 95% 52%)'} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        ) : (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(33 95% 52%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Panel>
  );

  const renderScreen = () => {
    if (loading) return <PageSkeleton variant={activeScreen === 'Operations Analytics Overview' ? 'analytics' : 'page'} />;

    let activities = filterRows(data.dailyActivities || [], ['activity_code', 'title', 'item_tag', 'responsible', 'contact', 'farm_name', 'block_name', 'category', 'cost_type', 'supervisor_name', 'notes']);
    let workOrders = filterRows(data.workOrders || [], ['work_order_code', 'title', 'farm_name', 'block_name', 'category']);
    let harvests = filterRows(data.harvestBatches || [], ['harvest_code', 'batch_number', 'farm_name', 'block_name', 'team', 'supervisor']);
    let attendance = filterRows(data.attendance || [], ['worker_name', 'team', 'role', 'activity']);
    let equipment = filterRows(data.equipment || [], ['equipment_name', 'category', 'farm_assigned', 'status']);
    let inputUsage = filterRows(data.inputUsage || [], ['application_code', 'input_name', 'input_type', 'farm_name', 'activity']);
    let inputs = filterRows(data.farmInputs || [], ['input_name', 'type', 'category', 'supplier']);
    let inventory = filterRows(data.inventoryUsage || [], ['usage_code', 'item', 'item_category', 'farm_name', 'activity']);
    let qcs = filterRows(data.qualityChecks || [], ['qc_code', 'batch_number', 'farm_name', 'inspector', 'stage']);
    let losses = filterRows(data.wasteLosses || [], ['loss_code', 'loss_type', 'farm_name', 'batch_number']);
    let weather = filterRows(data.weatherLogs || [], ['weather_code', 'farm_name', 'weather_condition', 'recorded_by']);
    let expenses = filterRows(data.farmExpenses || [], ['expense_code', 'farm_name', 'activity', 'category', 'description']);
    let reports = filterRows(data.dailyReports || [], ['report_code', 'farm_name', 'supervisor']);
    let approvals = filterRows(data.approvals || [], ['approval_code', 'module', 'record_code', 'approver']);
    let notifications = filterRows(data.notifications || [], ['title', 'message', 'type']);

    if (activeChildFilter) {
      if (activeChildFilter.status) {
        const s = activeChildFilter.status;
        activities = activities.filter((x) => x.status === s);
        workOrders = workOrders.filter((x) => x.status === s);
        harvests = harvests.filter((x) => x.status === s);
        qcs = qcs.filter((x) => x.status === s);
        expenses = expenses.filter((x) => x.status === s);
      }
      if (activeChildFilter.rejectedOnly) {
        harvests = harvests.filter((x) => asNumber(x.rejected_kg) > 0 || x.status === 'Rejected');
      }
      if (activeChildFilter.category) {
        expenses = expenses.filter((x) => x.category === activeChildFilter.category);
      }
      if (activeChildFilter.categoryGroup) {
        if (activeChildFilter.categoryGroup === 'inputs') {
          expenses = expenses.filter((x) => ['Fertilizer', 'Chemical', 'Input'].includes(x.category));
        } else if (activeChildFilter.categoryGroup === 'equipment') {
          expenses = expenses.filter((x) => ['Equipment Repair', 'Maintenance', 'Equipment'].includes(x.category));
        }
      }
    }

    if (activeScreen === 'Daily Activity Log' && activityStatusFilter !== 'All') {
      const selectedStatus = activityStatusFilter.toLowerCase();
      activities = activities.filter((activity) => String(activity.status || 'Pending').trim().toLowerCase() === selectedStatus);
    }

    if (activeScreen === 'Daily Activity Log' && activityFarmBlockFilter !== 'All') {
      activities = activities.filter((activity) => activityMatchesFarmBlock(activity, activityFarmBlockFilter));
    }

    if (activeScreen === 'Daily Activity Log' && activityTypeFilter !== 'All') {
      const selectedActivityType = activityTypeFilter.toLowerCase();
      activities = activities.filter((activity) => String(activity.category || '').trim().toLowerCase() === selectedActivityType);
    }

    switch (activeScreen) {
      case 'Daily Activity Log':
        return (
          <DailyActivityLog
            items={activities}
            statusFilter={activityStatusFilter}
            onStatusFilterChange={setActivityStatusFilter}
            farmBlockFilter={activityFarmBlockFilter}
            onFarmBlockFilterChange={setActivityFarmBlockFilter}
            activityTypeFilter={activityTypeFilter}
            onActivityTypeFilterChange={setActivityTypeFilter}
            search={search}
            onSearchChange={setSearch}
            renderCreateAction={createAction('Add Daily Activity', dailyActivityLogFields, createDailyLogEntry, 'Add Log Entry', 'h-9 bg-[#0d5b1c] px-4 text-[11px] text-white hover:bg-[#083f13]')}
            deletingId={deletingActivityId}
            onDelete={deleteDailyLogEntry}
            renderEditAction={(item) => editAction(
              'Edit Activity',
              dailyActivityLogFields,
              item,
              updateDailyActivity,
              'Edit Activity',
              'h-8 border-emerald-300 px-4 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800',
            )}
          />
        );
      case 'Activities List':
      case 'Activity Calendar View':
        return <ListPanel title={activeScreen} items={activities} columns={activityColumns} />;
      case 'Activity Timeline View':
        return <Panel title="Activity Timeline View"><Timeline items={activities} /></Panel>;
      case 'Create Activity':
        return <Panel title={activeScreen} action={createAction(activeScreen, activityFields, createDailyActivity, activeScreen)}><DataTable items={activities.slice(0, 5)} columns={activityColumns} /></Panel>;
      case 'Edit Activity':
        return renderEditPanel({ title: activeScreen, rows: activities, columns: activityColumns, selectedKey: 'activity', fields: activityFields, onSubmit: updateDailyActivity });
      case 'Activity Details':
        return renderSelectableDetail('Activity Details', activities, activityColumns, 'activity', (item) => [
          ['Activity ID', item.activity_code], ['Date', formatDate(item.activity_date)], ['Farm', item.farm_name], ['Block/Field', item.block_name],
          ['Activity Category', item.category], ['Activity Title', item.title], ['Description', item.description], ['Priority', item.priority],
          ['Supervisor', item.supervisor_name], ['Assigned Team', item.team_name], ['Assigned Workers', item.assigned_workers],
          ['Start Time', item.start_time], ['End Time', item.end_time], ['Total Hours', item.total_hours], ['Equipment Used', item.equipment_used],
          ['Fuel Used', item.fuel_used], ['Fertilizer Used', item.fertilizer_used], ['Chemical Used', item.chemical_used], ['Quantity Used', item.quantity_used],
          ['Unit', item.unit], ['Harvest Quantity', item.harvest_quantity], ['Grade A Quantity', item.grade_a_quantity], ['Grade B Quantity', item.grade_b_quantity],
          ['Rejected Quantity', item.rejected_quantity], ['Crates Used', item.crates_used], ['Destination', item.destination], ['Cost', formatCurrency(item.cost)],
          ['Photos', item.photos], ['Videos', item.videos], ['GPS Coordinates', item.gps_coordinates], ['Weather Condition', item.weather_condition],
          ['Safety Incident', item.safety_incident], ['Notes', item.notes], ['Status', item.status], ['Approved By', item.approved_by],
          ['Created By', item.created_by], ['Updated By', item.updated_by],
        ]);
      case 'Activity Approval Queue':
        return renderApprovalQueue('Activity Approval Queue', approvals.filter((item) => item.module === 'Daily Activity' && !['Approved', 'Rejected'].includes(item.status)));
      case 'Operations Analytics Overview':
        return <FarmOperationsAnalytics data={data} />;
      case 'Master Schedule':
        return <FarmDailyMasterSchedule />;
      case 'Risk Register':
        return <DailyRoutineCheck initialView="risks" riskOnly />;
      case 'Farms':
        return <FarmsAdmin />;
      case 'Work Orders List':
      case 'Scheduled Work Orders':
        return <ListPanel title={activeScreen} items={workOrders.filter((item) => activeScreen === 'Scheduled Work Orders' ? item.status === 'Scheduled' : true)} columns={workOrderColumns} />;
      case 'Create Work Order':
        return <Panel title={activeScreen} action={createAction(activeScreen, workOrderFields, createWorkOrder, activeScreen)}><DataTable items={workOrders.slice(0, 5)} columns={workOrderColumns} /></Panel>;
      case 'Edit Work Order':
        return renderEditPanel({ title: activeScreen, rows: workOrders, columns: workOrderColumns, selectedKey: 'workOrder', fields: workOrderFields, onSubmit: updateWorkOrder });
      case 'Work Order Details':
        return renderSelectableDetail('Work Order Details', workOrders, workOrderColumns, 'workOrder', (item) => [
          ['Work Order ID', item.work_order_code], ['Title', item.title], ['Farm', item.farm_name], ['Block', item.block_name],
          ['Category', item.category], ['Priority', item.priority], ['Supervisor', item.supervisor_name], ['Assigned Team', item.assigned_team],
          ['Workers', item.workers], ['Scheduled Date', formatDate(item.scheduled_date)], ['Start Time', item.start_time], ['End Time', item.end_time],
          ['Equipment Required', item.equipment_required], ['Inputs Required', item.inputs_required], ['Estimated Cost', formatCurrency(item.estimated_cost)],
          ['Actual Cost', formatCurrency(item.actual_cost)], ['Status', item.status], ['Completion Notes', item.completion_notes], ['Photos', item.photos], ['Approved By', item.approved_by],
        ]);
      case 'Overdue Work Orders':
        return <ListPanel title="Overdue Work Orders" items={workOrders.filter((item) => item.status === 'Overdue' || (item.scheduled_date && new Date(item.scheduled_date) < new Date(today) && !['Completed', 'Cancelled'].includes(item.status)))} columns={workOrderColumns} />;
      case 'Convert Work Order to Activity':
        return <Panel title="Convert Work Order to Activity" action={<Button onClick={convertCompletedWorkOrders} className="gradient-mango text-white"><RefreshCw className="mr-2 h-4 w-4" />Convert Completed</Button>}><DataTable items={workOrders.filter((item) => item.status === 'Completed')} columns={workOrderColumns} /></Panel>;
      case 'Harvest Dashboard':
        return <div className="space-y-6">{renderDashboard()} {renderChartPanel('Harvest Quality Grades', gradePie, 'pie')}</div>;
      case 'Budget & Harvest':
        return <FarmDailyBudgetHarvest />;
      case 'Harvest Seasons':
        return <HarvestSeasonPlanner />;
      case 'Daily Harvest Log':
      case 'Harvest Entry Details':
      case 'Harvest Batch Details':
        return activeScreen === 'Harvest Entry Details' || activeScreen === 'Harvest Batch Details'
          ? renderSelectableDetail(activeScreen, harvests, harvestColumns, 'harvest', (item) => [
            ['Harvest ID', item.harvest_code], ['Date', formatDate(item.harvest_date)], ['Farm', item.farm_name], ['Block', item.block_name],
            ['Team', item.team], ['Supervisor', item.supervisor], ['Picker/Worker', item.picker_worker], ['Mango Variety', item.mango_variety],
            ['Quantity Harvested kg', item.quantity_harvested_kg], ['Grade A kg', item.grade_a_kg], ['Grade B kg', item.grade_b_kg], ['Rejected kg', item.rejected_kg],
            ['Crates Used', item.crates_used], ['Average Crate Weight', item.average_crate_weight], ['Destination', item.destination], ['Warehouse', item.warehouse],
            ['Truck', item.truck], ['Driver', item.driver], ['Batch Number', item.batch_number], ['QR Code', item.qr_code], ['Photos', item.photos], ['Notes', item.notes], ['Status', item.status],
          ])
          : <ListPanel title={activeScreen} items={harvests} columns={harvestColumns} />;
      case 'Create Harvest Entry':
        return <Panel title="Create Harvest Entry" action={createAction('Create Harvest Entry', harvestFields, syncHarvestBatch, 'Create Harvest Entry')}><DataTable items={harvests.slice(0, 5)} columns={harvestColumns} /></Panel>;
      case 'Harvest by Farm':
        return renderChartPanel('Harvest by Farm', harvestByFarm);
      case 'Harvest by Block':
        return renderChartPanel('Harvest by Block', harvestByBlock);
      case 'Harvest by Worker':
        return renderChartPanel('Harvest by Worker', harvestByWorker);
      case 'Crate Tracking':
        return <ListPanel title="Crate Tracking" items={harvests} columns={[{ key: 'batch_number', label: 'Batch Number' }, { key: 'crates_used', label: 'Crates Used', align: 'right', format: formatNumber }, { key: 'average_crate_weight', label: 'Average Crate Weight', align: 'right', format: formatNumber }, { key: 'warehouse', label: 'Warehouse' }, { key: 'status', label: 'Status' }]} />;
      case 'Truck Loading':
        return <ListPanel title="Truck Loading" items={harvests.filter((item) => item.truck || item.destination === 'Warehouse')} columns={[{ key: 'batch_number', label: 'Batch Number' }, { key: 'truck', label: 'Truck' }, { key: 'driver', label: 'Driver' }, { key: 'quantity_harvested_kg', label: 'Quantity kg', align: 'right', format: formatNumber }, { key: 'destination', label: 'Destination' }, { key: 'status', label: 'Status' }]} />;
      case 'Labour Dashboard':
        return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-3"><MetricCard title="Attendance Records" value={formatNumber(attendance.length)} icon={Users} color="blue" /><MetricCard title="Output kg" value={formatNumber(attendance.reduce((sum, item) => sum + asNumber(item.output_kg), 0))} icon={PackageCheck} color="green" /><MetricCard title="Payroll Sync" value={formatCurrency(attendance.reduce((sum, item) => sum + asNumber(item.total_pay), 0))} icon={Receipt} color="primary" /></div>{renderChartPanel('Worker Productivity', labourByWorker)}</div>;
      case 'Attendance List':
      case 'Worker Assignment':
      case 'Worker Productivity':
      case 'Daily Wage Calculation':
      case 'Payroll Sync':
        return <ListPanel title={activeScreen} items={attendance} columns={attendanceColumns} />;
      case 'Clock In / Clock Out':
        return <Panel title="Clock In / Clock Out" action={createAction('Clock In / Clock Out', attendanceFields, createAttendance, 'Clock In / Clock Out')}><DataTable items={attendance.slice(0, 5)} columns={attendanceColumns} /></Panel>;
      case 'Equipment List':
      case 'Equipment Details':
      case 'Maintenance Schedule':
      case 'Damaged Equipment Report':
        return activeScreen === 'Equipment Details'
          ? renderSelectableDetail('Equipment Details', equipment, equipmentColumns, 'equipment', (item) => Object.entries({
            'Equipment ID': item.equipment_code, 'Equipment Name': item.equipment_name, Category: item.category, 'Serial Number': item.serial_number,
            'Farm Assigned': item.farm_assigned, 'Current Location': item.current_location, Condition: item.condition, Status: item.status,
            'Assigned Operator': item.assigned_operator, 'Purchase Date': formatDate(item.purchase_date), 'Maintenance Schedule': item.maintenance_schedule,
            'Last Maintenance Date': formatDate(item.last_maintenance_date), 'Next Maintenance Date': formatDate(item.next_maintenance_date),
            'Usage Hours': item.usage_hours, 'Fuel Type': item.fuel_type, 'Fuel Consumption': item.fuel_consumption, Notes: item.notes,
          }))
          : <ListPanel title={activeScreen} items={equipment.filter((item) => activeScreen === 'Damaged Equipment Report' ? item.status === 'Needs Repair' || item.condition === 'Damaged' : true)} columns={equipmentColumns} />;
      case 'Add Equipment':
        return <Panel title="Add Equipment" action={createAction('Add Equipment', equipmentFields, createEquipment, 'Add Equipment')}><DataTable items={equipment.slice(0, 5)} columns={equipmentColumns} /></Panel>;
      case 'Equipment Usage Log':
        return <ListPanel title={activeScreen} items={data.equipmentUsage || []} columns={[{ key: 'usage_code', label: 'Usage ID' }, { key: 'usage_date', label: 'Date', format: formatDate }, { key: 'equipment_name', label: 'Equipment' }, { key: 'activity', label: 'Activity' }, { key: 'operator', label: 'Operator' }, { key: 'hours_used', label: 'Hours Used', align: 'right', format: formatNumber }, { key: 'fuel_consumed', label: 'Fuel Consumed', align: 'right', format: formatNumber }, { key: 'returned', label: 'Returned' }, { key: 'supervisor_approval', label: 'Supervisor Approval' }]} />;
      case 'Equipment Issue & Return':
        return <Panel title="Equipment Issue & Return" action={createAction('Equipment Issue & Return', equipmentUsageFields, createEquipmentUsage, 'Issue / Return')}><DataTable items={data.equipmentUsage || []} columns={[{ key: 'usage_code', label: 'Usage ID' }, { key: 'usage_date', label: 'Date', format: formatDate }, { key: 'equipment_name', label: 'Equipment' }, { key: 'activity', label: 'Activity' }, { key: 'operator', label: 'Operator' }, { key: 'hours_used', label: 'Hours Used', align: 'right', format: formatNumber }, { key: 'fuel_consumed', label: 'Fuel Consumed', align: 'right', format: formatNumber }, { key: 'returned', label: 'Returned' }, { key: 'supervisor_approval', label: 'Supervisor Approval' }]} /></Panel>;
      case 'Input Inventory':
      case 'Input Details':
      case 'Expired Inputs':
      case 'Low Stock Inputs':
        return activeScreen === 'Input Details'
          ? renderSelectableDetail('Input Details', inputs, inputColumns, 'input', (item) => Object.entries({ 'Input ID': item.input_code, 'Input Name': item.input_name, Type: item.type, Category: item.category, Supplier: item.supplier, 'Batch Number': item.batch_number, 'Expiry Date': formatDate(item.expiry_date), 'Stock Quantity': item.stock_quantity, Unit: item.unit, 'Storage Location': item.storage_location, 'Safety Notes': item.safety_notes, 'Reorder Level': item.reorder_level, Status: item.status }))
          : <ListPanel title={activeScreen} items={inputs.filter((item) => activeScreen === 'Expired Inputs' ? item.expiry_date && new Date(item.expiry_date) < new Date(today) : activeScreen === 'Low Stock Inputs' ? asNumber(item.stock_quantity) <= asNumber(item.reorder_level) : true)} columns={inputColumns} />;
      case 'Add Input':
        return <Panel title="Add Input" action={createAction('Add Input', inputFields, createInput, 'Add Input')}><DataTable items={inputs.slice(0, 5)} columns={inputColumns} /></Panel>;
      case 'Chemical Application Log':
      case 'Fertilizer Application Log':
      case 'Spray Records':
        return <Panel title={activeScreen} action={createAction(activeScreen, inputUsageFields, createInputUsage, activeScreen)}><DataTable items={inputUsage.filter((item) => activeScreen === 'Fertilizer Application Log' ? item.input_type === 'Fertilizer' : activeScreen === 'Chemical Application Log' || activeScreen === 'Spray Records' ? item.input_type === 'Chemical' : true)} columns={inputUsageColumns} /></Panel>;
      case 'Inventory Usage Dashboard':
        return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-3"><MetricCard title="Usage Logs" value={formatNumber(inventory.length)} icon={Package} color="blue" /><MetricCard title="Total Usage Cost" value={formatCurrency(inventory.reduce((sum, item) => sum + asNumber(item.total_cost), 0))} icon={Receipt} color="primary" /><MetricCard title="Wastage" value={formatNumber(inventory.reduce((sum, item) => sum + asNumber(item.wastage), 0))} icon={XCircle} color="red" /></div><DataTable items={inventory} columns={inventoryUsageColumns} /></div>;
      case 'Usage Log':
      case 'Stock Movement':
      case 'Wastage Log':
        return <ListPanel title={activeScreen} items={activeScreen === 'Stock Movement' ? (data.stockMovements || []) : inventory.filter((item) => activeScreen === 'Wastage Log' ? asNumber(item.wastage) > 0 : true)} columns={activeScreen === 'Stock Movement' ? [{ key: 'product_name', label: 'Item' }, { key: 'warehouse_name', label: 'Warehouse' }, { key: 'movement_type', label: 'Movement Type' }, { key: 'quantity', label: 'Quantity', align: 'right', format: formatNumber }, { key: 'movement_date', label: 'Date', format: formatDate }] : inventoryUsageColumns} />;
      case 'Issue Items':
      case 'Return Items':
        return <Panel title={activeScreen} action={createAction(activeScreen, inventoryUsageFields, createInventoryUsage, activeScreen)}><DataTable items={inventory.slice(0, 5)} columns={inventoryUsageColumns} /></Panel>;
      case 'QC Dashboard':
        return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-3"><MetricCard title="Pending QC" value={formatNumber(pendingQc)} icon={ShieldCheck} color="amber" /><MetricCard title="Export Approved" value={formatNumber(qcs.filter((item) => item.export_approved === 'Yes').length)} icon={CheckCircle2} color="green" /><MetricCard title="Rejected Batch Reviews" value={formatNumber(qcs.filter((item) => asNumber(item.rejected_kg) > 0).length)} icon={XCircle} color="red" /></div><DataTable items={qcs} columns={qcColumns} /></div>;
      case 'QC Inspection List':
      case 'Export Readiness Check':
      case 'Rejected Batch Review':
        return <ListPanel title={activeScreen} items={qcs.filter((item) => activeScreen === 'Export Readiness Check' ? item.stage === 'Export readiness inspection' || item.export_approved === 'Pending' : activeScreen === 'Rejected Batch Review' ? asNumber(item.rejected_kg) > 0 || item.status === 'Rejected' : true)} columns={qcColumns} />;
      case 'Create QC Inspection':
        return <Panel title="Create QC Inspection" action={createAction('Create QC Inspection', qcFields, createQc, 'Create QC Inspection')}><DataTable items={qcs.slice(0, 5)} columns={qcColumns} /></Panel>;
      case 'QC Inspection Details':
        return renderSelectableDetail('QC Inspection Details', qcs, qcColumns, 'qc', (item) => Object.entries({ 'QC ID': item.qc_code, Date: formatDate(item.inspection_date), 'Batch Number': item.batch_number, Farm: item.farm_name, Block: item.block_name, Inspector: item.inspector, Stage: item.stage, 'Total Quantity': item.total_quantity, 'Sample Size': item.sample_size, 'Grade A kg': item.grade_a_kg, 'Grade B kg': item.grade_b_kg, 'Rejected kg': item.rejected_kg, 'Defect Type': item.defect_type, 'Defect Percentage': item.defect_percentage, 'Fruit Size': item.fruit_size, 'Fruit Color': item.fruit_color, 'Ripeness Level': item.ripeness_level, 'Disease Signs': item.disease_signs, Bruising: item.bruising, 'Export Approved': item.export_approved, Photos: item.photos, Notes: item.notes, Status: item.status }));
      case 'Waste Dashboard':
        return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-3"><MetricCard title="Loss Records" value={formatNumber(losses.length)} icon={XCircle} color="red" /><MetricCard title="Loss Quantity" value={formatNumber(losses.reduce((sum, item) => sum + asNumber(item.quantity), 0))} icon={Package} color="amber" /><MetricCard title="Estimated Loss Value" value={formatCurrency(losses.reduce((sum, item) => sum + asNumber(item.estimated_value), 0))} icon={Receipt} color="primary" /></div><DataTable items={losses} columns={lossColumns} /></div>;
      case 'Waste & Losses List':
      case 'Loss Record Details':
      case 'Loss Approval Queue':
        return activeScreen === 'Loss Record Details'
          ? renderSelectableDetail('Loss Record Details', losses, lossColumns, 'loss', (item) => Object.entries({ 'Loss ID': item.loss_code, Date: formatDate(item.loss_date), Farm: item.farm_name, Block: item.block_name, 'Batch Number': item.batch_number, 'Loss Type': item.loss_type, Quantity: item.quantity, Unit: item.unit, 'Estimated Value': formatCurrency(item.estimated_value), Reason: item.reason, 'Reported By': item.reported_by, 'Approved By': item.approved_by, Photos: item.photos, 'Action Taken': item.action_taken, Status: item.status }))
          : activeScreen === 'Loss Approval Queue'
            ? renderApprovalQueue(activeScreen, approvals.filter((item) => item.module === 'Waste & Losses' && !['Approved', 'Rejected'].includes(item.status)))
            : <ListPanel title={activeScreen} items={losses} columns={lossColumns} />;
      case 'Create Loss Record':
        return <Panel title="Create Loss Record" action={createAction('Create Loss Record', lossFields, createLoss, 'Create Loss Record')}><DataTable items={losses.slice(0, 5)} columns={lossColumns} /></Panel>;
      case 'Weather Dashboard':
      case 'Daily Weather Log':
      case 'Weather History':
        return <ListPanel title={activeScreen} items={weather} columns={weatherColumns} />;
      case 'Create Weather Entry':
        return <Panel title="Create Weather Entry" action={createAction('Create Weather Entry', weatherFields, createWeather, 'Create Weather Entry')}><DataTable items={weather.slice(0, 5)} columns={weatherColumns} /></Panel>;
      case 'Spray Weather Risk Alerts':
        return <ListPanel title="Spray Weather Risk Alerts" items={weather.filter((item) => asNumber(item.wind_speed) > 15 || asNumber(item.rainfall) > 5)} columns={weatherColumns} />;
      case 'Expense Dashboard':
        return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-3"><MetricCard title="Daily Farm Cost" value={formatCurrency(dailyFarmCost)} icon={Receipt} color="primary" /><MetricCard title="Approval Queue" value={formatNumber(expenses.filter((item) => item.status === 'Pending').length)} icon={FileCheck2} color="amber" /><MetricCard title="Approved Expenses" value={formatCurrency(expenses.filter((item) => item.status === 'Approved').reduce((sum, item) => sum + asNumber(item.amount), 0))} icon={CheckCircle2} color="green" /></div><DataTable items={expenses} columns={expenseColumns} /></div>;
      case 'Expense List':
      case 'Expense Details':
      case 'Expense Approval Queue':
      case 'Receipt Uploads':
        return activeScreen === 'Expense Details'
          ? renderSelectableDetail('Expense Details', expenses, expenseColumns, 'expense', (item) => Object.entries({ 'Expense ID': item.expense_code, Date: formatDate(item.expense_date), Farm: item.farm_name, Activity: item.activity, Category: item.category, Description: item.description, Amount: formatCurrency(item.amount), Vendor: item.vendor, 'Payment Method': item.payment_method, 'Receipt Upload': item.receipt_upload, 'Approved By': item.approved_by, Status: item.status }))
          : activeScreen === 'Expense Approval Queue'
            ? renderApprovalQueue(activeScreen, approvals.filter((item) => item.module === 'Expense' && !['Approved', 'Rejected'].includes(item.status)))
            : activeScreen === 'Receipt Uploads'
              ? <Panel title="Receipt Uploads" action={createAction('Upload Receipt', receiptFields, createReceiptUpload, 'Upload Receipt')}><DataTable items={expenses} columns={expenseColumns} /></Panel>
              : <ListPanel title={activeScreen} items={expenses} columns={expenseColumns} />;
      case 'Create Expense':
        return <Panel title="Create Expense" action={createAction('Create Expense', expenseFields, createExpense, 'Create Expense')}><DataTable items={expenses.slice(0, 5)} columns={expenseColumns} /></Panel>;
      case 'Reports Dashboard':
      case 'Daily Reports List':
      case 'Report Approval Queue':
      case 'Export Report':
        return activeScreen === 'Report Approval Queue'
          ? renderApprovalQueue(activeScreen, approvals.filter((item) => item.module === 'Daily Report' && !['Approved', 'Rejected'].includes(item.status)))
          : activeScreen === 'Export Report'
            ? <Panel title="Export Report" description="Generate a PDF from the currently filtered daily reports." action={<Button onClick={() => exportReportsPdf(reports)} className="gradient-mango text-white"><Download className="mr-2 h-4 w-4" />Export PDF</Button>}><DataTable items={reports} columns={reportColumns} /></Panel>
            : <ListPanel title={activeScreen} items={reports} columns={reportColumns} />;
      case 'Generate Daily Report':
        return <Panel title="Generate Daily Report" action={createAction('Generate Daily Report', reportFields, createReport, 'Generate Daily Report')}><DataTable items={reports.slice(0, 5)} columns={reportColumns} /></Panel>;
      case 'Report Details':
        return renderSelectableDetail('Report Details', reports, reportColumns, 'report', (item) => Object.entries({ Farm: item.farm_name, Date: formatDate(item.report_date), Supervisor: item.supervisor, 'Workers Present': item.workers_present, 'Workers Absent': item.workers_absent, 'Activities Completed': item.activities_completed, 'Activities Pending': item.activities_pending, 'Harvest Quantity': item.harvest_quantity, 'Grade A': item.grade_a, 'Grade B': item.grade_b, Rejected: item.rejected, 'Equipment Used': item.equipment_used, 'Fuel Used': item.fuel_used, 'Fertilizers Used': item.fertilizers_used, 'Chemicals Used': item.chemicals_used, Weather: item.weather, Incidents: item.incidents, Losses: item.losses, Expenses: formatCurrency(item.expenses), Photos: item.photos, 'Tomorrow’s Plan': item.tomorrow_plan, 'Supervisor Signature': item.supervisor_signature, 'Manager Approval': item.manager_approval, Status: item.status }));
      case 'Analytics Overview':
      case 'Harvest Analytics':
      case 'Labour Analytics':
      case 'Equipment Analytics':
      case 'Input Usage Analytics':
      case 'Waste Analytics':
      case 'Cost Analytics':
      case 'Export-Ready Stock Analytics':
        return (
          <div className="grid gap-6 xl:grid-cols-2">
            {renderChartPanel('Harvest by Day', groupSum(data.harvestBatches || [], 'harvest_date', 'quantity_harvested_kg'))}
            {renderChartPanel('Harvest by Farm', harvestByFarm)}
            {renderChartPanel('Harvest by Block', harvestByBlock)}
            {renderChartPanel('Harvest by Worker', harvestByWorker)}
            {renderChartPanel('Grade A vs Grade B vs Rejected', gradePie, 'pie')}
            {renderChartPanel('Daily Labour Cost', groupSum(data.attendance || [], 'attendance_date', 'total_pay'))}
            {renderChartPanel('Equipment Utilization', groupSum(data.equipmentUsage || [], 'equipment_name', 'hours_used'))}
            {renderChartPanel('Fuel Consumption', groupSum(data.equipmentUsage || [], 'equipment_name', 'fuel_consumed'))}
            {renderChartPanel('Chemical Usage', groupSum(inputUsage.filter((item) => item.input_type === 'Chemical'), 'input_name', 'quantity_used'))}
            {renderChartPanel('Fertilizer Usage', groupSum(inputUsage.filter((item) => item.input_type === 'Fertilizer'), 'input_name', 'quantity_used'))}
            {renderChartPanel('Waste Trend', groupSum(data.wasteLosses || [], 'loss_date', 'quantity'))}
            {renderChartPanel('Farm Profitability', costByCategory)}
            {renderChartPanel('Productivity per Worker', labourByWorker)}
            {renderChartPanel('Cost per kg harvested', harvestByFarm.map((item) => ({
              ...item,
              value: item.value ? Math.round((dailyFarmCost / item.value) * 100) / 100 : 0,
            })))}
            {renderChartPanel('Export-ready stock', [{ name: 'Export-ready stock', value: gradePie[0].value }])}
          </div>
        );
      case 'Approval Dashboard':
      case 'Activity Approvals':
      case 'Work Order Approvals':
      case 'Expense Approvals':
      case 'QC Approvals':
      case 'Report Approvals':
        return renderApprovalQueue(activeScreen, filterApprovalsForScreen(approvals, activeScreen));
      case 'Farm Documents':
      case 'Activity Attachments':
      case 'Harvest Documents':
      case 'Spray Compliance Documents':
      case 'Daily Report PDFs':
      case 'Receipts':
        return <ListPanel title={activeScreen} items={(data.certifications || []).filter((item) => activeScreen === 'Farm Documents' ? true : String(item.name || '').includes(activeScreen.replace('Receipts', 'Receipt')))} columns={[{ key: 'name', label: 'Document' }, { key: 'issuer', label: 'Source' }, { key: 'certificate_number', label: 'Reference' }, { key: 'valid_from', label: 'Date', format: formatDate }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={String(value).toLowerCase()} label={value} /> }]} />;
      case 'Notification Center':
      case 'Alert Rules':
      case 'Low Stock Alerts':
      case 'Equipment Alerts':
      case 'QC Alerts':
      case 'Work Order Alerts':
      case 'Weather Risk Alerts':
        if (activeScreen === 'Alert Rules') {
          return renderConfigPanel('Alert Rules', 'Alert Rule', alertRuleFields, [
            { key: 'name', label: 'Rule Name' },
            { key: 'trigger', label: 'Trigger' },
            { key: 'channel', label: 'Channel' },
            { key: 'status', label: 'Status' },
          ]);
        }
        return <Panel title={activeScreen}><div className="space-y-3">{(activeScreen === 'Notification Center' || activeScreen === 'Alert Rules' ? notifications.map((item) => ({ title: item.title, detail: item.message, type: item.type })) : alerts.filter((item) => item.type === activeScreen)).map((item, index) => <div key={`${item.title}-${index}`} className="flex gap-3 rounded-lg border border-border p-3"><Bell className="mt-0.5 h-4 w-4 text-primary" /><div><p className="text-sm font-semibold">{item.title}</p><p className="text-xs text-muted-foreground">{item.detail}</p></div></div>)}</div></Panel>;
      case 'Farm Operations Settings':
      case 'Activity Categories':
      case 'Work Order Templates':
      case 'Labour Rates':
      case 'Equipment Categories':
      case 'Input Categories':
      case 'Approval Rules':
      case 'Report Templates':
      case 'User Permissions':
        if (activeScreen === 'Work Order Templates') {
          return renderConfigPanel('Work Order Templates', 'Work Order Template', workOrderTemplateFields, [
            { key: 'name', label: 'Template' },
            { key: 'category', label: 'Category' },
            { key: 'priority', label: 'Priority' },
            { key: 'estimated_cost', label: 'Estimated Cost', align: 'right', format: formatCurrency },
            { key: 'status', label: 'Status' },
          ]);
        }
        if (activeScreen === 'Report Templates') {
          return renderConfigPanel('Report Templates', 'Report Template', reportTemplateFields, [
            { key: 'name', label: 'Template' },
            { key: 'sections', label: 'Sections' },
            { key: 'approval_required', label: 'Approval Required' },
            { key: 'status', label: 'Status' },
          ]);
        }
        if (activeScreen === 'User Permissions') {
          return renderConfigPanel('User Permissions', 'User Permission', permissionFields, [
            { key: 'role', label: 'Role' },
            { key: 'scope', label: 'Permission' },
            { key: 'can_create', label: 'Can Create' },
            { key: 'can_approve', label: 'Can Approve' },
            { key: 'status', label: 'Status' },
          ]);
        }
        return <div className="grid gap-6 xl:grid-cols-2"><ListPanel title="Activity Categories" items={activityCategories.map((name) => ({ name }))} columns={emptyColumns} /><ListPanel title="Equipment Categories" items={equipmentTypes.map((name) => ({ name }))} columns={emptyColumns} /><ListPanel title="Labour Rates" items={(data.workers || []).map((item) => ({ name: item.worker_name, daily_rate: item.daily_rate, piece_rate: item.piece_rate }))} columns={[{ key: 'name', label: 'Worker' }, { key: 'daily_rate', label: 'Daily Rate', align: 'right', format: formatCurrency }, { key: 'piece_rate', label: 'Piece Rate', align: 'right', format: formatCurrency }]} /><ListPanel title="User Permissions" items={['Admin', 'Farm Manager', 'Supervisor', 'Field Officer', 'Inventory Officer', 'HR Officer', 'Finance Officer', 'QC Officer', 'Driver', 'Worker'].map((name) => ({ name, scope: name === 'Admin' ? 'Full access' : name === 'Worker' ? 'View assigned tasks only' : 'Module role access' }))} columns={[{ key: 'name', label: 'Role' }, { key: 'scope', label: 'Permission' }]} /></div>;
      default:
        return <ListPanel title={activeScreen} items={[]} columns={emptyColumns} />;
    }
  };

  const getPageInfo = () => {
    if (activeScreen === 'Operations Analytics Overview' || activeScreen === 'Master Schedule' || activeScreen === 'Risk Register' || activeScreen === 'Farms' || activeScreen === 'Budget & Harvest' || activeScreen === 'Harvest Seasons') {
      return { placeholder: '', action: null, hideSearch: true };
    }

    switch (activePage) {
      case 'Daily Activities':
        return {
          placeholder: activeScreen === 'Daily Activity Log' ? 'Search daily activity log...' : 'Search activities...',
          action: activeScreen === 'Daily Activity Log'
            ? createAction('Add Daily Activity', dailyActivityLogFields, createDailyLogEntry, 'Add Log Entry')
            : createAction('Add Activity', activityFields, createDailyActivity, 'Add Activity')
        };
      case 'Work Orders':
        return {
          placeholder: 'Search work orders...',
          action: createAction('Create Work Order', workOrderFields, createWorkOrder, 'Create Work Order')
        };
      case 'Harvest Operations':
        return {
          placeholder: 'Search harvest batches...',
          action: createAction('Record Harvest', harvestFields, syncHarvestBatch, 'Record Harvest')
        };
      case 'Labour Management':
        return {
          placeholder: 'Search workers...',
          action: createAction('Assign Workers', attendanceFields, createAttendance, 'Assign Workers')
        };
      case 'Equipment Management':
        return {
          placeholder: 'Search equipment...',
          action: createAction('Add Equipment Record', equipmentFields, createEquipment, 'Add Equipment Record')
        };
      case 'Chemicals & Fertilizers': // Input Usage
        return {
          placeholder: 'Search inputs...',
          action: createAction('Record Input Usage', inputUsageFields, createInputUsage, 'Record Input Usage')
        };
      case 'Quality Control':
        return {
          placeholder: 'Search inspections...',
          action: createAction('Create Inspection', qcFields, createQc, 'Create Inspection')
        };
      case 'Farm Expenses': // Expenses
        return {
          placeholder: 'Search expenses...',
          action: createAction('Record Expense', expenseFields, createExpense, 'Record Expense')
        };
      case 'Daily Supervisor Reports': // Reports
        return {
          placeholder: 'Search reports...',
          action: createAction('Generate Report', reportFields, createReport, 'Generate Report')
        };
      default:
        return {
          placeholder: 'Search...',
          action: null
        };
    }
  };

  const pageInfo = getPageInfo();
  return (
    <div className="space-y-6">
      {activeScreen !== 'Daily Activity Log' ? <div className="-mt-3 border-b border-border pb-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
          <div className="flex flex-wrap items-center gap-2">
            {!pageInfo.hideSearch ? (
              <Input
                className="w-full sm:w-64"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={pageInfo.placeholder}
              />
            ) : null}
            {pageInfo.action}
            {activeScreen === 'Operations Analytics Overview' ? <div id="farm-analytics-header-controls" className="flex flex-wrap items-center" /> : null}
          </div>
        </div>
      </div> : null}

      <main className="min-w-0">
        {renderScreen()}
      </main>
    </div>
  );
}
