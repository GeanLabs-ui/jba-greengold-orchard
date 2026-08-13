import { pgTable, text, timestamp, integer, boolean, real, jsonb, index, primaryKey } from 'drizzle-orm/pg-core';

// --- IAM Domain ---
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash'),
  passwordSalt: text('password_salt'),
  googleSubject: text('google_subject').unique(),
  fullName: text('full_name'),
  role: text('role').default('user'),
  pageAccess: jsonb('page_access'),
  status: text('status').default('active'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const organizationMembers = pgTable('organization_members', {
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').default('customer').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.organizationId, table.userId] }),
  index('organization_members_user_idx').on(table.userId),
]);

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').unique().notNull(),
  csrfToken: text('csrf_token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('sessions_user_idx').on(table.userId), index('sessions_expiry_idx').on(table.expiresAt)]);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('password_reset_user_idx').on(table.userId)]);

export const staffInvitations = pgTable('staff_invitations', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  fullName: text('full_name'),
  role: text('role').notNull(),
  pageAccess: jsonb('page_access'),
  employeeId: text('employee_id'),
  tokenHash: text('token_hash').unique().notNull(),
  invitedBy: text('invited_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('staff_invitations_expiry_idx').on(table.expiresAt),
]);

export const entityRecords = pgTable('entity_records', {
  id: text('id').primaryKey(),
  entityName: text('entity_name').notNull(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  ownerUserId: text('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
  data: jsonb('data').notNull(),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('entity_records_entity_created_idx').on(table.entityName, table.createdAt),
  index('entity_records_owner_idx').on(table.ownerUserId, table.entityName),
  index('entity_records_org_idx').on(table.organizationId, table.entityName),
]);

export const fileObjects = pgTable('file_objects', {
  id: text('id').primaryKey(),
  objectKey: text('object_key').unique().notNull(),
  originalName: text('original_name').notNull(),
  contentType: text('content_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  ownerUserId: text('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
  recordId: text('record_id'),
  status: text('status').default('quarantined').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('file_objects_record_idx').on(table.recordId)]);

export const rateLimitWindows = pgTable('rate_limit_windows', {
  keyHash: text('key_hash').notNull(),
  action: text('action').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').default(1).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.keyHash, table.action, table.windowStart] }),
  index('rate_limit_expiry_idx').on(table.expiresAt),
]);

// --- Farm Operations Domain ---
export const farms = pgTable('farms', {
  id: text('id').primaryKey(),
  farmCode: text('farm_code').unique().notNull(),
  name: text('name').notNull(),
  location: text('location'),
  region: text('region'),
  country: text('country').default('Ghana'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  soilType: text('soil_type'),
  soilPh: real('soil_ph'),
  soilNotes: text('soil_notes'),
  sizeAcres: real('size_acres'),
  ownerName: text('owner_name'),
  treeCount: integer('tree_count').default(0),
  productionCapacityKg: integer('production_capacity_kg').default(0),
  status: text('status').default('active'), // 'active' | 'inactive' | 'archived'
  imageUrl: text('image_url'),
  description: text('description'),
  notes: text('notes'),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  operationsStartedOn: text('operations_started_on'),
  plantingStartedOn: text('planting_started_on'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('farms_status_idx').on(table.status),
  index('farms_organization_idx').on(table.organizationId),
]);

export const farmBlocks = pgTable('farm_blocks', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id, { onDelete: 'cascade' }),
  blockCode: text('block_code').notNull(),
  name: text('name').notNull(),
  sizeAcres: real('size_acres'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  soilType: text('soil_type'),
  soilPh: real('soil_ph'),
  soilNotes: text('soil_notes'),
  description: text('description'),
  earlyBlockClassification: text('early_block_classification'),
  yearPlanted: integer('year_planted'),
  variety: text('variety'), // legacy single-variety field, superseded by blockCropInventories; kept read-only for old data
  treeCount: integer('tree_count').default(0),
  status: text('status').default('active'), // 'active' | 'inactive' | 'merged' | 'archived'
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  programmeCode: text('programme_code'),
  source: text('source'),
  earlyHarvest: boolean('early_harvest').default(false).notNull(),
  shootMaturity: real('shoot_maturity').default(0).notNull(),
  forecastYieldKg: real('forecast_yield_kg'),
  fruitFlyPressure: text('fruit_fly_pressure'),
  diseaseRating: text('disease_rating'),
  operationsStartedOn: text('operations_started_on'),
  plantingStartedOn: text('planting_started_on'),
  mergedIntoBlockId: text('merged_into_block_id'),
  mergeEffectiveDate: text('merge_effective_date'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('farm_blocks_farm_id_idx').on(table.farmId),
  index('farm_blocks_status_idx').on(table.status),
  index('farm_blocks_programme_code_idx').on(table.programmeCode),
]);

export const cropVarieties = pgTable('crop_varieties', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const blockCropInventories = pgTable('block_crop_inventories', {
  id: text('id').primaryKey(),
  blockId: text('block_id').notNull().references(() => farmBlocks.id, { onDelete: 'cascade' }),
  cropVarietyId: text('crop_variety_id').notNull().references(() => cropVarieties.id),
  totalTrees: integer('total_trees').default(0).notNull(),
  productiveTrees: integer('productive_trees').default(0).notNull(),
  nonProductiveTrees: integer('non_productive_trees').default(0).notNull(),
  deadTrees: integer('dead_trees').default(0).notNull(),
  plantingDate: text('planting_date'),
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('block_crop_inventories_block_idx').on(table.blockId, table.effectiveFrom)]);

export const farmStatusHistory = pgTable('farm_status_history', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id, { onDelete: 'cascade' }),
  action: text('action').notNull(), // 'deactivated' | 'reactivated' | 'archived'
  previousStatus: text('previous_status'),
  newStatus: text('new_status').notNull(),
  reason: text('reason'),
  effectiveDate: text('effective_date'),
  performedBy: text('performed_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('farm_status_history_farm_idx').on(table.farmId, table.createdAt)]);

export const blockStatusHistory = pgTable('block_status_history', {
  id: text('id').primaryKey(),
  blockId: text('block_id').notNull().references(() => farmBlocks.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  previousStatus: text('previous_status'),
  newStatus: text('new_status').notNull(),
  reason: text('reason'),
  effectiveDate: text('effective_date'),
  performedBy: text('performed_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('block_status_history_block_idx').on(table.blockId, table.createdAt)]);

export const harvestPeriods = pgTable('harvest_periods', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  farmId: text('farm_id').notNull().references(() => farms.id, { onDelete: 'cascade' }),
  blockId: text('block_id').references(() => farmBlocks.id),
  cropVarietyId: text('crop_variety_id').references(() => cropVarieties.id),
  harvestType: text('harvest_type').notNull(), // 'early_harvest' | 'major_harvest' | 'late_harvest' | 'off_season_harvest'
  status: text('status').default('planned').notNull(), // 'planned' | 'active' | 'completed' | 'cancelled'
  seasonYear: integer('season_year'),
  expectedStartDate: text('expected_start_date'),
  expectedEndDate: text('expected_end_date'),
  actualStartDate: text('actual_start_date'),
  actualEndDate: text('actual_end_date'),
  expectedYieldKg: real('expected_yield_kg').default(0),
  actualYieldKg: real('actual_yield_kg').default(0),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('harvest_periods_block_type_idx').on(table.blockId, table.harvestType),
  index('harvest_periods_farm_date_idx').on(table.farmId, table.expectedStartDate),
  index('harvest_periods_status_idx').on(table.status),
]);

export const yieldRecords = pgTable('yield_records', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  farmId: text('farm_id').notNull().references(() => farms.id, { onDelete: 'cascade' }),
  blockId: text('block_id').notNull().references(() => farmBlocks.id),
  harvestPeriodId: text('harvest_period_id').references(() => harvestPeriods.id),
  cropVarietyId: text('crop_variety_id').references(() => cropVarieties.id),
  recordDate: text('record_date').notNull(),
  harvestType: text('harvest_type'),
  actualYieldKg: real('actual_yield_kg').default(0).notNull(),
  forecastYieldKg: real('forecast_yield_kg').default(0),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('yield_records_block_date_idx').on(table.blockId, table.recordDate),
  index('yield_records_farm_date_idx').on(table.farmId, table.recordDate),
]);

export const farmActivityPeriods = pgTable('farm_activity_periods', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  farmId: text('farm_id').notNull().references(() => farms.id, { onDelete: 'cascade' }),
  blockId: text('block_id').references(() => farmBlocks.id),
  activityType: text('activity_type').notNull(), // extensible: see apps/api/src/modules/farm-activity-types.ts
  status: text('status').default('planned').notNull(), // 'planned' | 'in_progress' | 'completed' | 'delayed' | 'cancelled'
  seasonYear: integer('season_year'),
  plannedStartDate: text('planned_start_date'),
  plannedEndDate: text('planned_end_date'),
  actualStartDate: text('actual_start_date'),
  actualEndDate: text('actual_end_date'),
  completionPercent: integer('completion_percent').default(0).notNull(),
  assignedTo: text('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('farm_activity_periods_block_date_idx').on(table.blockId, table.plannedStartDate),
  index('farm_activity_periods_farm_date_idx').on(table.farmId, table.plannedStartDate),
  index('farm_activity_periods_status_idx').on(table.status),
]);

export const blockMerges = pgTable('block_merges', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  farmId: text('farm_id').notNull().references(() => farms.id, { onDelete: 'cascade' }),
  destinationBlockId: text('destination_block_id').notNull().references(() => farmBlocks.id),
  effectiveDate: text('effective_date').notNull(),
  reason: text('reason').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  status: text('status').default('completed').notNull(),
  impactSnapshot: jsonb('impact_snapshot').notNull(),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('block_merges_farm_idx').on(table.farmId),
  index('block_merges_destination_idx').on(table.destinationBlockId),
]);

export const blockMergeSources = pgTable('block_merge_sources', {
  id: text('id').primaryKey(),
  blockMergeId: text('block_merge_id').notNull().references(() => blockMerges.id, { onDelete: 'cascade' }),
  sourceBlockId: text('source_block_id').notNull().references(() => farmBlocks.id),
  preMergeStatus: text('pre_merge_status').notNull(),
  preMergeSnapshot: jsonb('pre_merge_snapshot').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('block_merge_sources_source_idx').on(table.sourceBlockId)]);

export const cropPlans = pgTable('crop_plans', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').references(() => farms.id, { onDelete: 'cascade' }),
  blockId: text('block_id').references(() => farmBlocks.id, { onDelete: 'cascade' }),
  cropVariety: text('crop_variety').notNull(),
  plantingDate: timestamp('planting_date', { withTimezone: true }),
  targetHarvestDate: timestamp('target_harvest_date', { withTimezone: true }),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const dailyActivities = pgTable('daily_activities', {
  id: text('id').primaryKey(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  farmId: text('farm_id').references(() => farms.id),
  blockId: text('block_id').references(() => farmBlocks.id),
  category: text('category').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  startTime: text('start_time'),
  endTime: text('end_time'),
  supervisorId: text('supervisor_id'),
  status: text('status').default('planned'),
  fuelUsed: real('fuel_used').default(0),
  weatherCondition: text('weather_condition'),
  safetyIncident: text('safety_incident'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Workforce Domain ---
export const employees = pgTable('employees', {
  id: text('id').primaryKey(),
  employeeCode: text('employee_code').unique().notNull(),
  fullName: text('full_name').notNull(),
  department: text('department'),
  role: text('role').notNull(),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const attendance = pgTable('attendance', {
  id: text('id').primaryKey(),
  employeeName: text('employee_name').notNull(),
  attendanceDate: text('attendance_date').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const jobApplications = pgTable('job_applications', {
  id: text('id').primaryKey(),
  applicationNumber: text('application_number').unique().notNull(),
  candidateName: text('candidate_name').notNull(),
  roleAppliedFor: text('role_applied_for').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  resumeFileName: text('resume_file_name'),
  coverLetterFileName: text('cover_letter_file_name'),
  certificateFileName: text('certificate_file_name'),
  atsScore: integer('ats_score').default(0),
  atsStatus: text('ats_status'),
  atsMatchedKeywords: jsonb('ats_matched_keywords').default('[]'),
  status: text('status').default('new'),
  source: text('source'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Equipment & Assets Domain ---
export const equipment = pgTable('equipment', {
  id: text('id').primaryKey(),
  equipmentName: text('equipment_name').notNull(),
  category: text('category').notNull(),
  status: text('status').default('active'),
  condition: text('condition').default('good'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Inputs Domain ---
export const farmInputs = pgTable('farm_inputs', {
  id: text('id').primaryKey(),
  inputName: text('input_name').notNull(),
  category: text('category').notNull(),
  stockQuantity: real('stock_quantity').default(0),
  unit: text('unit').notNull(),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Harvest Domain ---
export const harvestBatches = pgTable('harvest_batches', {
  id: text('id').primaryKey(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  farmId: text('farm_id').references(() => farms.id),
  blockId: text('block_id').references(() => farmBlocks.id),
  mangoVariety: text('mango_variety').notNull(),
  quantityHarvested: real('quantity_harvested').notNull(),
  gradeA: real('grade_a').default(0),
  gradeB: real('grade_b').default(0),
  rejected: real('rejected').default(0),
  cratesUsed: integer('crates_used').default(0),
  destination: text('destination'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Inventory Domain ---
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').unique().notNull(),
  productType: text('product_type').notNull(),
  variety: text('variety'),
  description: text('description'),
  price: integer('price').notNull(), // standard integer storage representing cents
  unitOfMeasure: text('unit_of_measure').notNull(),
  featured: boolean('featured').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const warehouses = pgTable('warehouses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const stockMovements = pgTable('stock_movements', {
  id: text('id').primaryKey(),
  productName: text('product_name').notNull(),
  movementType: text('movement_type').notNull(),
  quantity: real('quantity').notNull(),
  movementDate: timestamp('movement_date', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Commercial Domain ---
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  phone: text('phone'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  customerName: text('customer_name').notNull(),
  orderNumber: text('order_number').unique().notNull(),
  orderDate: timestamp('order_date', { withTimezone: true }).notNull(),
  status: text('status').default('pending'),
  totalAmount: integer('total_amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoice_number').unique().notNull(),
  customerName: text('customer_name').notNull(),
  invoiceDate: timestamp('invoice_date', { withTimezone: true }).notNull(),
  status: text('status').default('unpaid'),
  totalAmount: integer('total_amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  paymentNumber: text('payment_number').unique().notNull(),
  customerName: text('customer_name').notNull(),
  paymentDate: timestamp('payment_date', { withTimezone: true }).notNull(),
  paymentMethod: text('payment_method').notNull(),
  status: text('status').default('completed'),
  amount: integer('amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Procurement Domain ---
export const suppliers = pgTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const purchaseOrders = pgTable('purchase_orders', {
  id: text('id').primaryKey(),
  poNumber: text('po_number').unique().notNull(),
  supplierName: text('supplier_name').notNull(),
  orderDate: timestamp('order_date', { withTimezone: true }).notNull(),
  status: text('status').default('draft'),
  totalAmount: integer('total_amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const quotations = pgTable('quotations', {
  id: text('id').primaryKey(),
  quoteNumber: text('quote_number').unique().notNull(),
  customerName: text('customer_name').notNull(),
  quoteDate: timestamp('quote_date', { withTimezone: true }).notNull(),
  status: text('status').default('draft'),
  totalAmount: integer('total_amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const returns = pgTable('returns', {
  id: text('id').primaryKey(),
  returnNumber: text('return_number').unique().notNull(),
  customerName: text('customer_name').notNull(),
  returnDate: timestamp('return_date', { withTimezone: true }).notNull(),
  status: text('status').default('pending'),
  totalAmount: integer('total_amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Logistics Domain ---
export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  vehicleNumber: text('vehicle_number').unique().notNull(),
  vehicleType: text('vehicle_type').notNull(),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const exportShipments = pgTable('export_shipments', {
  id: text('id').primaryKey(),
  shipmentNumber: text('shipment_number').unique().notNull(),
  destinationCountry: text('destination_country').notNull(),
  status: text('status').default('preparing'),
  departureDate: text('departure_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Finance Domain ---
export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  expenseNumber: text('expense_number').unique().notNull(),
  category: text('category').notNull(),
  expenseDate: timestamp('expense_date', { withTimezone: true }).notNull(),
  amount: integer('amount').notNull(),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Content & Media Domain ---
export const contentPages = pgTable('content_pages', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').unique().notNull(),
  status: text('status').default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const newsPosts = pgTable('news_posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').unique().notNull(),
  category: text('category').notNull(),
  excerpt: text('excerpt'),
  content: text('content'),
  status: text('status').default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Platform & Operational Domain ---
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customerContracts = pgTable('customer_contracts', {
  id: text('id').primaryKey(),
  contractNumber: text('contract_number').unique().notNull(),
  customerName: text('customer_name').notNull(),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const certifications = pgTable('certifications', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status').default('valid'),
  expiryDate: text('expiry_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const auditEvents = pgTable('audit_events', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  action: text('action').notNull(),
  targetTable: text('target_table').notNull(),
  recordId: text('record_id').notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: text('ip_address'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});
