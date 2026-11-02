-- Additive named views over canonical storage. No business records are copied or rewritten.
-- security_invoker preserves the querying role permissions and underlying RLS policies.
-- Keep these views for rollback compatibility; roll back application code without removing data.
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE VIEW public.platform_activity_equipments WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data
FROM public.entity_records WHERE entity_name = 'ActivityEquipment';
COMMENT ON VIEW public.platform_activity_equipments IS 'Current ActivityEquipment records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_activity_equipments FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_activity_inputs WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'activity_code' AS "activity_code",
  data->'import_key' AS "import_key",
  data->'input_name' AS "input_name",
  data->'quantity_used' AS "quantity_used",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data->'unit' AS "unit",
  data
FROM public.entity_records WHERE entity_name = 'ActivityInput';
COMMENT ON VIEW public.platform_activity_inputs IS 'Current ActivityInput records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_activity_inputs FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_activity_workers WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'activity_code' AS "activity_code",
  data->'hours_worked' AS "hours_worked",
  data->'output_crates' AS "output_crates",
  data->'output_kg' AS "output_kg",
  data->'worker_name' AS "worker_name",
  data
FROM public.entity_records WHERE entity_name = 'ActivityWorker';
COMMENT ON VIEW public.platform_activity_workers IS 'Current ActivityWorker records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_activity_workers FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_approvals WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'approval_code' AS "approval_code",
  data->'approver' AS "approver",
  data->'module' AS "module",
  data->'record_code' AS "record_code",
  data->'requested_by' AS "requested_by",
  data
FROM public.entity_records WHERE entity_name = 'Approval';
COMMENT ON VIEW public.platform_approvals IS 'Current Approval records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_approvals FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_attendances WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'attendance_date' AS "attendance_date",
  data->'check_in_at' AS "check_in_at",
  data->'check_out_at' AS "check_out_at",
  data->'employee_id' AS "employee_id",
  data->'employee_name' AS "employee_name",
  data->'notes' AS "notes",
  data
FROM public.entity_records WHERE entity_name = 'Attendance';
COMMENT ON VIEW public.platform_attendances IS 'Current Attendance records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_attendances FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_audit_logs WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'action' AS "action",
  data->'comment' AS "comment",
  data->'event_date' AS "event_date",
  data->'log_code' AS "log_code",
  data->'performed_by' AS "performed_by",
  data->'programme_code' AS "programme_code",
  data->'record_code' AS "record_code",
  data->'record_type' AS "record_type",
  data->'source' AS "source",
  data
FROM public.entity_records WHERE entity_name = 'AuditLog';
COMMENT ON VIEW public.platform_audit_logs IS 'Current AuditLog records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_audit_logs FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_calendar_connections WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data
FROM public.entity_records WHERE entity_name = 'CalendarConnection';
COMMENT ON VIEW public.platform_calendar_connections IS 'Current CalendarConnection records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_calendar_connections FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_calendar_events WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data
FROM public.entity_records WHERE entity_name = 'CalendarEvent';
COMMENT ON VIEW public.platform_calendar_events IS 'Current CalendarEvent records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_calendar_events FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_certifications WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'cert_type' AS "cert_type",
  data->'certificate_number' AS "certificate_number",
  data->'description' AS "description",
  data->'document_url' AS "document_url",
  data->'issuer' AS "issuer",
  data->'name' AS "name",
  data->'valid_from' AS "valid_from",
  data->'valid_to' AS "valid_to",
  data
FROM public.entity_records WHERE entity_name = 'Certification';
COMMENT ON VIEW public.platform_certifications IS 'Current Certification records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_certifications FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_content_pages WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'body' AS "body",
  data->'hero_image' AS "hero_image",
  data->'is_published' AS "is_published",
  data->'page_type' AS "page_type",
  data->'published_at' AS "published_at",
  data->'seo_description' AS "seo_description",
  data->'seo_title' AS "seo_title",
  data->'slug' AS "slug",
  data->'summary' AS "summary",
  data->'title' AS "title",
  data
FROM public.entity_records WHERE entity_name = 'ContentPage';
COMMENT ON VIEW public.platform_content_pages IS 'Current ContentPage records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_content_pages FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_crop_plans WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'block_name' AS "block_name",
  data->'budget_amount' AS "budget_amount",
  data->'crop_variety' AS "crop_variety",
  data->'expected_harvest_end' AS "expected_harvest_end",
  data->'expected_harvest_start' AS "expected_harvest_start",
  data->'farm_name' AS "farm_name",
  data->'notes' AS "notes",
  data->'plan_code' AS "plan_code",
  data->'planting_date' AS "planting_date",
  data->'season' AS "season",
  data->'target_yield_kg' AS "target_yield_kg",
  data
FROM public.entity_records WHERE entity_name = 'CropPlan';
COMMENT ON VIEW public.platform_crop_plans IS 'Current CropPlan records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_crop_plans FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_customers WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'address' AS "address",
  data->'address_line1' AS "address_line1",
  data->'address_line2' AS "address_line2",
  data->'balance' AS "balance",
  data->'city' AS "city",
  data->'code' AS "code",
  data->'company_name' AS "company_name",
  data->'contact_name' AS "contact_name",
  data->'country' AS "country",
  data->'credit_limit' AS "credit_limit",
  data->'customer_code' AS "customer_code",
  data->'customer_type' AS "customer_type",
  data->'email' AS "email",
  data->'first_name' AS "first_name",
  data->'last_name' AS "last_name",
  data->'notes' AS "notes",
  data->'phone' AS "phone",
  data->'preferred_channel' AS "preferred_channel",
  data->'region' AS "region",
  data->'source' AS "source",
  data->'tax_id' AS "tax_id",
  data->'vat_number' AS "vat_number",
  data
FROM public.entity_records WHERE entity_name = 'Customer';
COMMENT ON VIEW public.platform_customers IS 'Current Customer records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_customers FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_customer_contracts WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'contract_number' AS "contract_number",
  data->'currency' AS "currency",
  data->'customer_id' AS "customer_id",
  data->'customer_name' AS "customer_name",
  data->'document_url' AS "document_url",
  data->'end_date' AS "end_date",
  data->'start_date' AS "start_date",
  data->'terms' AS "terms",
  data->'value_amount' AS "value_amount",
  data
FROM public.entity_records WHERE entity_name = 'CustomerContract';
COMMENT ON VIEW public.platform_customer_contracts IS 'Current CustomerContract records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_customer_contracts FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_customer_stories WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'company' AS "company",
  data->'email' AS "email",
  data->'name' AS "name",
  data->'quote' AS "quote",
  data->'result' AS "result",
  data->'source_page' AS "source_page",
  data->'title' AS "title",
  data
FROM public.entity_records WHERE entity_name = 'CustomerStory';
COMMENT ON VIEW public.platform_customer_stories IS 'Current CustomerStory records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_customer_stories FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_daily_activities WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'activity_code' AS "activity_code",
  data->'activity_date' AS "activity_date",
  data->'activity_name' AS "activity_name",
  data->'activity_type' AS "activity_type",
  data->'actual_cost' AS "actual_cost",
  data->'actual_revenue' AS "actual_revenue",
  data->'assigned_workers' AS "assigned_workers",
  data->'block_code' AS "block_code",
  data->'block_name' AS "block_name",
  data->'category' AS "category",
  data->'contact' AS "contact",
  data->'cost' AS "cost",
  data->'cost_type' AS "cost_type",
  data->'date' AS "date",
  data->'description' AS "description",
  data->'expense_code' AS "expense_code",
  data->'expense_id' AS "expense_id",
  data->'expense_recorded_at' AS "expense_recorded_at",
  data->'farm_name' AS "farm_name",
  data->'harvest_quantity' AS "harvest_quantity",
  data->'import_key' AS "import_key",
  data->'item_tag' AS "item_tag",
  data->'log_entry' AS "log_entry",
  data->'notes' AS "notes",
  data->'output_quantity_kg' AS "output_quantity_kg",
  data->'priority' AS "priority",
  data->'projected_cost' AS "projected_cost",
  data->'projected_revenue' AS "projected_revenue",
  data->'quantity_used' AS "quantity_used",
  data->'related_kpi' AS "related_kpi",
  data->'related_objective' AS "related_objective",
  data->'related_sub_objective' AS "related_sub_objective",
  data->'responsible' AS "responsible",
  data->'revenue' AS "revenue",
  data->'shared_scope' AS "shared_scope",
  data->'source_block_value' AS "source_block_value",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data->'supervisor_name' AS "supervisor_name",
  data->'title' AS "title",
  data->'total_cost' AS "total_cost",
  data->'total_hours' AS "total_hours",
  data
FROM public.entity_records WHERE entity_name = 'DailyActivity';
COMMENT ON VIEW public.platform_daily_activities IS 'Current DailyActivity records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_daily_activities FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_daily_reports WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'activities_completed' AS "activities_completed",
  data->'activities_pending' AS "activities_pending",
  data->'block_code' AS "block_code",
  data->'block_name' AS "block_name",
  data->'chemicals_used' AS "chemicals_used",
  data->'equipment_used' AS "equipment_used",
  data->'expenses' AS "expenses",
  data->'farm_name' AS "farm_name",
  data->'fertilizers_used' AS "fertilizers_used",
  data->'fuel_used' AS "fuel_used",
  data->'grade_a' AS "grade_a",
  data->'grade_b' AS "grade_b",
  data->'harvest_quantity' AS "harvest_quantity",
  data->'import_key' AS "import_key",
  data->'incidents' AS "incidents",
  data->'losses' AS "losses",
  data->'manager_approval' AS "manager_approval",
  data->'notes' AS "notes",
  data->'rejected' AS "rejected",
  data->'report_code' AS "report_code",
  data->'report_date' AS "report_date",
  data->'shared_scope' AS "shared_scope",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data->'supervisor' AS "supervisor",
  data->'supervisor_signature' AS "supervisor_signature",
  data->'tomorrow_plan' AS "tomorrow_plan",
  data->'weather' AS "weather",
  data->'workers_absent' AS "workers_absent",
  data->'workers_present' AS "workers_present",
  data
FROM public.entity_records WHERE entity_name = 'DailyReport';
COMMENT ON VIEW public.platform_daily_reports IS 'Current DailyReport records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_daily_reports FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_deliveries WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'customer_id' AS "customer_id",
  data->'customer_name' AS "customer_name",
  data->'delivery_code' AS "delivery_code",
  data->'delivery_date' AS "delivery_date",
  data->'delivery_notes' AS "delivery_notes",
  data->'destination_address' AS "destination_address",
  data->'dispatch_date' AS "dispatch_date",
  data->'driver_name' AS "driver_name",
  data->'order_id' AS "order_id",
  data->'order_number' AS "order_number",
  data->'proof_of_delivery' AS "proof_of_delivery",
  data->'route' AS "route",
  data->'shipping_address' AS "shipping_address",
  data->'vehicle_id' AS "vehicle_id",
  data->'vehicle_plate' AS "vehicle_plate",
  data
FROM public.entity_records WHERE entity_name = 'Delivery';
COMMENT ON VIEW public.platform_deliveries IS 'Current Delivery records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_deliveries FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_departments WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'code' AS "code",
  data->'name' AS "name",
  data->'parent_department_id' AS "parent_department_id",
  data
FROM public.entity_records WHERE entity_name = 'Department';
COMMENT ON VIEW public.platform_departments IS 'Current Department records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_departments FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_employees WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'address' AS "address",
  data->'avatar_url' AS "avatar_url",
  data->'department' AS "department",
  data->'department_id' AS "department_id",
  data->'email' AS "email",
  data->'employee_code' AS "employee_code",
  data->'employment_type' AS "employment_type",
  data->'first_name' AS "first_name",
  data->'hire_date' AS "hire_date",
  data->'job_title' AS "job_title",
  data->'joining_at' AS "joining_at",
  data->'last_name' AS "last_name",
  data->'next_of_kin' AS "next_of_kin",
  data->'next_of_kin_phone' AS "next_of_kin_phone",
  data->'page_access' AS "page_access",
  data->'phone' AS "phone",
  data->'photo_url' AS "photo_url",
  data->'reports_to_id' AS "reports_to_id",
  data->'salary' AS "salary",
  data->'sub_department_id' AS "sub_department_id",
  data->'workspace_role' AS "workspace_role",
  data
FROM public.entity_records WHERE entity_name = 'Employee';
COMMENT ON VIEW public.platform_employees IS 'Current Employee records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_employees FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_inventory_items WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'attachments' AS "attachments",
  data->'category' AS "category",
  data->'condition' AS "condition",
  data->'equipment_code' AS "equipment_code",
  data->'equipment_name' AS "equipment_name",
  data->'minimum_stock_threshold' AS "minimum_stock_threshold",
  data->'purchase_cost' AS "purchase_cost",
  data->'purchase_date' AS "purchase_date",
  data->'quantity_purchased' AS "quantity_purchased",
  data->'record_status' AS "record_status",
  data->'remaining_quantity' AS "remaining_quantity",
  data->'repair_cost' AS "repair_cost",
  data->'repair_status' AS "repair_status",
  data->'supplier' AS "supplier",
  data->'unit' AS "unit",
  data
FROM public.entity_records WHERE entity_name = 'Equipment';
COMMENT ON VIEW public.platform_inventory_items IS 'Current Equipment records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_inventory_items FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_equipment_usages WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data
FROM public.entity_records WHERE entity_name = 'EquipmentUsage';
COMMENT ON VIEW public.platform_equipment_usages IS 'Current EquipmentUsage records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_equipment_usages FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_expenses WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'amount' AS "amount",
  data->'category' AS "category",
  data->'currency' AS "currency",
  data->'expense_date' AS "expense_date",
  data->'expense_number' AS "expense_number",
  data->'notes' AS "notes",
  data->'payment_method' AS "payment_method",
  data->'vendor_name' AS "vendor_name",
  data
FROM public.entity_records WHERE entity_name = 'Expense';
COMMENT ON VIEW public.platform_expenses IS 'Current Expense records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_expenses FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_export_shipments WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'certifications_required' AS "certifications_required",
  data->'compliance_documents' AS "compliance_documents",
  data->'container_number' AS "container_number",
  data->'customer_id' AS "customer_id",
  data->'customer_name' AS "customer_name",
  data->'destination_country' AS "destination_country",
  data->'export_code' AS "export_code",
  data->'incoterm' AS "incoterm",
  data->'line_items' AS "line_items",
  data->'notes' AS "notes",
  data->'port_of_discharge' AS "port_of_discharge",
  data->'port_of_loading' AS "port_of_loading",
  data->'shipment_date' AS "shipment_date",
  data->'total_amount' AS "total_amount",
  data->'vessel_name' AS "vessel_name",
  data
FROM public.entity_records WHERE entity_name = 'ExportShipment';
COMMENT ON VIEW public.platform_export_shipments IS 'Current ExportShipment records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_export_shipments FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_farm_analytics_projections WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'cost' AS "cost",
  data->'revenue' AS "revenue",
  data->'yield' AS "yield",
  data
FROM public.entity_records WHERE entity_name = 'FarmAnalyticsProjection';
COMMENT ON VIEW public.platform_farm_analytics_projections IS 'Current FarmAnalyticsProjection records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_farm_analytics_projections FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_farm_attendances WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data
FROM public.entity_records WHERE entity_name = 'FarmAttendance';
COMMENT ON VIEW public.platform_farm_attendances IS 'Current FarmAttendance records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_farm_attendances FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_farm_compliance_records WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'block_code' AS "block_code",
  data->'block_name' AS "block_name",
  data->'category' AS "category",
  data->'completed_date' AS "completed_date",
  data->'compliance_area' AS "compliance_area",
  data->'due_date' AS "due_date",
  data->'evidence_reference' AS "evidence_reference",
  data->'farm_name' AS "farm_name",
  data->'impact' AS "impact",
  data->'import_key' AS "import_key",
  data->'mitigation' AS "mitigation",
  data->'notes' AS "notes",
  data->'owner' AS "owner",
  data->'probability' AS "probability",
  data->'programme_code' AS "programme_code",
  data->'rag' AS "rag",
  data->'record_code' AS "record_code",
  data->'recorded_at' AS "recorded_at",
  data->'requirement' AS "requirement",
  data->'risk_code' AS "risk_code",
  data->'source' AS "source",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data
FROM public.entity_records WHERE entity_name = 'FarmComplianceRecord';
COMMENT ON VIEW public.platform_farm_compliance_records IS 'Current FarmComplianceRecord records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_farm_compliance_records FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_farm_expenses WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'activity' AS "activity",
  data->'activity_code' AS "activity_code",
  data->'actual_cost' AS "actual_cost",
  data->'amount' AS "amount",
  data->'approved_by' AS "approved_by",
  data->'block_code' AS "block_code",
  data->'block_name' AS "block_name",
  data->'category' AS "category",
  data->'cost_type' AS "cost_type",
  data->'currency' AS "currency",
  data->'description' AS "description",
  data->'equipment_cost' AS "equipment_cost",
  data->'expense_code' AS "expense_code",
  data->'expense_date' AS "expense_date",
  data->'farm_name' AS "farm_name",
  data->'fuel_cost' AS "fuel_cost",
  data->'import_key' AS "import_key",
  data->'input_cost' AS "input_cost",
  data->'labour_cost' AS "labour_cost",
  data->'notes' AS "notes",
  data->'payment_method' AS "payment_method",
  data->'projected_cost' AS "projected_cost",
  data->'shared_scope' AS "shared_scope",
  data->'source' AS "source",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data->'transport_cost' AS "transport_cost",
  data->'vendor' AS "vendor",
  data
FROM public.entity_records WHERE entity_name = 'FarmExpense';
COMMENT ON VIEW public.platform_farm_expenses IS 'Current FarmExpense records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_farm_expenses FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_farm_finance_records WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'actual_amount' AS "actual_amount",
  data->'amount' AS "amount",
  data->'block_code' AS "block_code",
  data->'block_name' AS "block_name",
  data->'buyer_deductions' AS "buyer_deductions",
  data->'category' AS "category",
  data->'currency' AS "currency",
  data->'description' AS "description",
  data->'farm_name' AS "farm_name",
  data->'first_receipt_snapshot' AS "first_receipt_snapshot",
  data->'harvest_cost' AS "harvest_cost",
  data->'import_key' AS "import_key",
  data->'linked_expense_code' AS "linked_expense_code",
  data->'net_projected' AS "net_projected",
  data->'notes' AS "notes",
  data->'other_payments' AS "other_payments",
  data->'outstanding_at_first_snapshot' AS "outstanding_at_first_snapshot",
  data->'planned_amount' AS "planned_amount",
  data->'price_per_kg' AS "price_per_kg",
  data->'programme_code' AS "programme_code",
  data->'projected_gross' AS "projected_gross",
  data->'record_code' AS "record_code",
  data->'record_date' AS "record_date",
  data->'record_type' AS "record_type",
  data->'source' AS "source",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data->'target_2026' AS "target_2026",
  data->'target_2027' AS "target_2027",
  data->'target_2028' AS "target_2028",
  data->'target_2029' AS "target_2029",
  data->'target_2030' AS "target_2030",
  data->'total_receipts' AS "total_receipts",
  data->'workbook_farm_cost' AS "workbook_farm_cost",
  data->'workbook_investment_cost' AS "workbook_investment_cost",
  data
FROM public.entity_records WHERE entity_name = 'FarmFinanceRecord';
COMMENT ON VIEW public.platform_farm_finance_records IS 'Current FarmFinanceRecord records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_farm_finance_records FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_farm_inputs WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'category' AS "category",
  data->'import_key' AS "import_key",
  data->'input_code' AS "input_code",
  data->'input_name' AS "input_name",
  data->'reorder_level' AS "reorder_level",
  data->'safety_notes' AS "safety_notes",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data->'stock_quantity' AS "stock_quantity",
  data->'storage_location' AS "storage_location",
  data->'supplier' AS "supplier",
  data->'type' AS "type",
  data->'unit' AS "unit",
  data
FROM public.entity_records WHERE entity_name = 'FarmInput';
COMMENT ON VIEW public.platform_farm_inputs IS 'Current FarmInput records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_farm_inputs FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_farm_notes WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'block_name' AS "block_name",
  data->'body' AS "body",
  data->'category' AS "category",
  data->'crop_condition' AS "crop_condition",
  data->'farm_name' AS "farm_name",
  data->'note_date' AS "note_date",
  data->'pest_pressure' AS "pest_pressure",
  data->'soil_condition' AS "soil_condition",
  data->'title' AS "title",
  data
FROM public.entity_records WHERE entity_name = 'FarmNote';
COMMENT ON VIEW public.platform_farm_notes IS 'Current FarmNote records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_farm_notes FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_farm_process_logs WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'activity_date' AS "activity_date",
  data->'activity_title' AS "activity_title",
  data->'block_code' AS "block_code",
  data->'block_name' AS "block_name",
  data->'created_by_name' AS "created_by_name",
  data->'end_time' AS "end_time",
  data->'farm_name' AS "farm_name",
  data->'import_key' AS "import_key",
  data->'log_code' AS "log_code",
  data->'notes' AS "notes",
  data->'performed_by_name' AS "performed_by_name",
  data->'phase' AS "phase",
  data->'quantity' AS "quantity",
  data->'recorded_at' AS "recorded_at",
  data->'role_or_team' AS "role_or_team",
  data->'shared_scope' AS "shared_scope",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data->'start_time' AS "start_time",
  data->'unit_of_measure' AS "unit_of_measure",
  data
FROM public.entity_records WHERE entity_name = 'FarmProcessLog';
COMMENT ON VIEW public.platform_farm_process_logs IS 'Current FarmProcessLog records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_farm_process_logs FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_farm_projects WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'activity_id' AS "activity_id",
  data->'activity_sequence' AS "activity_sequence",
  data->'actual_cost' AS "actual_cost",
  data->'archived_at' AS "archived_at",
  data->'budget_amount' AS "budget_amount",
  data->'buyer_ready_required' AS "buyer_ready_required",
  data->'description' AS "description",
  data->'due_date' AS "due_date",
  data->'end_time' AS "end_time",
  data->'farm_name' AS "farm_name",
  data->'field_area' AS "field_area",
  data->'import_key' AS "import_key",
  data->'is_enabled' AS "is_enabled",
  data->'milestone_code' AS "milestone_code",
  data->'notes' AS "notes",
  data->'owner_id' AS "owner_id",
  data->'owner_name' AS "owner_name",
  data->'priority' AS "priority",
  data->'programme_code' AS "programme_code",
  data->'progress_percent' AS "progress_percent",
  data->'project_code' AS "project_code",
  data->'project_type' AS "project_type",
  data->'rag' AS "rag",
  data->'replaced_by_schedule' AS "replaced_by_schedule",
  data->'source' AS "source",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data->'start_date' AS "start_date",
  data->'start_time' AS "start_time",
  data->'success_criteria' AS "success_criteria",
  data->'timing' AS "timing",
  data->'title' AS "title",
  data->'updated_by_name' AS "updated_by_name",
  data->'updated_from' AS "updated_from",
  data->'workflow_category' AS "workflow_category",
  data
FROM public.entity_records WHERE entity_name = 'FarmProject';
COMMENT ON VIEW public.platform_farm_projects IS 'Current FarmProject records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_farm_projects FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_farm_resource_uses WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'block_name' AS "block_name",
  data->'farm_name' AS "farm_name",
  data->'item_name' AS "item_name",
  data->'notes' AS "notes",
  data->'quantity' AS "quantity",
  data->'resource_type' AS "resource_type",
  data->'unit_cost' AS "unit_cost",
  data->'unit_of_measure' AS "unit_of_measure",
  data->'usage_code' AS "usage_code",
  data->'usage_date' AS "usage_date",
  data
FROM public.entity_records WHERE entity_name = 'FarmResourceUse';
COMMENT ON VIEW public.platform_farm_resource_uses IS 'Current FarmResourceUse records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_farm_resource_uses FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_farm_season_checklists WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'block_code' AS "block_code",
  data->'block_name' AS "block_name",
  data->'completed' AS "completed",
  data->'completed_at' AS "completed_at",
  data->'completed_tasks' AS "completed_tasks",
  data->'end_date' AS "end_date",
  data->'farm_name' AS "farm_name",
  data->'season_year' AS "season_year",
  data->'source' AS "source",
  data->'stage' AS "stage",
  data->'stage_label' AS "stage_label",
  data->'start_date' AS "start_date",
  data->'total_tasks' AS "total_tasks",
  data->'window_code' AS "window_code",
  data->'window_label' AS "window_label",
  data
FROM public.entity_records WHERE entity_name = 'FarmSeasonChecklist';
COMMENT ON VIEW public.platform_farm_season_checklists IS 'Current FarmSeasonChecklist records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_farm_season_checklists FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_farm_tasks WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'assigned_to_name' AS "assigned_to_name",
  data->'block_code' AS "block_code",
  data->'block_name' AS "block_name",
  data->'category' AS "category",
  data->'comments' AS "comments",
  data->'completion_due_at' AS "completion_due_at",
  data->'deliverable' AS "deliverable",
  data->'description' AS "description",
  data->'due_date' AS "due_date",
  data->'farm_name' AS "farm_name",
  data->'field_area' AS "field_area",
  data->'import_key' AS "import_key",
  data->'notes' AS "notes",
  data->'owner_name' AS "owner_name",
  data->'parent_project_id' AS "parent_project_id",
  data->'phase_name' AS "phase_name",
  data->'planned_start' AS "planned_start",
  data->'planned_start_at' AS "planned_start_at",
  data->'planned_window' AS "planned_window",
  data->'priority' AS "priority",
  data->'programme_code' AS "programme_code",
  data->'progress_percent' AS "progress_percent",
  data->'recurrence_rule' AS "recurrence_rule",
  data->'season' AS "season",
  data->'season_key' AS "season_key",
  data->'source' AS "source",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data->'task_code' AS "task_code",
  data->'title' AS "title",
  data->'updated_from' AS "updated_from",
  data->'wbs' AS "wbs",
  data->'weather_trigger' AS "weather_trigger",
  data
FROM public.entity_records WHERE entity_name = 'FarmTask';
COMMENT ON VIEW public.platform_farm_tasks IS 'Current FarmTask records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_farm_tasks FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_harvests WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'batches' AS "batches",
  data->'farm_name' AS "farm_name",
  data->'harvest_code' AS "harvest_code",
  data->'harvest_date' AS "harvest_date",
  data->'harvest_season' AS "harvest_season",
  data->'losses_kg' AS "losses_kg",
  data->'notes' AS "notes",
  data->'quality_grade' AS "quality_grade",
  data->'team_lead' AS "team_lead",
  data->'total_quantity' AS "total_quantity",
  data->'transport_details' AS "transport_details",
  data
FROM public.entity_records WHERE entity_name = 'Harvest';
COMMENT ON VIEW public.platform_harvests IS 'Current Harvest records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_harvests FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_harvest_batches WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'accepted_quantity_kg' AS "accepted_quantity_kg",
  data->'balance_to_collect' AS "balance_to_collect",
  data->'batch_number' AS "batch_number",
  data->'block_name' AS "block_name",
  data->'bs_deduction' AS "bs_deduction",
  data->'crates_used' AS "crates_used",
  data->'destination' AS "destination",
  data->'evidence' AS "evidence",
  data->'farm_name' AS "farm_name",
  data->'grade_a_kg' AS "grade_a_kg",
  data->'grade_b_kg' AS "grade_b_kg",
  data->'grn_number' AS "grn_number",
  data->'gross_amount' AS "gross_amount",
  data->'harvest_code' AS "harvest_code",
  data->'harvest_cost' AS "harvest_cost",
  data->'harvest_date' AS "harvest_date",
  data->'import_key' AS "import_key",
  data->'mango_variety' AS "mango_variety",
  data->'notes' AS "notes",
  data->'opening_stock_kg' AS "opening_stock_kg",
  data->'other_deduction' AS "other_deduction",
  data->'price_per_kg' AS "price_per_kg",
  data->'quantity_harvested_kg' AS "quantity_harvested_kg",
  data->'quantity_invoiced_kg' AS "quantity_invoiced_kg",
  data->'quantity_processed_kg' AS "quantity_processed_kg",
  data->'quantity_supplied_kg' AS "quantity_supplied_kg",
  data->'reject_percentage' AS "reject_percentage",
  data->'rejected_kg' AS "rejected_kg",
  data->'source_batch' AS "source_batch",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data->'statutory_dues' AS "statutory_dues",
  data->'supervisor' AS "supervisor",
  data->'supervisor_name' AS "supervisor_name",
  data->'team' AS "team",
  data->'team_members' AS "team_members",
  data->'team_name' AS "team_name",
  data->'time_recorded' AS "time_recorded",
  data->'total_deduction' AS "total_deduction",
  data->'warehouse' AS "warehouse",
  data->'wf_deduction' AS "wf_deduction",
  data
FROM public.entity_records WHERE entity_name = 'HarvestBatch';
COMMENT ON VIEW public.platform_harvest_batches IS 'Current HarvestBatch records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_harvest_batches FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_harvest_grades WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'batch_number' AS "batch_number",
  data->'destination' AS "destination",
  data->'grade' AS "grade",
  data->'import_key' AS "import_key",
  data->'quantity_kg' AS "quantity_kg",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data
FROM public.entity_records WHERE entity_name = 'HarvestGrade';
COMMENT ON VIEW public.platform_harvest_grades IS 'Current HarvestGrade records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_harvest_grades FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_input_usages WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'activity' AS "activity",
  data->'application_code' AS "application_code",
  data->'application_date' AS "application_date",
  data->'applied_by' AS "applied_by",
  data->'block_code' AS "block_code",
  data->'block_name' AS "block_name",
  data->'farm_name' AS "farm_name",
  data->'import_key' AS "import_key",
  data->'input_name' AS "input_name",
  data->'input_type' AS "input_type",
  data->'purpose' AS "purpose",
  data->'quantity_issued' AS "quantity_issued",
  data->'quantity_used' AS "quantity_used",
  data->'remaining_quantity' AS "remaining_quantity",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data->'supervisor' AS "supervisor",
  data->'unit' AS "unit",
  data->'weather_condition' AS "weather_condition",
  data
FROM public.entity_records WHERE entity_name = 'InputUsage';
COMMENT ON VIEW public.platform_input_usages IS 'Current InputUsage records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_input_usages FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_inquiries WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'company' AS "company",
  data->'email' AS "email",
  data->'inquiry_type' AS "inquiry_type",
  data->'message' AS "message",
  data->'name' AS "name",
  data->'phone' AS "phone",
  data->'source_page' AS "source_page",
  data->'subject' AS "subject",
  data
FROM public.entity_records WHERE entity_name = 'Inquiry';
COMMENT ON VIEW public.platform_inquiries IS 'Current Inquiry records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_inquiries FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_inventory_usages WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'activity' AS "activity",
  data->'approved_by' AS "approved_by",
  data->'block_code' AS "block_code",
  data->'block_name' AS "block_name",
  data->'farm_name' AS "farm_name",
  data->'issued_by' AS "issued_by",
  data->'item' AS "item",
  data->'item_category' AS "item_category",
  data->'notes' AS "notes",
  data->'quantity_issued' AS "quantity_issued",
  data->'quantity_returned' AS "quantity_returned",
  data->'quantity_used' AS "quantity_used",
  data->'received_by' AS "received_by",
  data->'shared_scope' AS "shared_scope",
  data->'total_cost' AS "total_cost",
  data->'unit_cost' AS "unit_cost",
  data->'usage_code' AS "usage_code",
  data->'usage_date' AS "usage_date",
  data->'wastage' AS "wastage",
  data
FROM public.entity_records WHERE entity_name = 'InventoryUsage';
COMMENT ON VIEW public.platform_inventory_usages IS 'Current InventoryUsage records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_inventory_usages FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_invoices WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'amount_paid' AS "amount_paid",
  data->'balance_due' AS "balance_due",
  data->'currency' AS "currency",
  data->'customer_email' AS "customer_email",
  data->'customer_id' AS "customer_id",
  data->'customer_name' AS "customer_name",
  data->'delivery_fee' AS "delivery_fee",
  data->'discount_amount' AS "discount_amount",
  data->'due_date' AS "due_date",
  data->'invoice_date' AS "invoice_date",
  data->'invoice_number' AS "invoice_number",
  data->'items' AS "items",
  data->'line_items' AS "line_items",
  data->'notes' AS "notes",
  data->'order_id' AS "order_id",
  data->'order_number' AS "order_number",
  data->'payment_method' AS "payment_method",
  data->'source' AS "source",
  data->'subtotal' AS "subtotal",
  data->'subtotal_amount' AS "subtotal_amount",
  data->'total_amount' AS "total_amount",
  data->'vat_amount' AS "vat_amount",
  data
FROM public.entity_records WHERE entity_name = 'Invoice';
COMMENT ON VIEW public.platform_invoices IS 'Current Invoice records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_invoices FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_issues WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'action_required' AS "action_required",
  data->'attachments' AS "attachments",
  data->'category' AS "category",
  data->'description' AS "description",
  data->'escalate' AS "escalate",
  data->'estimated_cost' AS "estimated_cost",
  data->'issue_code' AS "issue_code",
  data->'priority' AS "priority",
  data->'related_task' AS "related_task",
  data->'report_date' AS "report_date",
  data->'report_time' AS "report_time",
  data->'resolution' AS "resolution",
  data->'title' AS "title",
  data
FROM public.entity_records WHERE entity_name = 'Issue';
COMMENT ON VIEW public.platform_issues IS 'Current Issue records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_issues FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_job_applications WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'application_number' AS "application_number",
  data->'ats_matched_keywords' AS "ats_matched_keywords",
  data->'ats_score' AS "ats_score",
  data->'ats_status' AS "ats_status",
  data->'candidate_name' AS "candidate_name",
  data->'candidate_summary' AS "candidate_summary",
  data->'certificate_file_name' AS "certificate_file_name",
  data->'certificate_file_url' AS "certificate_file_url",
  data->'cover_letter_file_name' AS "cover_letter_file_name",
  data->'cover_letter_file_url' AS "cover_letter_file_url",
  data->'email' AS "email",
  data->'notes' AS "notes",
  data->'phone' AS "phone",
  data->'resume_file_name' AS "resume_file_name",
  data->'resume_file_url' AS "resume_file_url",
  data->'role_applied_for' AS "role_applied_for",
  data->'source' AS "source",
  data
FROM public.entity_records WHERE entity_name = 'JobApplication';
COMMENT ON VIEW public.platform_job_applications IS 'Current JobApplication records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_job_applications FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_labor_schedules WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'block_name' AS "block_name",
  data->'farm_name' AS "farm_name",
  data->'hours_completed' AS "hours_completed",
  data->'hours_planned' AS "hours_planned",
  data->'notes' AS "notes",
  data->'schedule_code' AS "schedule_code",
  data->'shift_end' AS "shift_end",
  data->'shift_start' AS "shift_start",
  data->'supervisor_name' AS "supervisor_name",
  data->'task_summary' AS "task_summary",
  data->'team_name' AS "team_name",
  data->'work_date' AS "work_date",
  data->'worker_count' AS "worker_count",
  data
FROM public.entity_records WHERE entity_name = 'LaborSchedule';
COMMENT ON VIEW public.platform_labor_schedules IS 'Current LaborSchedule records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_labor_schedules FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_news_posts WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'author_name' AS "author_name",
  data->'body' AS "body",
  data->'category' AS "category",
  data->'content' AS "content",
  data->'excerpt' AS "excerpt",
  data->'featured_image' AS "featured_image",
  data->'gallery_images' AS "gallery_images",
  data->'published_at' AS "published_at",
  data->'slug' AS "slug",
  data->'tags' AS "tags",
  data->'title' AS "title",
  data
FROM public.entity_records WHERE entity_name = 'NewsPost';
COMMENT ON VIEW public.platform_news_posts IS 'Current NewsPost records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_news_posts FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_notifications WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'channel' AS "channel",
  data->'message' AS "message",
  data->'notification_type' AS "notification_type",
  data->'read_at' AS "read_at",
  data->'scheduled_at' AS "scheduled_at",
  data->'sent_at' AS "sent_at",
  data->'target_customer_id' AS "target_customer_id",
  data->'target_user_id' AS "target_user_id",
  data->'title' AS "title",
  data
FROM public.entity_records WHERE entity_name = 'Notification';
COMMENT ON VIEW public.platform_notifications IS 'Current Notification records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_notifications FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_objective_cycles WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'close' AS "close",
  data->'closed_at' AS "closed_at",
  data->'history' AS "history",
  data->'objectives' AS "objectives",
  data->'review' AS "review",
  data->'revision' AS "revision",
  data->'snapshot' AS "snapshot",
  data->'weighted' AS "weighted",
  data->'year' AS "year",
  data
FROM public.entity_records WHERE entity_name = 'ObjectiveCycle';
COMMENT ON VIEW public.platform_objective_cycles IS 'Current ObjectiveCycle records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_objective_cycles FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_orders WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'checkout_key' AS "checkout_key",
  data->'contact_email' AS "contact_email",
  data->'contact_phone' AS "contact_phone",
  data->'currency' AS "currency",
  data->'customer_email' AS "customer_email",
  data->'customer_id' AS "customer_id",
  data->'customer_name' AS "customer_name",
  data->'delivery_address' AS "delivery_address",
  data->'delivery_fee' AS "delivery_fee",
  data->'delivery_notes' AS "delivery_notes",
  data->'discount_amount' AS "discount_amount",
  data->'estimated_delivery' AS "estimated_delivery",
  data->'item_count' AS "item_count",
  data->'items' AS "items",
  data->'line_items' AS "line_items",
  data->'notes' AS "notes",
  data->'order_date' AS "order_date",
  data->'order_number' AS "order_number",
  data->'payment_country' AS "payment_country",
  data->'payment_method' AS "payment_method",
  data->'payment_status' AS "payment_status",
  data->'requested_delivery_date' AS "requested_delivery_date",
  data->'shipping_address' AS "shipping_address",
  data->'shipping_amount' AS "shipping_amount",
  data->'source' AS "source",
  data->'status_history' AS "status_history",
  data->'subtotal' AS "subtotal",
  data->'subtotal_amount' AS "subtotal_amount",
  data->'total_amount' AS "total_amount",
  data->'vat_amount' AS "vat_amount",
  data
FROM public.entity_records WHERE entity_name = 'Order';
COMMENT ON VIEW public.platform_orders IS 'Current Order records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_orders FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_payments WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'amount' AS "amount",
  data->'currency' AS "currency",
  data->'customer_id' AS "customer_id",
  data->'customer_name' AS "customer_name",
  data->'description' AS "description",
  data->'gateway_reference' AS "gateway_reference",
  data->'import_key' AS "import_key",
  data->'invoice_id' AS "invoice_id",
  data->'invoice_number' AS "invoice_number",
  data->'notes' AS "notes",
  data->'payment_date' AS "payment_date",
  data->'payment_method' AS "payment_method",
  data->'payment_number' AS "payment_number",
  data->'payment_reference' AS "payment_reference",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data
FROM public.entity_records WHERE entity_name = 'Payment';
COMMENT ON VIEW public.platform_payments IS 'Current Payment records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_payments FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_pesticide_applications WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'active_ingredient' AS "active_ingredient",
  data->'application_code' AS "application_code",
  data->'application_date' AS "application_date",
  data->'application_rate' AS "application_rate",
  data->'applicator_name' AS "applicator_name",
  data->'block_name' AS "block_name",
  data->'compliance_status' AS "compliance_status",
  data->'crop' AS "crop",
  data->'farm_name' AS "farm_name",
  data->'notes' AS "notes",
  data->'pre_harvest_interval_days' AS "pre_harvest_interval_days",
  data->'product_name' AS "product_name",
  data->'quantity_used' AS "quantity_used",
  data->'reentry_interval_hours' AS "reentry_interval_hours",
  data->'target_pest' AS "target_pest",
  data->'treated_area_acres' AS "treated_area_acres",
  data->'weather_conditions' AS "weather_conditions",
  data
FROM public.entity_records WHERE entity_name = 'PesticideApplication';
COMMENT ON VIEW public.platform_pesticide_applications IS 'Current PesticideApplication records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_pesticide_applications FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_products WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'catalog_id' AS "catalog_id",
  data->'category' AS "category",
  data->'currency' AS "currency",
  data->'description' AS "description",
  data->'featured' AS "featured",
  data->'gallery_images' AS "gallery_images",
  data->'image' AS "image",
  data->'image_url' AS "image_url",
  data->'is_active' AS "is_active",
  data->'name' AS "name",
  data->'origin_farm' AS "origin_farm",
  data->'pack_size' AS "pack_size",
  data->'price' AS "price",
  data->'product_type' AS "product_type",
  data->'shelf_life' AS "shelf_life",
  data->'sku' AS "sku",
  data->'slug' AS "slug",
  data->'specifications' AS "specifications",
  data->'storage_conditions' AS "storage_conditions",
  data->'storefront' AS "storefront",
  data->'unit_of_measure' AS "unit_of_measure",
  data->'variety' AS "variety",
  data->'vat_rate' AS "vat_rate",
  data
FROM public.entity_records WHERE entity_name = 'Product';
COMMENT ON VIEW public.platform_products IS 'Current Product records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_products FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_purchase_orders WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'expected_delivery_date' AS "expected_delivery_date",
  data->'line_items' AS "line_items",
  data->'notes' AS "notes",
  data->'order_date' AS "order_date",
  data->'po_number' AS "po_number",
  data->'subtotal' AS "subtotal",
  data->'supplier_id' AS "supplier_id",
  data->'supplier_name' AS "supplier_name",
  data->'total_amount' AS "total_amount",
  data->'vat_amount' AS "vat_amount",
  data
FROM public.entity_records WHERE entity_name = 'PurchaseOrder';
COMMENT ON VIEW public.platform_purchase_orders IS 'Current PurchaseOrder records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_purchase_orders FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_quality_checks WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'batch_number' AS "batch_number",
  data->'defect_percentage' AS "defect_percentage",
  data->'defect_type' AS "defect_type",
  data->'export_approved' AS "export_approved",
  data->'farm_name' AS "farm_name",
  data->'grade_a_kg' AS "grade_a_kg",
  data->'grade_b_kg' AS "grade_b_kg",
  data->'import_key' AS "import_key",
  data->'inspection_date' AS "inspection_date",
  data->'inspector' AS "inspector",
  data->'notes' AS "notes",
  data->'qc_code' AS "qc_code",
  data->'rejected_kg' AS "rejected_kg",
  data->'sample_size' AS "sample_size",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data->'stage' AS "stage",
  data->'total_quantity' AS "total_quantity",
  data
FROM public.entity_records WHERE entity_name = 'QualityCheck';
COMMENT ON VIEW public.platform_quality_checks IS 'Current QualityCheck records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_quality_checks FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_quotations WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'customer_id' AS "customer_id",
  data->'customer_name' AS "customer_name",
  data->'discount_amount' AS "discount_amount",
  data->'line_items' AS "line_items",
  data->'notes' AS "notes",
  data->'quote_date' AS "quote_date",
  data->'quote_number' AS "quote_number",
  data->'subtotal' AS "subtotal",
  data->'total_amount' AS "total_amount",
  data->'valid_until' AS "valid_until",
  data->'vat_amount' AS "vat_amount",
  data
FROM public.entity_records WHERE entity_name = 'Quotation';
COMMENT ON VIEW public.platform_quotations IS 'Current Quotation records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_quotations FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_returns WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'approved_by' AS "approved_by",
  data->'customer_id' AS "customer_id",
  data->'customer_name' AS "customer_name",
  data->'invoice_id' AS "invoice_id",
  data->'invoice_number' AS "invoice_number",
  data->'notes' AS "notes",
  data->'reason' AS "reason",
  data->'return_date' AS "return_date",
  data->'return_number' AS "return_number",
  data->'total_amount' AS "total_amount",
  data
FROM public.entity_records WHERE entity_name = 'Return';
COMMENT ON VIEW public.platform_returns IS 'Current Return records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_returns FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_stock_items WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'batch_reference' AS "batch_reference",
  data->'bin_location' AS "bin_location",
  data->'product_id' AS "product_id",
  data->'product_name' AS "product_name",
  data->'quantity_on_hand' AS "quantity_on_hand",
  data->'quantity_reserved' AS "quantity_reserved",
  data->'reorder_level' AS "reorder_level",
  data->'sku' AS "sku",
  data->'unit_cost' AS "unit_cost",
  data->'warehouse_id' AS "warehouse_id",
  data->'warehouse_name' AS "warehouse_name",
  data
FROM public.entity_records WHERE entity_name = 'StockItem';
COMMENT ON VIEW public.platform_stock_items IS 'Current StockItem records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_stock_items FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_stock_movements WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'batch_number' AS "batch_number",
  data->'import_key' AS "import_key",
  data->'movement_code' AS "movement_code",
  data->'movement_date' AS "movement_date",
  data->'movement_type' AS "movement_type",
  data->'product_id' AS "product_id",
  data->'product_name' AS "product_name",
  data->'quantity' AS "quantity",
  data->'remarks' AS "remarks",
  data->'source_document_id' AS "source_document_id",
  data->'source_document_type' AS "source_document_type",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data->'unit_cost' AS "unit_cost",
  data->'unit_of_measure' AS "unit_of_measure",
  data->'warehouse_id' AS "warehouse_id",
  data->'warehouse_name' AS "warehouse_name",
  data
FROM public.entity_records WHERE entity_name = 'StockMovement';
COMMENT ON VIEW public.platform_stock_movements IS 'Current StockMovement records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_stock_movements FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_suppliers WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'address' AS "address",
  data->'country' AS "country",
  data->'email' AS "email",
  data->'name' AS "name",
  data->'notes' AS "notes",
  data->'payment_terms' AS "payment_terms",
  data->'performance_rating' AS "performance_rating",
  data->'phone' AS "phone",
  data->'products_supplied' AS "products_supplied",
  data->'supplier_code' AS "supplier_code",
  data->'tax_id' AS "tax_id",
  data
FROM public.entity_records WHERE entity_name = 'Supplier';
COMMENT ON VIEW public.platform_suppliers IS 'Current Supplier records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_suppliers FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_vehicles WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'capacity_kg' AS "capacity_kg",
  data->'driver_name' AS "driver_name",
  data->'insurance_expiry' AS "insurance_expiry",
  data->'last_service_date' AS "last_service_date",
  data->'plate_number' AS "plate_number",
  data->'vehicle_code' AS "vehicle_code",
  data->'vehicle_type' AS "vehicle_type",
  data
FROM public.entity_records WHERE entity_name = 'Vehicle';
COMMENT ON VIEW public.platform_vehicles IS 'Current Vehicle records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_vehicles FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_warehouses WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'capacity_kg' AS "capacity_kg",
  data->'contact_phone' AS "contact_phone",
  data->'location' AS "location",
  data->'manager_name' AS "manager_name",
  data->'name' AS "name",
  data->'region' AS "region",
  data->'warehouse_code' AS "warehouse_code",
  data
FROM public.entity_records WHERE entity_name = 'Warehouse';
COMMENT ON VIEW public.platform_warehouses IS 'Current Warehouse records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_warehouses FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_waste_losses WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data->'action_taken' AS "action_taken",
  data->'batch_number' AS "batch_number",
  data->'estimated_value' AS "estimated_value",
  data->'farm_name' AS "farm_name",
  data->'import_key' AS "import_key",
  data->'loss_code' AS "loss_code",
  data->'loss_date' AS "loss_date",
  data->'loss_type' AS "loss_type",
  data->'quantity' AS "quantity",
  data->'reason' AS "reason",
  data->'reported_by' AS "reported_by",
  data->'source_range' AS "source_range",
  data->'source_sheet' AS "source_sheet",
  data->'source_workbook' AS "source_workbook",
  data->'unit' AS "unit",
  data
FROM public.entity_records WHERE entity_name = 'WasteLoss';
COMMENT ON VIEW public.platform_waste_losses IS 'Current WasteLoss records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_waste_losses FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_weather_logs WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data
FROM public.entity_records WHERE entity_name = 'WeatherLog';
COMMENT ON VIEW public.platform_weather_logs IS 'Current WeatherLog records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_weather_logs FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_work_orders WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data
FROM public.entity_records WHERE entity_name = 'WorkOrder';
COMMENT ON VIEW public.platform_work_orders IS 'Current WorkOrder records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_work_orders FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_workers WITH (security_invoker = true) AS
SELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,
  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,
  data
FROM public.entity_records WHERE entity_name = 'Worker';
COMMENT ON VIEW public.platform_workers IS 'Current Worker records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';
REVOKE ALL ON public.platform_workers FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_farms WITH (security_invoker = true) AS SELECT * FROM public.farms;
COMMENT ON VIEW public.platform_farms IS 'Canonical farms records. Read through this view; save through the authenticated application API.';
REVOKE ALL ON public.platform_farms FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_farm_blocks WITH (security_invoker = true) AS SELECT * FROM public.farm_blocks;
COMMENT ON VIEW public.platform_farm_blocks IS 'Canonical farm_blocks records. Read through this view; save through the authenticated application API.';
REVOKE ALL ON public.platform_farm_blocks FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_users WITH (security_invoker = true) AS SELECT id, email, full_name, role, status, page_access, created_at, updated_at FROM public.users;
COMMENT ON VIEW public.platform_users IS 'Canonical users records. Read through this view; save through the authenticated application API.';
REVOKE ALL ON public.platform_users FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_system_log WITH (security_invoker = true) AS SELECT * FROM public.audit_events;
COMMENT ON VIEW public.platform_system_log IS 'Canonical audit_events records. Read through this view; save through the authenticated application API.';
REVOKE ALL ON public.platform_system_log FROM PUBLIC;
