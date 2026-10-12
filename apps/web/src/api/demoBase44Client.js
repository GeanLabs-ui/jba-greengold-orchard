import { PRODUCT_BY_ID } from '../data/productCatalog';
import { publishDataChange } from '../lib/data-sync';

const STORAGE_PREFIX = 'jba_greengold_preview';
const USERS_KEY = `${STORAGE_PREFIX}:users`;
const SESSION_KEY = `${STORAGE_PREFIX}:session`;
const DATA_KEY = `${STORAGE_PREFIX}:data`;

export const DEMO_CREDENTIALS = Object.freeze({
  email: 'admin@jbagreengoldorchard.com',
  password: 'OrchardPreview#2026',
});

const DEMO_ADMIN = Object.freeze({
  id: 'demo_admin',
  email: DEMO_CREDENTIALS.email,
  full_name: 'Demo Administrator',
  role: 'super_admin',
  status: 'active',
});

const demoDate = (offset = 0, hour = 8, minute = 0) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
};
const demoDateKey = (offset = 0) => demoDate(offset).toISOString().slice(0, 10);
const demoDateTime = (offset = 0, hour = 8, minute = 0) => demoDate(offset, hour, minute).toISOString();

const DEMO_DEPARTMENTS = [
  { id: 'department_farm', name: 'Farm Operations', code: 'FARM', status: 'active' },
  { id: 'department_logistics', name: 'Logistics', code: 'LOG', status: 'active' },
  { id: 'department_sales', name: 'Sales & Marketing', code: 'SALES', status: 'active' },
  { id: 'department_admin', name: 'Admin & Finance', code: 'ADMIN', status: 'active' },
];

const DEMO_EMPLOYEES = [
  { id: 'employee_001', employee_code: 'EMP-001', first_name: 'Kofi', last_name: 'Boateng', full_name: 'Kofi Boateng', department_id: 'department_farm', department: 'Farm Operations', department_name: 'Farm Operations', role: 'Farm Manager', workspace_role: 'farm_manager', status: 'active', created_date: '2026-06-15T08:00:00.000Z' },
  { id: 'employee_002', employee_code: 'EMP-002', first_name: 'Abena', last_name: 'Owusu', full_name: 'Abena Owusu', department_id: 'department_logistics', department: 'Logistics', department_name: 'Logistics', role: 'Dispatch Lead', workspace_role: 'logistics_officer', status: 'active', created_date: '2026-06-16T08:00:00.000Z' },
  { id: 'employee_003', employee_code: 'EMP-003', first_name: 'Esther', last_name: 'Mensah', full_name: 'Esther Mensah', department_id: 'department_sales', department: 'Sales & Marketing', department_name: 'Sales & Marketing', role: 'Sales Officer', workspace_role: 'sales_officer', status: 'active', created_date: '2026-06-17T08:00:00.000Z' },
  { id: 'employee_004', employee_code: 'EMP-004', first_name: 'Yaw', last_name: 'Boateng', full_name: 'Yaw Boateng', department_id: 'department_admin', department: 'Admin & Finance', department_name: 'Admin & Finance', role: 'Finance Officer', workspace_role: 'finance_officer', status: 'active', created_date: '2026-06-18T08:00:00.000Z' },
];

const DEMO_ATTENDANCE = Array.from({ length: 7 }, (_, dayIndex) => {
  const offset = dayIndex - 6;
  const statuses = [
    ['present', 'present', 'late', 'present'],
    ['present', 'present', 'present', 'absent'],
    ['present', 'late', 'present', 'present'],
    ['present', 'present', 'leave', 'present'],
    ['late', 'present', 'present', 'present'],
    ['present', 'present', 'present', 'absent'],
    ['present', 'present', 'late', 'present'],
  ][dayIndex];
  return DEMO_EMPLOYEES.map((employee, employeeIndex) => {
    const status = statuses[employeeIndex];
    const attended = !['absent', 'leave'].includes(status);
    return {
      id: `attendance_${dayIndex}_${employeeIndex}`,
      employee_id: employee.id,
      employee_name: employee.full_name,
      department_id: employee.department_id,
      department_name: employee.department_name,
      attendance_date: demoDateKey(offset),
      check_in_at: attended ? demoDateTime(offset, status === 'late' ? 9 : 8, 2 + employeeIndex * 5) : '',
      check_out_at: attended ? demoDateTime(offset, 17, employeeIndex * 4) : '',
      status,
      created_date: demoDateTime(offset, 17, 30),
    };
  });
}).flat().concat([
  { id: 'leave_upcoming_001', employee_id: 'employee_002', employee_name: 'Abena Owusu', department_id: 'department_logistics', department_name: 'Logistics', attendance_date: demoDateKey(5), status: 'leave', notes: 'Annual Leave', created_date: demoDateTime(0) },
  { id: 'leave_upcoming_002', employee_id: 'employee_002', employee_name: 'Abena Owusu', department_id: 'department_logistics', department_name: 'Logistics', attendance_date: demoDateKey(6), status: 'leave', notes: 'Annual Leave', created_date: demoDateTime(0) },
  { id: 'leave_upcoming_003', employee_id: 'employee_003', employee_name: 'Esther Mensah', department_id: 'department_sales', department_name: 'Sales & Marketing', attendance_date: demoDateKey(8), status: 'leave', notes: 'Personal Leave', created_date: demoDateTime(0) },
]);

const seedData = {
  Customer: [
    { id: 'customer_001', company_name: 'Golden Market Foods', email: 'orders@goldenmarket.example', phone: '+233 20 000 1000', status: 'active', created_date: '2026-07-18T10:00:00.000Z' },
    { id: 'customer_002', company_name: 'Fresh Export Partners', email: 'procurement@freshexport.example', phone: '+233 24 000 2000', status: 'active', created_date: '2026-07-20T10:00:00.000Z' },
  ],
  Order: [
    { id: 'order_001', order_number: 'ORD-1001', customer_name: 'Golden Market Foods', order_date: '2026-07-27T09:30:00.000Z', status: 'confirmed', total_amount: 4250000, created_date: '2026-07-27T09:30:00.000Z' },
    { id: 'order_002', order_number: 'ORD-1002', customer_name: 'Fresh Export Partners', order_date: '2026-07-28T11:00:00.000Z', status: 'dispatched', total_amount: 6800000, created_date: '2026-07-28T11:00:00.000Z' },
  ],
  Invoice: [
    { id: 'invoice_001', invoice_number: 'INV-2001', customer_name: 'Golden Market Foods', invoice_date: '2026-07-27', due_date: '2026-08-10', status: 'unpaid', total_amount: 4250000, balance_due: 4250000, created_date: '2026-07-27T12:00:00.000Z' },
  ],
  StockItem: [
    { id: 'stock_001', sku: 'MNG-KENT-001', product_name: 'Premium Kent Mango', warehouse_name: 'Main Packhouse', bin_location: 'A-03', quantity_on_hand: 850, reorder_level: 1000, unit_of_measure: 'kg', created_date: '2026-07-28T08:00:00.000Z' },
    { id: 'stock_002', sku: 'MNG-DRIED-002', product_name: 'Dried Mango Slices', warehouse_name: 'Finished Goods', bin_location: 'F-11', quantity_on_hand: 2400, reorder_level: 500, unit_of_measure: 'pack', created_date: '2026-07-28T08:10:00.000Z' },
  ],
  Product: [
    { id: 'product_001', name: 'Premium Kent Mango', sku: 'MNG-KENT-001', product_type: 'fresh_fruit', price: 8500, unit_of_measure: 'kg', status: 'active', is_active: true, created_date: '2026-07-01T09:00:00.000Z' },
    { id: 'product_002', name: 'Dried Mango Slices', sku: 'MNG-DRIED-002', product_type: 'dried', price: 28000, unit_of_measure: 'pack', status: 'active', is_active: true, created_date: '2026-07-02T09:00:00.000Z' },
  ],
  Farm: [
    { id: 'farm_001', farm_code: 'FRM-001', name: 'Eastern Ridge Orchard', location: 'Dodowa', region: 'Greater Accra', size_acres: 120, tree_count: 4200, status: 'active', created_date: '2026-06-01T08:00:00.000Z' },
    { id: 'farm_002', farm_code: 'FRM-002', name: 'Volta Valley Farm', location: 'Ho', region: 'Volta', size_acres: 85, tree_count: 2850, status: 'active', created_date: '2026-06-02T08:00:00.000Z' },
  ],
  Harvest: [
    { id: 'harvest_001', harvest_code: 'HAR-4001', farm_name: 'Eastern Ridge Orchard', harvest_date: '2026-07-28T06:00:00.000Z', status: 'in_progress', quality_grade: 'Premium', total_quantity: 3200, created_date: '2026-07-28T06:00:00.000Z' },
  ],
  Delivery: [
    { id: 'delivery_001', delivery_number: 'DEL-5001', customer_name: 'Golden Market Foods', vehicle_number: 'GT-4455-26', status: 'in_transit', delivery_date: '2026-07-29T08:00:00.000Z', created_date: '2026-07-29T08:00:00.000Z' },
  ],
  Department: DEMO_DEPARTMENTS,
  Employee: DEMO_EMPLOYEES,
  Attendance: DEMO_ATTENDANCE,
  Inquiry: [],
  JobApplication: [],
};

const nowIso = () => new Date().toISOString();
const secureIdSuffix = () => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('');
};

const createId = (prefix = 'item') => `${prefix}_${Date.now().toString(36)}_${secureIdSuffix()}`;

const demoEmployeeCode = (joiningAt, uniquePart) => {
  const parsed = new Date(joiningAt);
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
    '-',
    String(date.getUTCHours()).padStart(2, '0'),
    String(date.getUTCMinutes()).padStart(2, '0'),
    String(date.getUTCSeconds()).padStart(2, '0'),
  ].join('');
  return `JBA-${stamp}-${uniquePart.slice(-4).toUpperCase()}`;
};

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const hashPassword = async (password) => {
  const bytes = new TextEncoder().encode(`jba-preview:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const readData = () => {
  const stored = readJson(DATA_KEY, {});
  const merged = { ...seedData, ...stored };
  writeJson(DATA_KEY, merged);
  return merged;
};

const compareValue = (value) => {
  if (value === undefined || value === null) return '';
  const parsedDate = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsedDate) ? value : parsedDate;
};

const sortItems = (items, sortBy) => {
  if (!sortBy) return [...items];
  const descending = sortBy.startsWith('-');
  const field = descending ? sortBy.slice(1) : sortBy;
  return [...items].sort((left, right) => {
    const leftValue = compareValue(left[field]);
    const rightValue = compareValue(right[field]);
    if (leftValue < rightValue) return descending ? 1 : -1;
    if (leftValue > rightValue) return descending ? -1 : 1;
    return 0;
  });
};

const matchesQuery = (item, query = {}) => Object.entries(query).every(([key, value]) => {
  if (value === undefined) return true;
  if (Array.isArray(item[key])) return item[key].includes(value);
  return item[key] === value;
});

const createEntityApi = (entityName) => ({
  async list(sortBy, limit = 100) {
    const items = sortItems(readData()[entityName] || [], sortBy);
    return typeof limit === 'number' ? items.slice(0, limit) : items;
  },
  async listAll(sortBy) {
    const data = readData();
    return sortItems([...(data[entityName] || [])], sortBy);
  },
  async filter(query = {}, sortBy, limit = 100) {
    const items = sortItems((readData()[entityName] || []).filter((item) => matchesQuery(item, query)), sortBy);
    return typeof limit === 'number' ? items.slice(0, limit) : items;
  },
  async create(payload) {
    const data = readData();
    const id = createId(entityName.toLowerCase());
    const createdAt = nowIso();
    let normalizedPayload = entityName === 'Inquiry'
      ? { status: 'new', source_page: 'contact', ...payload }
      : payload;
    if (entityName === 'Employee') {
      const joiningAt = payload.joining_at || createdAt;
      normalizedPayload = {
        ...payload,
        employee_code: demoEmployeeCode(joiningAt, id),
        joining_at: joiningAt,
        hire_date: payload.hire_date || joiningAt.slice(0, 10),
        full_name: payload.full_name || `${payload.first_name || ''} ${payload.last_name || ''}`.trim(),
        email: normalizeEmail(payload.email),
        status: payload.status || 'active',
      };
    }
    const record = { id, created_date: createdAt, updated_date: createdAt, ...normalizedPayload };
    data[entityName] = [record, ...(data[entityName] || [])];
    if (entityName === 'Inquiry') {
      const notification = {
        id: createId('notification'),
        created_date: nowIso(),
        updated_date: nowIso(),
        title: 'New client inquiry',
        message: `${record.name || 'Website visitor'}: ${record.subject || 'New client inquiry'}`,
        type: 'inquiry',
        notification_type: 'inquiry',
        channel: 'Admin',
        status: 'new',
        inquiry_id: record.id,
        record_id: record.id,
        entity_name: 'Inquiry',
        destination: `/admin/inquiries?inquiry=${record.id}`,
      };
      data.Notification = [notification, ...(data.Notification || [])];
    }
    writeJson(DATA_KEY, data);
    publishDataChange(entityName, 'create', record.id);
    if (entityName === 'Inquiry') publishDataChange('Notification', 'create', record.id);
    return record;
  },
  async update(id, payload) {
    const data = readData();
    data[entityName] = (data[entityName] || []).map((item) => item.id === id ? { ...item, ...payload, updated_date: nowIso() } : item);
    writeJson(DATA_KEY, data);
    const record = data[entityName].find((item) => item.id === id) || null;
    publishDataChange(entityName, 'update', id);
    return record;
  },
  async delete(id) {
    const data = readData();
    data[entityName] = (data[entityName] || []).filter((item) => item.id !== id);
    writeJson(DATA_KEY, data);
    publishDataChange(entityName, 'delete', id);
    return { success: true };
  },
});

const getSessionUser = () => readJson(SESSION_KEY, null);
const setSessionUser = (user) => writeJson(SESSION_KEY, user);
const clearSession = () => localStorage.removeItem(SESSION_KEY);
const STAFF_INVITATIONS_KEY = 'mango_farm_demo_staff_invitations';

const auth = {
  async me() {
    const user = getSessionUser();
    if (!user) {
      const error = new Error('Authentication required');
      error.status = 401;
      throw error;
    }
    return user;
  },
  async register({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || String(password || '').length < 12) {
      throw new Error('A valid email and a password of at least 12 characters are required');
    }
    const users = readJson(USERS_KEY, []);
    if (users.some((user) => user.email === normalizedEmail)) throw new Error('An account with this email already exists');
    const user = { id: createId('preview_user'), email: normalizedEmail, full_name: normalizedEmail.split('@')[0], role: 'customer', status: 'active' };
    users.push({ ...user, password_hash: await hashPassword(password) });
    writeJson(USERS_KEY, users);
    setSessionUser(user);
    return { user, csrf_token: 'preview' };
  },
  async loginViaEmailPassword(email, password) {
    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
      setSessionUser(DEMO_ADMIN);
      return DEMO_ADMIN;
    }
    const users = readJson(USERS_KEY, []);
    const user = users.find((item) => item.email === normalizedEmail);
    if (!user || user.password_hash !== await hashPassword(password)) throw new Error('Invalid email or password');
    const { password_hash: _passwordHash, ...safeUser } = user;
    setSessionUser(safeUser);
    return safeUser;
  },
  async resetPasswordRequest() {
    return { success: true };
  },
  async resetPassword() {
    throw new Error('Password reset is unavailable in the browser-only preview');
  },
  async logout(redirectTo) {
    clearSession();
    if (redirectTo) window.location.assign('/');
  },
  redirectToLogin(fromUrl = window.location.href) {
    const target = new URL('/login', window.location.origin);
    target.searchParams.set('from_url', fromUrl);
    window.location.assign(target);
  },
  setToken() {},
};

const entities = new Proxy({}, {
  get(cache, property) {
    if (typeof property !== 'string') return undefined;
    if (!cache[property]) cache[property] = createEntityApi(property);
    return cache[property];
  },
});

const commerce = {
  async checkoutOrder(payload) {
    const user = getSessionUser();
    if (!user) {
      const error = new Error('Authentication required');
      error.status = 401;
      throw error;
    }
    const lines = (payload.items || []).map((item) => {
      const product = PRODUCT_BY_ID[item.product_id];
      if (!product) throw new Error('Your basket contains an unavailable product');
      const quantity = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)));
      return {
        product_id: product.id,
        product_name: product.name,
        product_image: product.image,
        quantity,
        unit_price: product.price,
        line_total: product.price * quantity,
      };
    });
    if (!lines.length) throw new Error('Your basket is empty');
    const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);
    const deliveryFee = subtotal >= 250 ? 0 : 25;
    const now = nowIso();
    const orderNumber = `JBA-${now.slice(0, 10).replaceAll('-', '')}-${createId('').slice(-6).toUpperCase()}`;
    const invoiceNumber = `INV-${orderNumber.replace('JBA-', '')}`;
    const total = subtotal + deliveryFee;
    const order = await entities.Order.create({
      order_number: orderNumber,
      owner_user_id: user.id,
      customer_id: user.id,
      customer_name: payload.shipping.full_name,
      customer_email: user.email,
      contact_email: payload.shipping.email,
      contact_phone: payload.shipping.phone,
      order_date: now,
      source: 'website',
      currency: 'GHS',
      items: lines,
      item_count: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal_amount: subtotal,
      delivery_fee: deliveryFee,
      total_amount: total,
      shipping_address: payload.shipping,
      delivery_notes: payload.notes || '',
      payment_method: payload.payment_method,
      payment_status: 'pending',
      status: 'confirmed',
      status_history: [{
        status: 'confirmed',
        label: 'Order received',
        timestamp: now,
        note: 'Your order has been received and is waiting for fulfillment.',
      }],
      estimated_delivery: null,
    });

    const existingCustomers = await entities.Customer.filter({ email: payload.shipping.email }, '-created_date', 1);
    if (!existingCustomers.length) {
      await entities.Customer.create({
        customer_code: `WEB-${user.id.slice(0, 8).toUpperCase()}`,
        company_name: payload.shipping.full_name,
        contact_name: payload.shipping.full_name,
        email: payload.shipping.email,
        phone: payload.shipping.phone,
        address: payload.shipping.address,
        city: payload.shipping.city,
        region: payload.shipping.region,
        source: 'website',
        status: 'active',
      });
    }

    await entities.Invoice.create({
      invoice_number: invoiceNumber,
      order_id: order.id,
      order_number: orderNumber,
      owner_user_id: user.id,
      customer_id: user.id,
      customer_name: payload.shipping.full_name,
      customer_email: payload.shipping.email,
      invoice_date: now,
      due_date: new Date(Date.parse(now) + 7 * 86400000).toISOString(),
      source: 'website',
      currency: 'GHS',
      items: lines,
      subtotal_amount: subtotal,
      delivery_fee: deliveryFee,
      total_amount: total,
      amount_paid: 0,
      balance_due: total,
      payment_method: payload.payment_method,
      status: 'unpaid',
    });
    await entities.Notification.create({
      title: 'New website sale',
      message: `${orderNumber} from ${payload.shipping.full_name} is ready for sales and fulfillment.`,
      type: 'order',
      notification_type: 'order',
      channel: 'Admin',
      status: 'new',
      order_id: order.id,
      order_number: orderNumber,
      invoice_number: invoiceNumber,
    });
    return { ...order, invoice_number: invoiceNumber };
  },
  async myOrders() {
    const user = getSessionUser();
    if (!user) {
      const error = new Error('Authentication required');
      error.status = 401;
      throw error;
    }
    return entities.Order.filter({ owner_user_id: user.id }, '-order_date', 250);
  },
};

const staff = {
  async listInvitations() {
    return { invitations: readJson(STAFF_INVITATIONS_KEY, []) };
  },
  async invite(payload) {
    const invitations = readJson(STAFF_INVITATIONS_KEY, []);
    // Browser demo data must not persist staff identifiers. The production API
    // associates invitations with employees server-side.
    const invitation = {
      id: createId('invite'),
      fullName: payload.fullName,
      email: payload.email,
      role: payload.role,
      page_access: payload.pageAccess || [],
      employee_id: null,
      created_at: nowIso(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };
    invitations.unshift(invitation);
    writeJson(STAFF_INVITATIONS_KEY, invitations);
    return { invitation };
  },
  async updateInvitation(id, payload) {
    const invitations = readJson(STAFF_INVITATIONS_KEY, []);
    const invitation = invitations.find((item) => item.id === id);
    if (!invitation) throw new Error('Invitation not found');
    Object.assign(invitation, payload, payload.pageAccess ? { page_access: payload.pageAccess } : {});
    writeJson(STAFF_INVITATIONS_KEY, invitations);
    return { invitation };
  },
  async listUsers() {
    return { users: readJson(USERS_KEY, []).filter((item) => !['customer', 'user'].includes(item.role)) };
  },
  async updateUser(id, payload) {
    const users = readJson(USERS_KEY, []);
    const user = users.find((item) => item.id === id);
    if (!user) throw new Error('Staff account not found');
    Object.assign(user, payload, payload.pageAccess ? { page_access: payload.pageAccess } : {});
    writeJson(USERS_KEY, users);
    return { user };
  },
};

const files = {
  async upload(file) {
    return { id: createId('file'), name: file.name, contentType: file.type, sizeBytes: file.size, url: URL.createObjectURL(file) };
  },
};

export const demoBase44 = {
  auth,
  entities,
  commerce,
  files,
  staff,
  applications: {
    submit(formData) {
      return entities.JobApplication.create(Object.fromEntries(formData.entries()));
    },
  },
};
