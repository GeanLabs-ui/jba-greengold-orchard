import {
  ClipboardList,
  Wrench,
  FileText
} from 'lucide-react';

export const farmDailyActivitiesNavigation = [
  {
    title: "Daily Activities",
    path: "/admin/farm-daily-activities/activities",
    icon: ClipboardList,
    children: [
      { title: "Analytics Overview", path: "/admin/farm-daily-activities/activities/overview", screen: "Operations Analytics Overview" },
      { title: "Daily Activity Log", path: "/admin/farm-daily-activities/activities/records", screen: "Daily Activity Log" },
      { title: "Create Activity", path: "/admin/farm-daily-activities/activities/create", screen: "Create Activity" },
      { title: "Pending Activities", path: "/admin/farm-daily-activities/activities/pending", screen: "Activities List", filter: { status: "Pending" } },
      { title: "Completed Activities", path: "/admin/farm-daily-activities/activities/completed", screen: "Activities List", filter: { status: "Completed" } },
      { title: "Activity Calendar", path: "/admin/farm-daily-activities/activities/calendar", screen: "Activity Calendar View" },
      { title: "Approvals", path: "/admin/farm-daily-activities/activities/approvals", screen: "Activity Approval Queue" },
      { title: "Main Activities", path: "/admin/farm-daily-activities/activities/master-schedule", screen: "Master Schedule" },
      { title: "Risk Register", path: "/admin/farm-daily-activities/activities/risk-register", screen: "Risk Register" },
      { title: "Farms", path: "/admin/farm-daily-activities/activities/farms", screen: "Farms" }
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
