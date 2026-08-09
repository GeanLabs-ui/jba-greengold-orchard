import {
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  Scissors,
  Users,
  Wrench,
  Sprout,
  ShieldCheck,
  Receipt,
  FileText
} from 'lucide-react';

export const farmDailyActivitiesNavigation = [
  {
    title: "Farm Operations Dashboard",
    path: "/admin/farm-daily-activities/dashboard",
    icon: LayoutDashboard,
    children: [
      { title: "Dashboard Overview", path: "/admin/farm-daily-activities/dashboard/overview", screen: "Dashboard Overview" },
      { title: "Today’s Activities", path: "/admin/farm-daily-activities/dashboard/todays-activities", screen: "Today’s Activities" },
      { title: "Today’s Harvest Summary", path: "/admin/farm-daily-activities/dashboard/harvest-summary", screen: "Today’s Harvest Summary" },
      { title: "Alerts & Notifications", path: "/admin/farm-daily-activities/dashboard/alerts", screen: "Alerts & Notifications" },
      { title: "Supervisor Daily Summary", path: "/admin/farm-daily-activities/dashboard/supervisor-summary", screen: "Supervisor Daily Summary" }
    ]
  },
  {
    title: "Daily Activities",
    path: "/admin/farm-daily-activities/activities",
    icon: ClipboardList,
    children: [
      { title: "Activity Records", path: "/admin/farm-daily-activities/activities/records", screen: "Activities List" },
      { title: "Create Activity", path: "/admin/farm-daily-activities/activities/create", screen: "Create Activity" },
      { title: "Pending Activities", path: "/admin/farm-daily-activities/activities/pending", screen: "Activities List", filter: { status: "Pending" } },
      { title: "Completed Activities", path: "/admin/farm-daily-activities/activities/completed", screen: "Activities List", filter: { status: "Completed" } },
      { title: "Activity Calendar", path: "/admin/farm-daily-activities/activities/calendar", screen: "Activity Calendar View" },
      { title: "Approvals", path: "/admin/farm-daily-activities/activities/approvals", screen: "Activity Approval Queue" },
      { title: "Overview", path: "/admin/farm-daily-activities/activities/overview", screen: "Programme Overview" },
      { title: "Master Schedule", path: "/admin/farm-daily-activities/activities/master-schedule", screen: "Master Schedule" }
    ]
  },
  {
    title: "Work Orders",
    path: "/admin/farm-daily-activities/work-orders",
    icon: ClipboardCheck,
    children: [
      { title: "All Work Orders", path: "/admin/farm-daily-activities/work-orders/all", screen: "Work Orders List" },
      { title: "Create Work Order", path: "/admin/farm-daily-activities/work-orders/create", screen: "Create Work Order" },
      { title: "Assigned", path: "/admin/farm-daily-activities/work-orders/assigned", screen: "Work Orders List", filter: { status: "Assigned" } },
      { title: "In Progress", path: "/admin/farm-daily-activities/work-orders/in-progress", screen: "Work Orders List", filter: { status: "In Progress" } },
      { title: "Completed", path: "/admin/farm-daily-activities/work-orders/completed", screen: "Work Orders List", filter: { status: "Completed" } },
      { title: "Overdue", path: "/admin/farm-daily-activities/work-orders/overdue", screen: "Overdue Work Orders" },
      { title: "Approvals", path: "/admin/farm-daily-activities/work-orders/approvals", screen: "Convert Work Order to Activity" }
    ]
  },
  {
    title: "Harvest Operations",
    path: "/admin/farm-daily-activities/harvests",
    icon: Scissors,
    children: [
      { title: "Harvest Dashboard", path: "/admin/farm-daily-activities/harvests/dashboard", screen: "Harvest Dashboard" },
      { title: "Harvest Batches", path: "/admin/farm-daily-activities/harvests/batches", screen: "Daily Harvest Log" },
      { title: "Grading", path: "/admin/farm-daily-activities/harvests/grading", screen: "Daily Harvest Log" },
      { title: "Rejected Fruit", path: "/admin/farm-daily-activities/harvests/rejected", screen: "Daily Harvest Log", filter: { rejectedOnly: true } },
      { title: "Warehouse Transfers", path: "/admin/farm-daily-activities/harvests/transfers", screen: "Crate Tracking" },
      { title: "Truck Loading", path: "/admin/farm-daily-activities/harvests/loading", screen: "Truck Loading" },
      { title: "Harvest Reports", path: "/admin/farm-daily-activities/harvests/reports", screen: "Daily Harvest Log" },
      { title: "Budget & Harvest", path: "/admin/farm-daily-activities/harvests/budget-harvest", screen: "Budget & Harvest" },
      { title: "Harvest Seasons", path: "/admin/farm-daily-activities/harvests/season-planner", screen: "Harvest Seasons" }
    ]
  },
  {
    title: "Labour Management",
    path: "/admin/farm-daily-activities/labour",
    icon: Users,
    children: [
      { title: "Attendance", path: "/admin/farm-daily-activities/labour/attendance", screen: "Attendance List" },
      { title: "Worker Assignments", path: "/admin/farm-daily-activities/labour/assignments", screen: "Worker Assignment" },
      { title: "Timesheets", path: "/admin/farm-daily-activities/labour/timesheets", screen: "Labour Dashboard" },
      { title: "Productivity", path: "/admin/farm-daily-activities/labour/productivity", screen: "Worker Productivity" },
      { title: "Overtime", path: "/admin/farm-daily-activities/labour/overtime", screen: "Daily Wage Calculation" },
      { title: "Payroll Summary", path: "/admin/farm-daily-activities/labour/payroll", screen: "Payroll Sync" }
    ]
  },
  {
    title: "Equipment Management",
    path: "/admin/farm-daily-activities/equipment",
    icon: Wrench,
    children: [
      { title: "Equipment Overview", path: "/admin/farm-daily-activities/equipment/overview", screen: "Equipment List" },
      { title: "Equipment Usage", path: "/admin/farm-daily-activities/equipment/usage", screen: "Equipment Usage Log" },
      { title: "Maintenance", path: "/admin/farm-daily-activities/equipment/maintenance", screen: "Maintenance Schedule" },
      { title: "Fuel Usage", path: "/admin/farm-daily-activities/equipment/fuel", screen: "Equipment Usage Log" },
      { title: "Breakdowns", path: "/admin/farm-daily-activities/equipment/breakdowns", screen: "Damaged Equipment Report" },
      { title: "Inspections", path: "/admin/farm-daily-activities/equipment/inspections", screen: "Equipment List" }
    ]
  },
  {
    title: "Input Usage",
    path: "/admin/farm-daily-activities/inputs",
    icon: Sprout,
    children: [
      { title: "Chemical Usage", path: "/admin/farm-daily-activities/inputs/chemical", screen: "Chemical Application Log" },
      { title: "Fertilizer Usage", path: "/admin/farm-daily-activities/inputs/fertilizer", screen: "Fertilizer Application Log" },
      { title: "Seed Usage", path: "/admin/farm-daily-activities/inputs/seed", screen: "Input Inventory" },
      { title: "Inventory Requests", path: "/admin/farm-daily-activities/inputs/requests", screen: "Low Stock Inputs" },
      { title: "Application Records", path: "/admin/farm-daily-activities/inputs/applications", screen: "Spray Records" },
      { title: "Input Reports", path: "/admin/farm-daily-activities/inputs/reports", screen: "Input Inventory" }
    ]
  },
  {
    title: "Quality Control",
    path: "/admin/farm-daily-activities/quality-control",
    icon: ShieldCheck,
    children: [
      { title: "Pending QC", path: "/admin/farm-daily-activities/quality-control/pending", screen: "QC Inspection List", filter: { status: "Pending" } },
      { title: "Inspections", path: "/admin/farm-daily-activities/quality-control/inspections", screen: "QC Inspection List" },
      { title: "Grading Results", path: "/admin/farm-daily-activities/quality-control/results", screen: "QC Dashboard" },
      { title: "Rejected Produce", path: "/admin/farm-daily-activities/quality-control/rejected", screen: "Rejected Batch Review" },
      { title: "Corrective Actions", path: "/admin/farm-daily-activities/quality-control/actions", screen: "Export Readiness Check" },
      { title: "QC Reports", path: "/admin/farm-daily-activities/quality-control/reports", screen: "QC Inspection List" }
    ]
  },
  {
    title: "Expenses",
    path: "/admin/farm-daily-activities/expenses",
    icon: Receipt,
    children: [
      { title: "Daily Farm Costs", path: "/admin/farm-daily-activities/expenses/costs", screen: "Expense Dashboard" },
      { title: "Labour Costs", path: "/admin/farm-daily-activities/expenses/labour", screen: "Expense List", filter: { category: "Labour" } },
      { title: "Fuel Costs", path: "/admin/farm-daily-activities/expenses/fuel", screen: "Expense List", filter: { category: "Fuel" } },
      { title: "Input Costs", path: "/admin/farm-daily-activities/expenses/inputs", screen: "Expense List", filter: { categoryGroup: "inputs" } },
      { title: "Equipment Costs", path: "/admin/farm-daily-activities/expenses/equipment", screen: "Expense List", filter: { categoryGroup: "equipment" } },
      { title: "Expense Approvals", path: "/admin/farm-daily-activities/expenses/approvals", screen: "Expense Approval Queue", filter: { status: "Pending" } }
    ]
  },
  {
    title: "Reports",
    path: "/admin/farm-daily-activities/reports",
    icon: FileText,
    children: [
      { title: "Daily Reports", path: "/admin/farm-daily-activities/reports/daily", screen: "Reports Dashboard" },
      { title: "Weekly Reports", path: "/admin/farm-daily-activities/reports/weekly", screen: "Daily Reports List" },
      { title: "Monthly Reports", path: "/admin/farm-daily-activities/reports/monthly", screen: "Daily Reports List" },
      { title: "Harvest Reports", path: "/admin/farm-daily-activities/reports/harvest", screen: "Daily Reports List" },
      { title: "Labour Reports", path: "/admin/farm-daily-activities/reports/labour", screen: "Daily Reports List" },
      { title: "Cost Reports", path: "/admin/farm-daily-activities/reports/cost", screen: "Daily Reports List" },
      { title: "Export Reports", path: "/admin/farm-daily-activities/reports/export", screen: "Export Report" }
    ]
  }
];
