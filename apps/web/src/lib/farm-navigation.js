import { ClipboardList } from 'lucide-react';

export const farmDailyActivitiesNavigation = [
  {
    title: "Daily Activities",
    path: "/admin/farm-daily-activities/activities",
    icon: ClipboardList,
    children: [
      { title: "Analytics Overview", path: "/admin/farm-daily-activities/activities/overview", screen: "Operations Analytics Overview" },
      { title: "Daily Task Log", path: "/admin/farm-daily-activities/activities/records", screen: "Daily Task Log" },
      { title: "Create Activity", path: "/admin/farm-daily-activities/activities/create", screen: "Create Activity" },
      { title: "Pending Activities", path: "/admin/farm-daily-activities/activities/pending", screen: "Activities List", filter: { status: "Pending" } },
      { title: "Completed Activities", path: "/admin/farm-daily-activities/activities/completed", screen: "Activities List", filter: { status: "Completed" } },
      { title: "Activity Calendar", path: "/admin/farm-daily-activities/activities/calendar", screen: "Activity Calendar View" },
      { title: "Approvals", path: "/admin/farm-daily-activities/activities/approvals", screen: "Activity Approval Queue" },
      { title: "Main Activities", path: "/admin/farm-daily-activities/activities/master-schedule", screen: "Master Schedule" },
      { title: "Rist and Issue report", path: "/admin/farm-daily-activities/activities/risk-register", screen: "Risk Register", children: [
        { title: "Risk Register", path: "/admin/farm-daily-activities/activities/risk-register" },
        { title: "Issues", path: "/admin/farm-daily-activities/activities/issues" },
      ] },
      { title: "Farm Ops", path: "/admin/farm-daily-activities/activities/farms", screen: "Farms", children: [
        { title: "Farms", path: "/admin/farm-daily-activities/activities/farms" },
        { title: "Harvest", path: "/admin/farm-daily-activities/activities/harvest" },
        { title: "Tools & Equip", path: "/admin/farm-daily-activities/activities/tools-equipment" },
      ] }
    ]
  }
];
