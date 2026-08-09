import React from 'react';
import { cn } from '@/lib/utils';

const statusConfig = {
  // Sales statuses
  draft: { label: 'Draft', class: 'bg-slate-100 text-slate-700' },
  sent: { label: 'Sent', class: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepted', class: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', class: 'bg-red-100 text-red-700' },
  expired: { label: 'Expired', class: 'bg-amber-100 text-amber-700' },
  converted: { label: 'Converted', class: 'bg-violet-100 text-violet-700' },
  unpaid: { label: 'Unpaid', class: 'bg-red-100 text-red-700' },
  partially_paid: { label: 'Partial', class: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Paid', class: 'bg-emerald-100 text-emerald-700' },
  overdue: { label: 'Overdue', class: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', class: 'bg-slate-200 text-slate-600' },
  // Order statuses
  confirmed: { label: 'Confirmed', class: 'bg-blue-100 text-blue-700' },
  processing: { label: 'Processing', class: 'bg-amber-100 text-amber-700' },
  packed: { label: 'Packed', class: 'bg-violet-100 text-violet-700' },
  dispatched: { label: 'Dispatched', class: 'bg-indigo-100 text-indigo-700' },
  delivered: { label: 'Delivered', class: 'bg-emerald-100 text-emerald-700' },
  closed: { label: 'Closed', class: 'bg-slate-100 text-slate-600' },
  pending: { label: 'Pending', class: 'bg-amber-100 text-amber-700' },
  // Inventory
  in: { label: 'In', class: 'bg-emerald-100 text-emerald-700' },
  out: { label: 'Out', class: 'bg-red-100 text-red-700' },
  transfer: { label: 'Transfer', class: 'bg-blue-100 text-blue-700' },
  adjustment: { label: 'Adjustment', class: 'bg-amber-100 text-amber-700' },
  // Logistics
  scheduled: { label: 'Scheduled', class: 'bg-blue-100 text-blue-700' },
  in_transit: { label: 'In Transit', class: 'bg-indigo-100 text-indigo-700' },
  failed: { label: 'Failed', class: 'bg-red-100 text-red-700' },
  delayed: { label: 'Delayed', class: 'bg-amber-100 text-amber-700' },
  // General
  active: { label: 'Active', class: 'bg-emerald-100 text-emerald-700' },
  inactive: { label: 'Inactive', class: 'bg-slate-100 text-slate-600' },
  merged: { label: 'Merged', class: 'bg-blue-100 text-blue-700' },
  // Customer types
  local: { label: 'Local', class: 'bg-emerald-100 text-emerald-700' },
  corporate: { label: 'Corporate', class: 'bg-blue-100 text-blue-700' },
  export: { label: 'Export', class: 'bg-violet-100 text-violet-700' },
  walk_in: { label: 'Walk-in', class: 'bg-amber-100 text-amber-700' },
  // Harvest
  planned: { label: 'Planned', class: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', class: 'bg-indigo-100 text-indigo-700' },
  completed: { label: 'Completed', class: 'bg-emerald-100 text-emerald-700' },
  blocked: { label: 'Blocked', class: 'bg-red-100 text-red-700' },
  // Export shipment
  preparing: { label: 'Preparing', class: 'bg-amber-100 text-amber-700' },
  // Approval
  approved: { label: 'Approved', class: 'bg-emerald-100 text-emerald-700' },
  requested: { label: 'Requested', class: 'bg-amber-100 text-amber-700' },
  processed: { label: 'Processed', class: 'bg-emerald-100 text-emerald-700' },
  // Other
  present: { label: 'Present', class: 'bg-emerald-100 text-emerald-700' },
  absent: { label: 'Absent', class: 'bg-red-100 text-red-700' },
  late: { label: 'Late', class: 'bg-amber-100 text-amber-700' },
  leave: { label: 'On Leave', class: 'bg-blue-100 text-blue-700' },
  received: { label: 'Received', class: 'bg-emerald-100 text-emerald-700' },
  new: { label: 'New', class: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Resolved', class: 'bg-emerald-100 text-emerald-700' },
  published: { label: 'Published', class: 'bg-emerald-100 text-emerald-700' },
  archived: { label: 'Archived', class: 'bg-slate-100 text-slate-600' },
  read: { label: 'Read', class: 'bg-slate-100 text-slate-600' },
  queued: { label: 'Queued', class: 'bg-blue-100 text-blue-700' },
};

export default function StatusBadge({ status, label }) {
  const config = statusConfig[status] || { label: label || status, class: 'bg-slate-100 text-slate-700' };

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', config.class)}>
      {config.label}
    </span>
  );
}
