const STORAGE_PREFIX = 'mango_farm_local';
const USERS_KEY = `${STORAGE_PREFIX}:users`;
const SESSION_KEY = `${STORAGE_PREFIX}:session`;
const DATA_KEY = `${STORAGE_PREFIX}:data`;

const nowIso = () => new Date().toISOString();

const createId = (prefix = 'id') => (
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
);

const toBase64 = (bytes) => (
  btoa(String.fromCharCode(...bytes))
);

const createSalt = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toBase64(bytes);
};

const hashPassword = async (password, salt) => {
  const payload = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', payload);
  return toBase64(new Uint8Array(digest));
};

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const seedData = {
  Product: [
    {
      id: 'product_001',
      name: 'Premium Kent Mango',
      sku: 'MNG-KENT-001',
      product_type: 'fresh_fruit',
      variety: 'Kent',
      description: 'Large, fiberless export-grade mangoes with excellent shelf life.',
      price: 8500,
      unit_of_measure: 'kg',
      featured: true,
      is_active: true,
      created_date: '2026-07-01T09:00:00.000Z',
    },
    {
      id: 'product_002',
      name: 'Dried Mango Slices',
      sku: 'MNG-DRIED-002',
      product_type: 'dried',
      variety: 'Mixed',
      description: 'Naturally dried mango slices packed for retail and wholesale.',
      price: 28000,
      unit_of_measure: 'pack',
      featured: true,
      is_active: true,
      created_date: '2026-07-02T09:00:00.000Z',
    },
    {
      id: 'product_003',
      name: 'Mango Pulp',
      sku: 'MNG-PULP-003',
      product_type: 'pulp',
      variety: 'Keitt',
      description: 'Processed mango pulp for juice makers, bakeries, and food processors.',
      price: 14500,
      unit_of_measure: 'liter',
      featured: true,
      is_active: true,
      created_date: '2026-07-03T09:00:00.000Z',
    },
  ],
  NewsPost: [
    {
      id: 'news_001',
      title: 'July Harvest Window Opens Strong',
      slug: 'july-harvest-window-opens-strong',
      category: 'harvest_update',
      excerpt: 'Our early July harvest is showing strong fruit size, color, and export readiness.',
      content: 'The July harvest window has opened with strong quality indicators across our managed farms.',
      status: 'published',
      published_at: '2026-07-04T10:00:00.000Z',
      created_date: '2026-07-04T10:00:00.000Z',
    },
    {
      id: 'news_002',
      title: 'Cold Chain Upgrade Improves Delivery Times',
      slug: 'cold-chain-upgrade-improves-delivery-times',
      category: 'operations',
      excerpt: 'New cold-chain handling processes are reducing spoilage and improving buyer confidence.',
      content: 'Our logistics team has upgraded dispatch and cold-chain checkpoints for export and local supply.',
      status: 'published',
      published_at: '2026-07-05T10:00:00.000Z',
      created_date: '2026-07-05T10:00:00.000Z',
    },
  ],
  Farm: [
    {
      id: 'farm_001',
      farm_code: 'FRM-001',
      name: 'Eastern Ridge Orchard',
      location: 'Dodowa',
      region: 'Greater Accra',
      size_acres: 120,
      tree_count: 4200,
      production_capacity_kg: 96000,
      mango_varieties: ['Kent', 'Keitt', 'Palmer'],
      status: 'active',
      description: 'Primary production site for premium export mangoes.',
      created_date: '2026-06-01T08:00:00.000Z',
    },
    {
      id: 'farm_002',
      farm_code: 'FRM-002',
      name: 'Volta Valley Farm',
      location: 'Ho',
      region: 'Volta',
      size_acres: 85,
      tree_count: 2850,
      production_capacity_kg: 64000,
      mango_varieties: ['Julie', 'Kent'],
      status: 'active',
      description: 'Sustainably managed orchard serving local and regional buyers.',
      created_date: '2026-06-02T08:00:00.000Z',
    },
  ],
  FarmBlock: [
    {
      id: 'block_001',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_code: 'ER-A1',
      name: 'North Kent Block',
      area_acres: 42,
      mango_variety: 'Kent',
      soil_condition: 'Loamy, good drainage',
      irrigation_status: 'scheduled',
      status: 'active',
      created_date: '2026-06-03T08:00:00.000Z',
    },
    {
      id: 'block_002',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_code: 'ER-B2',
      name: 'Keitt Trial Block',
      area_acres: 31,
      mango_variety: 'Keitt',
      soil_condition: 'Moist, nutrient boost required',
      irrigation_status: 'active',
      status: 'active',
      created_date: '2026-06-04T08:00:00.000Z',
    },
    {
      id: 'block_003',
      farm_id: 'farm_002',
      farm_name: 'Volta Valley Farm',
      block_code: 'VV-A1',
      name: 'Julie Valley Block',
      area_acres: 28,
      mango_variety: 'Julie',
      soil_condition: 'Sandy loam',
      irrigation_status: 'monitoring',
      status: 'active',
      created_date: '2026-06-05T08:00:00.000Z',
    },
  ],
  Customer: [
    {
      id: 'customer_001',
      customer_type: 'corporate',
      code: 'CUS-001',
      company_name: 'Golden Market Foods',
      first_name: 'Ama',
      last_name: 'Mensah',
      email: 'orders@goldenmarket.example',
      phone: '+233 20 000 1000',
      country: 'Ghana',
      region: 'Greater Accra',
      city: 'Accra',
      status: 'active',
      created_date: '2026-07-01T10:00:00.000Z',
    },
  ],
  Order: [
    {
      id: 'order_001',
      order_number: 'ORD-1001',
      customer_name: 'Golden Market Foods',
      order_date: '2026-07-05T09:30:00.000Z',
      status: 'confirmed',
      total_amount: 4250000,
      created_date: '2026-07-05T09:30:00.000Z',
    },
    {
      id: 'order_002',
      order_number: 'ORD-1002',
      customer_name: 'Fresh Export Partners',
      order_date: '2026-07-06T11:00:00.000Z',
      status: 'dispatched',
      total_amount: 6800000,
      created_date: '2026-07-06T11:00:00.000Z',
    },
  ],
  Invoice: [
    {
      id: 'invoice_001',
      invoice_number: 'INV-2001',
      customer_name: 'Golden Market Foods',
      invoice_date: '2026-07-05T12:00:00.000Z',
      due_date: '2026-07-20',
      status: 'unpaid',
      total_amount: 4250000,
      balance_due: 4250000,
      created_date: '2026-07-05T12:00:00.000Z',
    },
  ],
  Payment: [
    {
      id: 'payment_001',
      payment_number: 'PAY-3001',
      customer_name: 'Fresh Export Partners',
      payment_date: '2026-07-06T15:00:00.000Z',
      amount: 2000000,
      method: 'bank_transfer',
      status: 'completed',
      created_date: '2026-07-06T15:00:00.000Z',
    },
  ],
  StockItem: [
    {
      id: 'stock_001',
      sku: 'MNG-KENT-001',
      product_name: 'Premium Kent Mango',
      warehouse_name: 'Main Packhouse',
      bin_location: 'A-03',
      quantity_on_hand: 850,
      reorder_level: 1000,
      unit_of_measure: 'kg',
      created_date: '2026-07-06T08:00:00.000Z',
    },
    {
      id: 'stock_002',
      sku: 'MNG-DRIED-002',
      product_name: 'Dried Mango Slices',
      warehouse_name: 'Finished Goods',
      bin_location: 'F-11',
      quantity_on_hand: 2400,
      reorder_level: 500,
      unit_of_measure: 'pack',
      created_date: '2026-07-06T08:10:00.000Z',
    },
  ],
  Harvest: [
    {
      id: 'harvest_001',
      harvest_code: 'HAR-4001',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      harvest_date: '2026-07-06T06:00:00.000Z',
      harvest_season: 'main',
      status: 'in_progress',
      quality_grade: 'Premium',
      total_quantity: 3200,
      created_date: '2026-07-06T06:00:00.000Z',
    },
  ],
  FarmProcessLog: [
    {
      id: 'farmprocesslog_001',
      log_code: 'FPL-1001',
      phase: 'land_clearing',
      farm_name: 'Eastern Ridge Orchard',
      block_name: 'North Kent Block',
      activity_title: 'Cleared boundary weeds and marked planting rows',
      performed_by_name: 'Kofi Boateng',
      role_or_team: 'Field preparation team',
      activity_date: '2026-07-01',
      start_time: '07:00',
      end_time: '12:30',
      quantity: 4.5,
      unit_of_measure: 'acres',
      status: 'completed',
      notes: 'Rows marked for nursery transplanting plan.',
      created_by_name: 'Farm Manager',
      recorded_at: '2026-07-01T13:00:00.000Z',
      created_date: '2026-07-01T13:00:00.000Z',
    },
    {
      id: 'farmprocesslog_002',
      log_code: 'FPL-1002',
      phase: 'seedling',
      farm_name: 'Eastern Ridge Orchard',
      block_name: 'Nursery A',
      activity_title: 'Checked seedling vigor and watered nursery beds',
      performed_by_name: 'Akosua Danquah',
      role_or_team: 'Nursery team',
      activity_date: '2026-07-03',
      start_time: '06:30',
      end_time: '09:00',
      quantity: 620,
      unit_of_measure: 'seedlings',
      status: 'completed',
      notes: 'Thirty weak seedlings separated for observation.',
      created_by_name: 'Nursery Supervisor',
      recorded_at: '2026-07-03T09:20:00.000Z',
      created_date: '2026-07-03T09:20:00.000Z',
    },
    {
      id: 'farmprocesslog_003',
      log_code: 'FPL-1003',
      phase: 'crop_management',
      farm_name: 'Volta Valley Farm',
      block_name: 'Julie Valley Block',
      activity_title: 'Fruit fly trap count and canopy inspection',
      performed_by_name: 'Abena Owusu',
      role_or_team: 'Crop protection',
      activity_date: '2026-07-07',
      start_time: '08:00',
      end_time: '10:15',
      quantity: 28,
      unit_of_measure: 'acres',
      status: 'in_progress',
      notes: 'Follow-up bait station checks required after rainfall.',
      created_by_name: 'Farm Manager',
      recorded_at: '2026-07-07T10:30:00.000Z',
      created_date: '2026-07-07T10:30:00.000Z',
    },
    {
      id: 'farmprocesslog_004',
      log_code: 'FPL-1004',
      phase: 'harvest',
      farm_name: 'Eastern Ridge Orchard',
      block_name: 'North Kent Block',
      activity_title: 'Picked and weighed premium Kent mango batch',
      performed_by_name: 'Harvest Prep Crew',
      role_or_team: 'Harvest team',
      activity_date: '2026-07-06',
      start_time: '06:00',
      end_time: '11:45',
      quantity: 3200,
      unit_of_measure: 'kg',
      status: 'in_progress',
      notes: 'Batch moved to Main Packhouse for grading.',
      created_by_name: 'Packhouse Lead',
      recorded_at: '2026-07-06T12:10:00.000Z',
      created_date: '2026-07-06T12:10:00.000Z',
    },
    {
      id: 'farmprocesslog_005',
      log_code: 'FPL-1005',
      phase: 'post_harvest',
      farm_name: 'Eastern Ridge Orchard',
      block_name: 'Main Packhouse',
      activity_title: 'Sorted, washed, and staged export crates',
      performed_by_name: 'Packhouse Team A',
      role_or_team: 'Post-harvest team',
      activity_date: '2026-07-06',
      start_time: '12:30',
      end_time: '16:00',
      quantity: 2900,
      unit_of_measure: 'kg',
      status: 'completed',
      notes: 'Rejects and losses separated for reporting.',
      created_by_name: 'Quality Supervisor',
      recorded_at: '2026-07-06T16:20:00.000Z',
      created_date: '2026-07-06T16:20:00.000Z',
    },
  ],
  FarmTask: [
    {
      id: 'farmtask_001',
      task_code: 'FT-1001',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_id: 'block_001',
      block_name: 'North Kent Block',
      title: 'Irrigate North Kent Block',
      category: 'irrigation',
      priority: 'high',
      assigned_to_name: 'Kofi Boateng',
      due_date: '2026-07-08',
      recurrence_rule: 'Every 3 days during dry spell',
      weather_trigger: 'Soil moisture below 28%',
      status: 'open',
      progress_percent: 45,
      notes: 'Check pump pressure before starting.',
      created_date: '2026-07-07T08:00:00.000Z',
    },
    {
      id: 'farmtask_002',
      task_code: 'FT-1002',
      farm_id: 'farm_002',
      farm_name: 'Volta Valley Farm',
      block_id: 'block_003',
      block_name: 'Julie Valley Block',
      title: 'Scout for fruit fly activity',
      category: 'pest_control',
      priority: 'medium',
      assigned_to_name: 'Abena Owusu',
      due_date: '2026-07-09',
      status: 'open',
      progress_percent: 20,
      notes: 'Record trap count and upload notes.',
      created_date: '2026-07-07T09:00:00.000Z',
    },
  ],
  CropPlan: [
    {
      id: 'cropplan_001',
      plan_code: 'CP-2026-MAIN',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_id: 'block_001',
      block_name: 'North Kent Block',
      crop_variety: 'Kent',
      season: '2026 Main',
      planting_date: '2026-03-01',
      expected_harvest_start: '2026-07-15',
      expected_harvest_end: '2026-08-20',
      target_yield_kg: 28000,
      budget_amount: 185000,
      status: 'active',
      notes: 'Premium export target with strict spray interval records.',
      created_date: '2026-06-10T08:00:00.000Z',
    },
  ],
  FarmResourceUse: [
    {
      id: 'resourceuse_001',
      usage_code: 'RU-1001',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_id: 'block_001',
      block_name: 'North Kent Block',
      resource_type: 'fertilizer',
      item_name: 'Organic compost blend',
      quantity: 850,
      unit_of_measure: 'kg',
      unit_cost: 8.5,
      usage_date: '2026-07-06',
      notes: 'Applied after light rainfall.',
      created_date: '2026-07-06T13:00:00.000Z',
    },
    {
      id: 'resourceuse_002',
      usage_code: 'RU-1002',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_id: 'block_002',
      block_name: 'Keitt Trial Block',
      resource_type: 'water',
      item_name: 'Drip irrigation',
      quantity: 12000,
      unit_of_measure: 'liters',
      unit_cost: 0.03,
      usage_date: '2026-07-07',
      notes: 'Two-hour irrigation cycle.',
      created_date: '2026-07-07T10:00:00.000Z',
    },
  ],
  PesticideApplication: [
    {
      id: 'pesticide_001',
      application_code: 'PA-1001',
      farm_id: 'farm_002',
      farm_name: 'Volta Valley Farm',
      block_id: 'block_003',
      block_name: 'Julie Valley Block',
      crop: 'Julie mango',
      product_name: 'Fruit fly bait station',
      active_ingredient: 'Protein bait',
      application_date: '2026-07-05',
      application_rate: '1 station per 20 trees',
      quantity_used: 48,
      target_pest: 'Fruit fly',
      treated_area_acres: 28,
      pre_harvest_interval_days: 7,
      reentry_interval_hours: 4,
      applicator_name: 'Field Team A',
      weather_conditions: 'Dry, light wind',
      compliance_status: 'recorded',
      notes: 'No residue-risk spray used.',
      created_date: '2026-07-05T11:00:00.000Z',
    },
  ],
  LaborSchedule: [
    {
      id: 'labor_001',
      schedule_code: 'LS-1001',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_id: 'block_001',
      block_name: 'North Kent Block',
      work_date: '2026-07-08',
      shift_start: '07:00',
      shift_end: '15:00',
      team_name: 'Harvest Prep Crew',
      worker_count: 14,
      supervisor_name: 'Kofi Boateng',
      task_summary: 'Canopy sanitation and crate staging',
      hours_planned: 112,
      hours_completed: 0,
      status: 'scheduled',
      created_date: '2026-07-07T12:00:00.000Z',
    },
  ],
  Worker: [
    {
      id: 'worker_001',
      worker_code: 'WRK-001',
      worker_name: 'Kwame Mensah',
      role: 'Picker',
      team: 'Harvest Team A',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      daily_rate: 85,
      piece_rate: 1.2,
      status: 'active',
      created_date: '2026-06-18T08:00:00.000Z',
    },
    {
      id: 'worker_002',
      worker_code: 'WRK-002',
      worker_name: 'Akosua Danquah',
      role: 'Sorter',
      team: 'Packhouse Team A',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      daily_rate: 90,
      piece_rate: 1,
      status: 'active',
      created_date: '2026-06-18T08:05:00.000Z',
    },
  ],
  DailyActivity: [
    {
      id: 'dailyactivity_001',
      activity_code: 'DA-1001',
      activity_date: '2026-07-08',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_id: 'block_001',
      block_name: 'North Kent Block',
      category: 'Harvesting',
      title: 'Morning Kent harvest and field grading',
      description: 'Pick mature Kent mangoes, weigh crates, and stage batch for QC.',
      priority: 'high',
      supervisor_name: 'Kofi Boateng',
      team_name: 'Harvest Team A',
      assigned_workers: 'Kwame Mensah, Akosua Danquah, 12 seasonal workers',
      start_time: '06:00',
      end_time: '11:30',
      total_hours: 5.5,
      equipment_used: 'Crates, scale, pickup truck',
      equipment_operator: 'Yaw Asare',
      equipment_condition: 'Good',
      fuel_used: 18,
      fertilizer_used: 0,
      chemical_used: 0,
      quantity_used: 0,
      unit: 'kg',
      harvest_quantity: 3250,
      grade_a_quantity: 2120,
      grade_b_quantity: 820,
      rejected_quantity: 310,
      crates_used: 162,
      destination: 'Main Packhouse',
      labour_cost: 1680,
      equipment_cost: 420,
      fuel_cost: 540,
      input_cost: 0,
      transport_cost: 350,
      cost: 2990,
      gps_coordinates: '5.8844,-0.0815',
      weather_condition: 'Dry, light wind',
      safety_incident: 'None',
      notes: 'Rejected fruit separated for waste review.',
      status: 'Completed',
      approved_by: 'Farm Manager',
      created_by: 'Supervisor',
      updated_by: 'Supervisor',
      created_date: '2026-07-08T11:45:00.000Z',
    },
  ],
  WorkOrder: [
    {
      id: 'workorder_001',
      work_order_code: 'WO-1001',
      title: 'Harvest North Kent Block',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_id: 'block_001',
      block_name: 'North Kent Block',
      category: 'Harvesting',
      priority: 'high',
      supervisor_name: 'Kofi Boateng',
      assigned_team: 'Harvest Team A',
      workers: '14',
      scheduled_date: '2026-07-08',
      start_time: '06:00',
      end_time: '12:00',
      equipment_required: 'Crates, scale, pickup truck',
      inputs_required: 'PPE, harvest crates',
      estimated_cost: 3100,
      actual_cost: 2990,
      status: 'Completed',
      completion_notes: 'Converted to daily activity DA-1001.',
      approved_by: 'Farm Manager',
      created_date: '2026-07-07T14:00:00.000Z',
    },
  ],
  ActivityWorker: [
    {
      id: 'activityworker_001',
      activity_code: 'DA-1001',
      worker_name: 'Kwame Mensah',
      team: 'Harvest Team A',
      output_kg: 280,
      output_crates: 14,
      hours_worked: 5.5,
      created_date: '2026-07-08T11:45:00.000Z',
    },
  ],
  ActivityEquipment: [
    {
      id: 'activityequipment_001',
      activity_code: 'DA-1001',
      equipment_name: 'Pickup Truck',
      operator: 'Yaw Asare',
      condition: 'Good',
      fuel_consumed: 18,
      created_date: '2026-07-08T11:45:00.000Z',
    },
  ],
  ActivityInput: [
    {
      id: 'activityinput_001',
      activity_code: 'DA-1001',
      input_name: 'Harvest crates',
      quantity_used: 162,
      unit: 'crates',
      created_date: '2026-07-08T11:45:00.000Z',
    },
  ],
  FarmAttendance: [
    {
      id: 'farmattendance_001',
      attendance_code: 'ATT-1001',
      worker_id: 'worker_001',
      worker_name: 'Kwame Mensah',
      role: 'Picker',
      team: 'Harvest Team A',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_id: 'block_001',
      block_name: 'North Kent Block',
      attendance_date: '2026-07-08',
      clock_in: '05:45',
      clock_out: '12:00',
      hours_worked: 6.25,
      overtime_hours: 0,
      activity: 'Harvesting',
      output_kg: 280,
      output_crates: 14,
      daily_rate: 85,
      piece_rate: 1.2,
      bonus: 25,
      deduction: 0,
      total_pay: 421,
      payment_status: 'Pending',
      created_date: '2026-07-08T12:10:00.000Z',
    },
  ],
  Equipment: [
    {
      id: 'equipment_001',
      equipment_code: 'EQ-001',
      equipment_name: 'Pickup Truck GT-4455-26',
      category: 'Pickup Truck',
      serial_number: 'GT-4455-26',
      farm_assigned: 'Eastern Ridge Orchard',
      current_location: 'Main Packhouse',
      condition: 'Good',
      status: 'In Use',
      assigned_operator: 'Yaw Asare',
      purchase_date: '2025-04-12',
      maintenance_schedule: 'Monthly',
      last_maintenance_date: '2026-06-20',
      next_maintenance_date: '2026-07-20',
      usage_hours: 138,
      fuel_type: 'Diesel',
      fuel_consumption: 18,
      notes: 'Used for harvest transfer.',
      created_date: '2026-06-01T08:00:00.000Z',
    },
    {
      id: 'equipment_002',
      equipment_code: 'EQ-002',
      equipment_name: 'Motorized Sprayer A',
      category: 'Sprayer',
      serial_number: 'SPR-A-112',
      farm_assigned: 'Volta Valley Farm',
      current_location: 'Input Store',
      condition: 'Needs Service',
      status: 'Needs Repair',
      assigned_operator: 'Field Team A',
      purchase_date: '2025-08-10',
      maintenance_schedule: 'Bi-weekly',
      last_maintenance_date: '2026-06-28',
      next_maintenance_date: '2026-07-12',
      usage_hours: 74,
      fuel_type: 'Petrol',
      fuel_consumption: 4,
      notes: 'Nozzle pressure low.',
      created_date: '2026-06-01T08:10:00.000Z',
    },
  ],
  EquipmentUsage: [
    {
      id: 'equipmentusage_001',
      usage_code: 'EU-1001',
      usage_date: '2026-07-08',
      equipment_id: 'equipment_001',
      equipment_name: 'Pickup Truck GT-4455-26',
      activity: 'Harvesting',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_id: 'block_001',
      block_name: 'North Kent Block',
      operator: 'Yaw Asare',
      start_time: '06:00',
      end_time: '11:30',
      hours_used: 5.5,
      fuel_issued: 20,
      fuel_consumed: 18,
      opening_condition: 'Good',
      closing_condition: 'Good',
      damage_reported: 'None',
      returned: 'Yes',
      returned_time: '11:45',
      supervisor_approval: 'Approved',
      created_date: '2026-07-08T11:50:00.000Z',
    },
  ],
  FarmInput: [
    {
      id: 'farminput_001',
      input_code: 'IN-001',
      input_name: 'Fruit fly bait station',
      type: 'Chemical',
      category: 'Pest Control',
      supplier: 'AgriPack Supplies',
      batch_number: 'FFB-0726',
      expiry_date: '2027-02-28',
      stock_quantity: 72,
      unit: 'station',
      storage_location: 'Volta Input Store',
      safety_notes: 'Use gloves and record placement map.',
      reorder_level: 80,
      status: 'Low Stock',
      created_date: '2026-06-25T08:00:00.000Z',
    },
    {
      id: 'farminput_002',
      input_code: 'IN-002',
      input_name: 'Organic compost blend',
      type: 'Fertilizer',
      category: 'Soil Nutrition',
      supplier: 'GreenGrow Ghana',
      batch_number: 'OCB-0626',
      expiry_date: '2027-06-30',
      stock_quantity: 2600,
      unit: 'kg',
      storage_location: 'Eastern Ridge Store',
      safety_notes: 'Store dry.',
      reorder_level: 1000,
      status: 'Available',
      created_date: '2026-06-25T08:10:00.000Z',
    },
  ],
  InputUsage: [
    {
      id: 'inputusage_001',
      application_code: 'IA-1001',
      application_date: '2026-07-05',
      farm_id: 'farm_002',
      farm_name: 'Volta Valley Farm',
      block_id: 'block_003',
      block_name: 'Julie Valley Block',
      activity: 'Pest Inspection',
      input_name: 'Fruit fly bait station',
      input_type: 'Chemical',
      quantity_issued: 50,
      quantity_used: 48,
      remaining_quantity: 2,
      unit: 'station',
      applied_by: 'Field Team A',
      supervisor: 'Abena Owusu',
      weather_condition: 'Dry, light wind',
      wind_speed: 8,
      purpose: 'Fruit fly suppression',
      target_pest_disease: 'Fruit fly',
      application_method: 'Bait station placement',
      next_application_date: '2026-07-12',
      notes: 'Record maintained for export compliance.',
      status: 'Recorded',
      created_date: '2026-07-05T11:00:00.000Z',
    },
  ],
  InventoryUsage: [
    {
      id: 'inventoryusage_001',
      usage_code: 'IU-1001',
      usage_date: '2026-07-08',
      item: 'Diesel fuel',
      item_category: 'Fuel',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_id: 'block_001',
      block_name: 'North Kent Block',
      activity: 'Harvesting',
      quantity_issued: 20,
      quantity_used: 18,
      quantity_returned: 2,
      wastage: 0,
      unit_cost: 30,
      total_cost: 540,
      issued_by: 'Inventory Officer',
      received_by: 'Yaw Asare',
      approved_by: 'Kofi Boateng',
      notes: 'Pickup truck harvest transfer.',
      created_date: '2026-07-08T11:50:00.000Z',
    },
  ],
  HarvestBatch: [
    {
      id: 'harvestbatch_001',
      harvest_code: 'HB-1001',
      harvest_date: '2026-07-08',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_id: 'block_001',
      block_name: 'North Kent Block',
      team: 'Harvest Team A',
      supervisor: 'Kofi Boateng',
      picker_worker: 'Kwame Mensah',
      mango_variety: 'Kent',
      quantity_harvested_kg: 3250,
      grade_a_kg: 2120,
      grade_b_kg: 820,
      rejected_kg: 310,
      crates_used: 162,
      average_crate_weight: 20,
      destination: 'Warehouse',
      warehouse: 'Main Packhouse',
      truck: 'GT-4455-26',
      driver: 'Yaw Asare',
      batch_number: 'BATCH-ER-20260708-01',
      qr_code: 'QR-BATCH-ER-20260708-01',
      notes: 'Batch awaiting final QC release.',
      status: 'QC Pending',
      created_date: '2026-07-08T12:00:00.000Z',
    },
  ],
  HarvestGrade: [
    {
      id: 'harvestgrade_001',
      batch_number: 'BATCH-ER-20260708-01',
      grade: 'Grade A',
      quantity_kg: 2120,
      destination: 'Export/Warehouse',
      created_date: '2026-07-08T12:00:00.000Z',
    },
  ],
  QualityCheck: [
    {
      id: 'qualitycheck_001',
      qc_code: 'QC-1001',
      inspection_date: '2026-07-08',
      batch_number: 'BATCH-ER-20260708-01',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_id: 'block_001',
      block_name: 'North Kent Block',
      inspector: 'Quality Supervisor',
      stage: 'Harvest inspection',
      total_quantity: 3250,
      sample_size: 120,
      grade_a_kg: 2120,
      grade_b_kg: 820,
      rejected_kg: 310,
      defect_type: 'Bruising and fruit fly marks',
      defect_percentage: 9.5,
      fruit_size: 'Large',
      fruit_color: 'Green-orange blush',
      ripeness_level: 'Mature green',
      disease_signs: 'Low',
      bruising: 'Moderate rejects',
      export_approved: 'Pending',
      notes: 'Recheck Grade A pallets before export release.',
      status: 'Pending',
      created_date: '2026-07-08T13:00:00.000Z',
    },
  ],
  WasteLoss: [
    {
      id: 'wasteloss_001',
      loss_code: 'WL-1001',
      loss_date: '2026-07-08',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_id: 'block_001',
      block_name: 'North Kent Block',
      batch_number: 'BATCH-ER-20260708-01',
      loss_type: 'Rejected Fruit',
      quantity: 310,
      unit: 'kg',
      estimated_value: 2635,
      reason: 'Bruising and visible pest damage',
      reported_by: 'Quality Supervisor',
      approved_by: 'Farm Manager',
      action_taken: 'Moved to waste/losses review for compost or disposal.',
      status: 'Recorded',
      created_date: '2026-07-08T13:10:00.000Z',
    },
  ],
  WeatherLog: [
    {
      id: 'weatherlog_001',
      weather_code: 'WL-20260708',
      weather_date: '2026-07-08',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      temperature: 29,
      humidity: 74,
      rainfall: 0,
      wind_speed: 9,
      cloud_cover: 'Partly cloudy',
      soil_moisture: 31,
      weather_condition: 'Dry, light wind',
      forecast: 'Chance of afternoon clouds, low rainfall risk',
      recorded_by: 'Field Officer',
      source: 'Manual farm log',
      notes: 'Suitable for harvesting and dry transport.',
      created_date: '2026-07-08T06:00:00.000Z',
    },
  ],
  FarmExpense: [
    {
      id: 'farmexpense_001',
      expense_code: 'FEXP-1001',
      expense_date: '2026-07-08',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      activity: 'Harvesting',
      category: 'Labour',
      description: 'Harvest Team A daily wages',
      amount: 1680,
      vendor: 'Farm payroll',
      payment_method: 'Mobile Money',
      approved_by: 'Farm Manager',
      status: 'Approved',
      created_date: '2026-07-08T14:00:00.000Z',
    },
  ],
  DailyReport: [
    {
      id: 'dailyreport_001',
      report_code: 'DR-20260708-ER',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      report_date: '2026-07-08',
      supervisor: 'Kofi Boateng',
      workers_present: 14,
      workers_absent: 1,
      activities_completed: 1,
      activities_pending: 1,
      harvest_quantity: 3250,
      grade_a: 2120,
      grade_b: 820,
      rejected: 310,
      equipment_used: 'Pickup Truck, crates, scale',
      fuel_used: 18,
      fertilizers_used: 0,
      chemicals_used: 0,
      weather: 'Dry, light wind',
      incidents: 'None',
      losses: 310,
      expenses: 2990,
      tomorrow_plan: 'QC release, warehouse transfer, and next block harvest.',
      supervisor_signature: 'Kofi Boateng',
      manager_approval: 'Pending',
      status: 'Submitted',
      created_date: '2026-07-08T16:00:00.000Z',
    },
  ],
  Approval: [
    {
      id: 'approval_001',
      approval_code: 'APR-1001',
      module: 'Daily Activity',
      record_code: 'DA-1001',
      requested_by: 'Supervisor',
      approver: 'Farm Manager',
      status: 'Approved',
      created_date: '2026-07-08T12:00:00.000Z',
    },
  ],
  AuditLog: [],
  FarmFinanceRecord: [
    {
      id: 'farmfinance_001',
      record_code: 'FF-1001',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_id: 'block_001',
      block_name: 'North Kent Block',
      record_date: '2026-07-06',
      record_type: 'expense',
      category: 'Fertilizer',
      description: 'Organic compost application',
      amount: 7225,
      currency: 'GHS',
      status: 'recorded',
      created_date: '2026-07-06T14:00:00.000Z',
    },
  ],
  FarmComplianceRecord: [
    {
      id: 'compliance_001',
      record_code: 'FC-1001',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      compliance_area: 'Global GAP',
      requirement: 'Pesticide application register updated within 24 hours',
      status: 'complete',
      due_date: '2026-07-07',
      completed_date: '2026-07-06',
      evidence_reference: 'PA-1001',
      notes: 'Records reviewed by QA.',
      created_date: '2026-07-06T16:00:00.000Z',
    },
  ],
  FarmNote: [
    {
      id: 'farmnote_001',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      block_id: 'block_002',
      block_name: 'Keitt Trial Block',
      note_date: '2026-07-07',
      category: 'soil_health',
      title: 'Moisture holding improving after compost',
      body: 'Soil remains workable and root-zone moisture is stable after the latest compost application.',
      soil_condition: 'Moist loam',
      crop_condition: 'Good canopy color',
      pest_pressure: 'Low',
      created_date: '2026-07-07T09:30:00.000Z',
    },
  ],
  FarmProject: [
    {
      id: 'farmproject_001',
      project_code: 'FP-1001',
      farm_id: 'farm_001',
      farm_name: 'Eastern Ridge Orchard',
      title: 'Packhouse water line upgrade',
      project_type: 'infrastructure',
      start_date: '2026-07-01',
      due_date: '2026-07-20',
      budget_amount: 48000,
      actual_cost: 18500,
      progress_percent: 45,
      status: 'active',
      owner_name: 'Operations Team',
      notes: 'Trenching complete; fittings pending procurement.',
      created_date: '2026-07-01T08:00:00.000Z',
    },
  ],
  Delivery: [
    {
      id: 'delivery_001',
      delivery_number: 'DEL-5001',
      customer_name: 'Golden Market Foods',
      vehicle_number: 'GT-4455-26',
      status: 'in_transit',
      delivery_date: '2026-07-07T08:00:00.000Z',
      created_date: '2026-07-07T08:00:00.000Z',
    },
  ],
  Employee: [
    {
      id: 'employee_001',
      employee_code: 'EMP-001',
      full_name: 'Kofi Boateng',
      department: 'Farm Operations',
      role: 'Farm Manager',
      status: 'active',
      created_date: '2026-06-15T08:00:00.000Z',
    },
    {
      id: 'employee_002',
      employee_code: 'EMP-002',
      full_name: 'Abena Owusu',
      department: 'Logistics',
      role: 'Dispatch Lead',
      status: 'active',
      created_date: '2026-06-16T08:00:00.000Z',
    },
  ],
  Warehouse: [
    { id: 'warehouse_001', name: 'Main Packhouse', location: 'Dodowa', status: 'active', created_date: '2026-06-01T08:00:00.000Z' },
  ],
  StockMovement: [
    {
      id: 'movement_001',
      product_name: 'Premium Kent Mango',
      movement_type: 'inbound',
      quantity: 3200,
      movement_date: '2026-07-06T10:00:00.000Z',
      created_date: '2026-07-06T10:00:00.000Z',
    },
  ],
  Vehicle: [
    { id: 'vehicle_001', vehicle_number: 'GT-4455-26', vehicle_type: 'Refrigerated Truck', status: 'active', created_date: '2026-06-01T08:00:00.000Z' },
  ],
  Supplier: [
    { id: 'supplier_001', name: 'AgriPack Supplies', phone: '+233 20 000 2000', status: 'active', created_date: '2026-06-20T08:00:00.000Z' },
  ],
  PurchaseOrder: [
    { id: 'po_001', po_number: 'PO-6001', supplier_name: 'AgriPack Supplies', order_date: '2026-07-03T09:00:00.000Z', status: 'sent', total_amount: 1250000, created_date: '2026-07-03T09:00:00.000Z' },
  ],
  Quotation: [
    { id: 'quote_001', quote_number: 'Q-7001', customer_name: 'Fresh Export Partners', quote_date: '2026-07-02T09:00:00.000Z', status: 'sent', total_amount: 6800000, created_date: '2026-07-02T09:00:00.000Z' },
  ],
  Return: [],
  Expense: [
    { id: 'expense_001', expense_number: 'EXP-8001', category: 'Fuel', expense_date: '2026-07-04T09:00:00.000Z', amount: 350000, status: 'approved', created_date: '2026-07-04T09:00:00.000Z' },
  ],
  ExportShipment: [
    { id: 'export_001', shipment_number: 'EXP-SH-9001', destination_country: 'United Arab Emirates', status: 'preparing', departure_date: '2026-07-15', created_date: '2026-07-05T09:00:00.000Z' },
  ],
  Certification: [
    { id: 'cert_001', name: 'Global GAP', status: 'valid', expiry_date: '2027-06-30', created_date: '2026-06-01T08:00:00.000Z' },
  ],
  Notification: [
    { id: 'note_001', title: 'Low stock alert', message: 'Premium Kent Mango is below reorder level.', type: 'inventory', created_date: '2026-07-07T09:00:00.000Z' },
  ],
  ContentPage: [
    { id: 'content_001', title: 'About Us', slug: 'about', status: 'published', updated_date: '2026-07-01T08:00:00.000Z', created_date: '2026-07-01T08:00:00.000Z' },
  ],
  Inquiry: [],
  CustomerContract: [
    { id: 'contract_001', contract_number: 'CON-1001', customer_name: 'Golden Market Foods', status: 'active', created_date: '2026-07-01T08:00:00.000Z' },
  ],
  Attendance: [
    { id: 'attendance_001', employee_name: 'Kofi Boateng', attendance_date: '2026-07-07', status: 'present', created_date: '2026-07-07T08:00:00.000Z' },
  ],
  JobApplication: [
    {
      id: 'application_001',
      application_number: 'APP-1001',
      candidate_name: 'Sample Candidate',
      role_applied_for: 'Quality Assurance Officer',
      email: 'candidate@example.com',
      phone: '+233 20 000 3000',
      resume_file_name: 'sample-resume.pdf',
      cover_letter_file_name: 'sample-cover-letter.pdf',
      certificate_file_name: 'GlobalGAP-certificate.pdf',
      ats_score: 95,
      ats_status: 'pass',
      ats_matched_keywords: ['quality assurance', 'food safety', 'audit', 'compliance'],
      status: 'new',
      source: 'Careers page',
      notes: 'Strong quality and compliance profile. Ready for HR review.',
      created_date: '2026-07-07T10:00:00.000Z',
    },
  ],
  User: [],
};

const ensureData = () => {
  const existing = readJson(DATA_KEY, null);
  if (existing) {
    const merged = { ...seedData, ...existing };
    let changed = false;
    Object.keys(seedData).forEach((entityName) => {
      if (!Array.isArray(existing[entityName])) {
        merged[entityName] = seedData[entityName];
        changed = true;
      }
    });
    if (changed) writeData(merged);
    return merged;
  }

  writeJson(DATA_KEY, seedData);
  return seedData;
};

const readData = () => ensureData();

const writeData = (data) => {
  writeJson(DATA_KEY, data);
};

const compareValue = (value) => {
  if (value === undefined || value === null) return '';
  const date = Date.parse(value);
  return Number.isNaN(date) ? value : date;
};

const sortItems = (items, sortBy) => {
  if (!sortBy) return items;

  const descending = sortBy.startsWith('-');
  const field = descending ? sortBy.slice(1) : sortBy;

  return [...items].sort((a, b) => {
    const aValue = compareValue(a[field]);
    const bValue = compareValue(b[field]);

    if (aValue < bValue) return descending ? 1 : -1;
    if (aValue > bValue) return descending ? -1 : 1;
    return 0;
  });
};

const matchesQuery = (item, query = {}) => (
  Object.entries(query).every(([key, value]) => {
    if (value === undefined) return true;
    if (Array.isArray(item[key])) return item[key].includes(value);
    return item[key] === value;
  })
);

const createEntityApi = (entityName) => ({
  async list(sortBy, limit) {
    const data = readData();
    const items = sortItems(data[entityName] || [], sortBy);
    return typeof limit === 'number' ? items.slice(0, limit) : items;
  },

  async filter(query = {}, sortBy, limit) {
    const data = readData();
    const items = sortItems((data[entityName] || []).filter((item) => matchesQuery(item, query)), sortBy);
    return typeof limit === 'number' ? items.slice(0, limit) : items;
  },

  async create(payload) {
    const data = readData();
    const record = {
      id: createId(entityName.toLowerCase()),
      created_date: nowIso(),
      updated_date: nowIso(),
      ...payload,
    };
    data[entityName] = [record, ...(data[entityName] || [])];
    writeData(data);
    return record;
  },

  async update(id, payload) {
    const data = readData();
    data[entityName] = (data[entityName] || []).map((item) => (
      item.id === id ? { ...item, ...payload, updated_date: nowIso() } : item
    ));
    writeData(data);
    return data[entityName].find((item) => item.id === id) || null;
  },

  async delete(id) {
    const data = readData();
    data[entityName] = (data[entityName] || []).filter((item) => item.id !== id);
    writeData(data);
    return { success: true };
  },
});

const getUsers = () => readJson(USERS_KEY, []);
const setUsers = (users) => writeJson(USERS_KEY, users);
const getSession = () => readJson(SESSION_KEY, null);
const setSession = (session) => writeJson(SESSION_KEY, session);
const clearSession = () => localStorage.removeItem(SESSION_KEY);

const publicUser = (user) => {
  if (!user) return null;
  const { password, password_hash, password_salt, reset_token, ...safeUser } = user;
  return safeUser;
};

const requireUser = () => {
  const session = getSession();
  if (!session?.userId) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }

  const user = getUsers().find((item) => item.id === session.userId);
  if (!user) {
    clearSession();
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }

  return publicUser(user);
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const auth = {
  async me() {
    return requireUser();
  },

  async register({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const users = getUsers();

    if (!normalizedEmail || !password) {
      throw new Error('Email and password are required');
    }

    if (users.some((user) => user.email === normalizedEmail)) {
      throw new Error('An account with this email already exists');
    }

    const password_salt = createSalt();
    const password_hash = await hashPassword(password, password_salt);
    const user = {
      id: createId('user'),
      email: normalizedEmail,
      password_hash,
      password_salt,
      full_name: normalizedEmail.split('@')[0],
      role: users.length === 0 ? 'admin' : 'user',
      created_date: nowIso(),
    };
    const nextUsers = [...users, user];
    setUsers(nextUsers);
    setSession({ userId: user.id, access_token: createId('local_token') });

    return {
      access_token: getSession().access_token,
      user: publicUser(user),
    };
  },

  async loginViaEmailPassword(email, password) {
    const normalizedEmail = normalizeEmail(email);
    const users = getUsers();
    const user = users.find((item) => item.email === normalizedEmail);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    let validPassword = false;
    if (user.password_hash && user.password_salt) {
      validPassword = user.password_hash === await hashPassword(password, user.password_salt);
    } else if (user.password === password) {
      const password_salt = createSalt();
      user.password_hash = await hashPassword(password, password_salt);
      user.password_salt = password_salt;
      delete user.password;
      setUsers(users);
      validPassword = true;
    }

    if (!validPassword) {
      throw new Error('Invalid email or password');
    }

    setSession({ userId: user.id, access_token: createId('local_token') });
    return publicUser(user);
  },

  async verifyOtp() {
    const user = requireUser();
    return {
      access_token: getSession()?.access_token || createId('local_token'),
      user,
    };
  },

  setToken(token) {
    const session = getSession();
    if (session) setSession({ ...session, access_token: token });
  },

  async resendOtp() {
    return { success: true };
  },

  async resetPasswordRequest(email) {
    const normalizedEmail = normalizeEmail(email);
    const users = getUsers();
    const user = users.find((item) => item.email === normalizedEmail);
    if (user) {
      user.reset_token = 'local-reset-token';
      setUsers(users);
    }
    return { success: true };
  },

  async resetPassword({ resetToken, newPassword }) {
    if (resetToken !== 'local-reset-token') {
      throw new Error('Invalid reset token');
    }

    const users = getUsers();
    const index = users.findIndex((user) => user.reset_token === resetToken);
    if (index === -1) throw new Error('Invalid reset token');

    const password_salt = createSalt();
    users[index] = {
      ...users[index],
      password_hash: await hashPassword(newPassword, password_salt),
      password_salt,
      password: undefined,
      reset_token: undefined,
    };
    setUsers(users);
    return { success: true };
  },

  logout(redirectTo) {
    clearSession();
    if (redirectTo) window.location.href = '/';
  },

  redirectToLogin(fromUrl = window.location.href) {
    window.location.href = `/login?from_url=${encodeURIComponent(fromUrl)}`;
  },
};

const entityNames = Object.keys(seedData);
const entities = Object.fromEntries(entityNames.map((name) => [name, createEntityApi(name)]));

export const base44 = {
  auth,
  entities,
};
