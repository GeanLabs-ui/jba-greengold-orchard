# Platform database views

Migration 0023 adds named public.platform_* SQL views without moving records, changing IDs, rewriting JSON, or changing application save routes. New records and edits appear immediately because views query the canonical tables. These are views, not new physical tables.

Farm, block, user and System Log views use their relational tables. Other views use entity_records filtered by the exact API entity name. Existing similarly named legacy tables are retained; do not assume they are the current source of truth.

All views use security_invoker and grant no access to PUBLIC. Existing database permissions and RLS still apply. They are for authorized database inspection and reporting; they do not replace API authorization. Do not expose them through a browser Data API.

Feature columns extracted with the JSON operator retain original JSON types, zeroes, empty arrays and historical values. Missing keys appear as SQL NULL; the data column preserves every existing and future field. No legacy name or value is silently normalized. Save through the application API to retain validation, organization checks and audit events.

| Feature/entity | SQL view |
| --- | --- |
| ActivityEquipment | public.platform_activity_equipments |
| ActivityInput | public.platform_activity_inputs |
| ActivityWorker | public.platform_activity_workers |
| Approval | public.platform_approvals |
| Attendance | public.platform_attendances |
| AuditLog | public.platform_audit_logs |
| CalendarConnection | public.platform_calendar_connections |
| CalendarEvent | public.platform_calendar_events |
| Certification | public.platform_certifications |
| ContentPage | public.platform_content_pages |
| CropPlan | public.platform_crop_plans |
| Customer | public.platform_customers |
| CustomerContract | public.platform_customer_contracts |
| CustomerStory | public.platform_customer_stories |
| DailyActivity | public.platform_daily_activities |
| DailyReport | public.platform_daily_reports |
| Delivery | public.platform_deliveries |
| Department | public.platform_departments |
| Employee | public.platform_employees |
| Equipment | public.platform_inventory_items |
| EquipmentUsage | public.platform_equipment_usages |
| Expense | public.platform_expenses |
| ExportShipment | public.platform_export_shipments |
| FarmAnalyticsProjection | public.platform_farm_analytics_projections |
| FarmAttendance | public.platform_farm_attendances |
| FarmComplianceRecord | public.platform_farm_compliance_records |
| FarmExpense | public.platform_farm_expenses |
| FarmFinanceRecord | public.platform_farm_finance_records |
| FarmInput | public.platform_farm_inputs |
| FarmNote | public.platform_farm_notes |
| FarmProcessLog | public.platform_farm_process_logs |
| FarmProject | public.platform_farm_projects |
| FarmResourceUse | public.platform_farm_resource_uses |
| FarmSeasonChecklist | public.platform_farm_season_checklists |
| FarmTask | public.platform_farm_tasks |
| Harvest | public.platform_harvests |
| HarvestBatch | public.platform_harvest_batches |
| HarvestGrade | public.platform_harvest_grades |
| InputUsage | public.platform_input_usages |
| Inquiry | public.platform_inquiries |
| InventoryUsage | public.platform_inventory_usages |
| Invoice | public.platform_invoices |
| Issue | public.platform_issues |
| JobApplication | public.platform_job_applications |
| LaborSchedule | public.platform_labor_schedules |
| NewsPost | public.platform_news_posts |
| Notification | public.platform_notifications |
| ObjectiveCycle | public.platform_objective_cycles |
| Order | public.platform_orders |
| Payment | public.platform_payments |
| PesticideApplication | public.platform_pesticide_applications |
| Product | public.platform_products |
| PurchaseOrder | public.platform_purchase_orders |
| QualityCheck | public.platform_quality_checks |
| Quotation | public.platform_quotations |
| Return | public.platform_returns |
| StockItem | public.platform_stock_items |
| StockMovement | public.platform_stock_movements |
| Supplier | public.platform_suppliers |
| Vehicle | public.platform_vehicles |
| Warehouse | public.platform_warehouses |
| WasteLoss | public.platform_waste_losses |
| WeatherLog | public.platform_weather_logs |
| WorkOrder | public.platform_work_orders |
| Worker | public.platform_workers |
| Farm | public.platform_farms |
| FarmBlock | public.platform_farm_blocks |
| User (no credential columns) | public.platform_users |
| System Log | public.platform_system_log |

## Validation and rollback

Run the migration on an isolated database first. Compare every view ID and data value with its canonical source using EXCEPT in both directions. Verify existing row fingerprints before and after application. Apply only 0023 when the intent is named views; do not run unrelated pending data migrations. Roll back application changes without dropping views or records. These views require PostgreSQL 15 or newer.
