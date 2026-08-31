-- One-time clean-launch reset.
--
-- This migration intentionally removes the workbook import and every existing
-- application record, including accounts, customer portal data, operational
-- records, audit events, and file metadata. It leaves the schema and migration
-- history intact so a new administrator can be provisioned after deployment.
--
-- Before applying this migration to a remote environment, take a Neon backup
-- and separately clear the matching private R2 buckets. R2 objects are not
-- database rows and cannot be removed by a SQL migration.
TRUNCATE TABLE
  attendance,
  audit_events,
  block_crop_inventories,
  block_merge_sources,
  block_merges,
  block_status_history,
  certifications,
  content_pages,
  crop_plans,
  crop_varieties,
  customer_contracts,
  customers,
  daily_activities,
  email_verification_tokens,
  employees,
  entity_records,
  equipment,
  expenses,
  export_shipments,
  farm_activity_periods,
  farm_blocks,
  farm_inputs,
  farm_status_history,
  farms,
  file_objects,
  harvest_batches,
  harvest_periods,
  invoices,
  job_applications,
  news_posts,
  notifications,
  orders,
  organization_members,
  organizations,
  password_reset_tokens,
  payments,
  products,
  purchase_orders,
  quotations,
  rate_limit_windows,
  returns,
  sessions,
  staff_invitations,
  stock_movements,
  suppliers,
  users,
  vehicles,
  warehouses,
  yield_records,
  "_migration_0007_block_code_conflicts"
RESTART IDENTITY CASCADE;
