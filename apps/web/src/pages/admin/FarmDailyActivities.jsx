import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileCheck2,
  FileText,
  FolderOpen,
  Fuel,
  Gauge,
  Leaf,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Scissors,
  Settings,
  ShieldCheck,
  Sprout,
  ThermometerSun,
  Truck,
  Users,
  Warehouse,
  Wrench,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate, formatNumber } from '@/components/shared/format';
import { base44 } from '@/api/base44Client';

const today = new Date().toISOString().slice(0, 10);
const shortDate = (value) => String(value || '').slice(0, 10);
const sevenDaysFromToday = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const pageMap = [
  {
    name: 'Farm Operations Dashboard',
    icon: Gauge,
    screens: ['Dashboard Overview', 'Today’s Activities', 'Today’s Harvest Summary', 'Alerts & Notifications', 'Supervisor Daily Summary'],
  },
  {
    name: 'Daily Activities',
    icon: ClipboardList,
    screens: ['Activities List', 'Create Activity', 'Activity Details', 'Edit Activity', 'Activity Calendar View', 'Activity Timeline View', 'Activity Approval Queue'],
  },
  {
    name: 'Work Orders',
    icon: ClipboardCheck,
    screens: ['Work Orders List', 'Create Work Order', 'Work Order Details', 'Edit Work Order', 'Scheduled Work Orders', 'Overdue Work Orders', 'Convert Work Order to Activity'],
  },
  {
    name: 'Harvest Operations',
    icon: Scissors,
    screens: ['Harvest Dashboard', 'Daily Harvest Log', 'Create Harvest Entry', 'Harvest Entry Details', 'Harvest by Farm', 'Harvest by Block', 'Harvest by Worker', 'Harvest Batch Details', 'Crate Tracking', 'Truck Loading'],
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
    {fields.map(([label, value]) => (
      <div key={label} className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold">{value || '—'}</p>
      </div>
    ))}
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
  { key: 'amount', label: 'Amount', align: 'right', format: formatCurrency },
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
  { key: 'expenses', label: 'Expenses', align: 'right', format: formatCurrency },
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

export default function FarmDailyActivities() {
  const { toast } = useToast();
  const [activePage, setActivePage] = useState(pageMap[0].name);
  const [activeScreen, setActiveScreen] = useState(pageMap[0].screens[0]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});
  const [selectedRecords, setSelectedRecords] = useState({});

  const selectRecord = (key, record) => {
    setSelectedRecords((current) => ({ ...current, [key]: record?.id }));
  };

  const getSelectedRecord = (key, rows) => (
    rows.find((row) => row.id === selectedRecords[key]) || rows[0] || null
  );

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Farm.list('-created_date').catch(() => []),
      base44.entities.FarmBlock.list('-created_date').catch(() => []),
      base44.entities.Worker.list('-created_date').catch(() => []),
      base44.entities.DailyActivity.list('-activity_date').catch(() => []),
      base44.entities.WorkOrder.list('-scheduled_date').catch(() => []),
      base44.entities.HarvestBatch.list('-harvest_date').catch(() => []),
      base44.entities.HarvestGrade.list('-created_date').catch(() => []),
      base44.entities.FarmAttendance.list('-attendance_date').catch(() => []),
      base44.entities.Equipment.list('-created_date').catch(() => []),
      base44.entities.EquipmentUsage.list('-usage_date').catch(() => []),
      base44.entities.FarmInput.list('-created_date').catch(() => []),
      base44.entities.InputUsage.list('-application_date').catch(() => []),
      base44.entities.InventoryUsage.list('-usage_date').catch(() => []),
      base44.entities.QualityCheck.list('-inspection_date').catch(() => []),
      base44.entities.WasteLoss.list('-loss_date').catch(() => []),
      base44.entities.WeatherLog.list('-weather_date').catch(() => []),
      base44.entities.FarmExpense.list('-expense_date').catch(() => []),
      base44.entities.DailyReport.list('-report_date').catch(() => []),
      base44.entities.Approval.list('-created_date').catch(() => []),
      base44.entities.Notification.list('-created_date').catch(() => []),
      base44.entities.Certification.list('-created_date').catch(() => []),
      base44.entities.StockMovement.list('-created_date').catch(() => []),
      base44.entities.FarmFinanceRecord.list('-record_date').catch(() => []),
      base44.entities.FarmComplianceRecord.list('-created_date').catch(() => []),
      base44.entities.AuditLog.list('-created_date').catch(() => []),
      base44.entities.FarmNote.list('-created_date').catch(() => []),
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
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

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
      farm_id: payload.farm_id || farm?.id || '',
      farm_name: farm?.name || payload.farm_name || '',
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
    if (isHarvest && harvestTotal <= 0) throw new Error('Harvest activity must require grade quantities.');
    if (isChemical && !payload.weather_condition) throw new Error('Chemical application must require weather condition.');
    if (usesEquipment && (!payload.equipment_operator || !payload.equipment_condition)) throw new Error('Equipment usage must require operator and condition.');
    if (payload.status === 'Approved' && (usesEquipment && (!payload.equipment_operator || !payload.equipment_condition))) {
      throw new Error('Activity cannot be approved unless required usage logs are completed.');
    }

    const farmBlock = resolveFarmBlock(payload);
    const activityCode = payload.activity_code || code('DA');
    const totalHours = hoursBetween(payload.start_time, payload.end_time);
    const cost = asNumber(payload.labour_cost) + asNumber(payload.equipment_cost) + asNumber(payload.fuel_cost) + asNumber(payload.input_cost) + asNumber(payload.transport_cost);
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
      harvest_quantity: isHarvest ? harvestTotal : asNumber(payload.harvest_quantity),
      cost,
      created_by: payload.created_by || 'Supervisor',
      updated_by: payload.updated_by || 'Supervisor',
    });

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
      cost > 0 ? base44.entities.FarmExpense.create({
        expense_code: code('FEXP'),
        expense_date: payload.activity_date || today,
        ...farmBlock,
        activity: payload.category,
        category: payload.category === 'Harvesting' ? 'Labour' : payload.category,
        description: payload.title || payload.activity_title || payload.category,
        amount: cost,
        vendor: 'Farm operations',
        payment_method: 'Internal',
        approved_by: payload.approved_by,
        status: payload.status === 'Approved' ? 'Approved' : 'Pending',
      }).catch(() => null) : null,
      cost > 0 ? createFinanceRecord({ ...payload, ...farmBlock, amount: cost, category: payload.category, description: payload.title }) : null,
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
    if (isHarvest && harvestTotal <= 0) throw new Error('Harvest activity must require grade quantities.');
    if (isChemical && !nextPayload.weather_condition) throw new Error('Chemical application must require weather condition.');
    if (usesEquipment && (!nextPayload.equipment_operator || !nextPayload.equipment_condition)) throw new Error('Equipment usage must require operator and condition.');

    const farmBlock = resolveFarmBlock(nextPayload);
    const totalHours = hoursBetween(nextPayload.start_time, nextPayload.end_time);
    const cost = asNumber(nextPayload.labour_cost) + asNumber(nextPayload.equipment_cost) + asNumber(nextPayload.fuel_cost) + asNumber(nextPayload.input_cost) + asNumber(nextPayload.transport_cost);
    const updated = await base44.entities.DailyActivity.update(record.id, {
      ...payload,
      ...farmBlock,
      title: nextPayload.title || nextPayload.activity_title,
      total_hours: totalHours,
      harvest_quantity: isHarvest ? harvestTotal : asNumber(nextPayload.harvest_quantity),
      cost,
      updated_by: nextPayload.updated_by || 'Supervisor',
    });
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
    { name: 'labour_cost', label: 'Labour Cost', type: 'number', defaultValue: 0 },
    { name: 'equipment_cost', label: 'Equipment Cost', type: 'number', defaultValue: 0 },
    { name: 'fuel_cost', label: 'Fuel Cost', type: 'number', defaultValue: 0 },
    { name: 'input_cost', label: 'Input Cost', type: 'number', defaultValue: 0 },
    { name: 'transport_cost', label: 'Transport Cost', type: 'number', defaultValue: 0 },
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

  const createAction = (title, fields, onCreate, buttonLabel = title) => (
    <AdminCreateDialog
      title={title}
      description="Complete the required operational fields. Related logs, approvals, stock, finance, reports, and alerts are synced automatically where applicable."
      buttonLabel={buttonLabel}
      buttonIcon={Plus}
      fields={fields}
      onCreate={onCreate}
      onCreated={load}
      submitLabel="Save"
    />
  );

  const editAction = (title, fields, record, onSubmit) => (
    <AdminCreateDialog
      title={title}
      description="Update the selected record. Related audit logs are written automatically."
      buttonLabel={record ? `Edit ${record.activity_code || record.work_order_code || 'Record'}` : 'Select a record'}
      buttonIcon={Pencil}
      fields={fields}
      initialValues={record || {}}
      onSubmit={(payload) => onSubmit(record, payload)}
      onCreated={load}
      submitLabel="Update"
      buttonVariant="outline"
      buttonClassName=""
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
    if (loading) return <div className="h-96 animate-pulse rounded-xl bg-muted" />;

    const activities = filterRows(data.dailyActivities || [], ['activity_code', 'title', 'farm_name', 'block_name', 'category', 'supervisor_name']);
    const workOrders = filterRows(data.workOrders || [], ['work_order_code', 'title', 'farm_name', 'block_name', 'category']);
    const harvests = filterRows(data.harvestBatches || [], ['harvest_code', 'batch_number', 'farm_name', 'block_name', 'team', 'supervisor']);
    const attendance = filterRows(data.attendance || [], ['worker_name', 'team', 'role', 'activity']);
    const equipment = filterRows(data.equipment || [], ['equipment_name', 'category', 'farm_assigned', 'status']);
    const inputUsage = filterRows(data.inputUsage || [], ['application_code', 'input_name', 'input_type', 'farm_name', 'activity']);
    const inputs = filterRows(data.farmInputs || [], ['input_name', 'type', 'category', 'supplier']);
    const inventory = filterRows(data.inventoryUsage || [], ['usage_code', 'item', 'item_category', 'farm_name', 'activity']);
    const qcs = filterRows(data.qualityChecks || [], ['qc_code', 'batch_number', 'farm_name', 'inspector', 'stage']);
    const losses = filterRows(data.wasteLosses || [], ['loss_code', 'loss_type', 'farm_name', 'batch_number']);
    const weather = filterRows(data.weatherLogs || [], ['weather_code', 'farm_name', 'weather_condition', 'recorded_by']);
    const expenses = filterRows(data.farmExpenses || [], ['expense_code', 'farm_name', 'activity', 'category', 'description']);
    const reports = filterRows(data.dailyReports || [], ['report_code', 'farm_name', 'supervisor']);
    const approvals = filterRows(data.approvals || [], ['approval_code', 'module', 'record_code', 'approver']);
    const notifications = filterRows(data.notifications || [], ['title', 'message', 'type']);

    switch (activeScreen) {
      case 'Dashboard Overview':
      case 'Today’s Activities':
      case 'Today’s Harvest Summary':
      case 'Alerts & Notifications':
      case 'Supervisor Daily Summary':
        return renderDashboard();
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

  const changePage = (page) => {
    setActivePage(page.name);
    setActiveScreen(page.screens[0]);
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-2 space-y-2 border-b border-border bg-background/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-heading text-lg font-bold">{activePage}</h2>
          </div>
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <Input className="w-72" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search current records..." />
            {createAction('Create Activity', activityFields, createDailyActivity, 'Create Activity')}
            <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin">
          {pageMap.map((page) => {
            const Icon = page.icon;
            const isActive = page.name === activePage;
            return (
              <button
                key={page.name}
                type="button"
                onClick={() => changePage(page)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{page.name}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                  {page.screens.length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {activePageConfig.screens.map((screen) => (
              <button
                key={screen}
                type="button"
                onClick={() => setActiveScreen(screen)}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeScreen === screen
                    ? 'bg-foreground text-background'
                    : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {screen}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 md:hidden">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search current records..." />
          <div className="flex gap-2">
            {createAction('Create Activity', activityFields, createDailyActivity, 'Create Activity')}
            <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          </div>
        </div>
      </div>

      <main className="min-w-0">
        {renderScreen()}
      </main>
    </div>
  );
}
