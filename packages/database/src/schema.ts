import { pgTable, text, timestamp, integer, boolean, real, jsonb } from 'drizzle-orm/pg-core';

// --- IAM Domain ---
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash'),
  passwordSalt: text('password_salt'),
  fullName: text('full_name'),
  role: text('role').default('user'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

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
  sizeAcres: real('size_acres'),
  ownerName: text('owner_name'),
  treeCount: integer('tree_count').default(0),
  productionCapacityKg: integer('production_capacity_kg').default(0),
  status: text('status').default('active'),
  imageUrl: text('image_url'),
  description: text('description'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const farmBlocks = pgTable('farm_blocks', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').references(() => farms.id, { onDelete: 'cascade' }),
  blockCode: text('block_code').notNull(),
  name: text('name').notNull(),
  sizeAcres: real('size_acres'),
  variety: text('variety'),
  treeCount: integer('tree_count').default(0),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

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
