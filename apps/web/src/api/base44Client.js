import { demoBase44 } from './demoBase44Client';
import { publishDataChange } from '../lib/data-sync';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
let csrfToken = null;

const compareValue = (value) => {
  if (value === undefined || value === null) return '';
  const date = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isNaN(date) ? value : date;
};

const sortItems = (items, sortBy) => {
  if (!sortBy) return items;
  const descending = sortBy.startsWith('-');
  const field = descending ? sortBy.slice(1) : sortBy;
  return [...items].sort((a, b) => {
    const left = compareValue(a[field]);
    const right = compareValue(b[field]);
    if (left < right) return descending ? 1 : -1;
    if (left > right) return descending ? -1 : 1;
    return 0;
  });
};

const matchesQuery = (item, query = {}) => Object.entries(query).every(([key, value]) => {
  if (value === undefined) return true;
  if (Array.isArray(item[key])) return item[key].includes(value);
  return item[key] === value;
});

const parseResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Request failed');
    error.status = response.status;
    error.code = payload.error?.code;
    throw error;
  }
  return payload.data;
};

const refreshCsrf = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/csrf`, { credentials: 'include', headers: { Accept: 'application/json' } });
  const data = await parseResponse(response);
  csrfToken = data.csrf_token;
  return csrfToken;
};

const request = async (path, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  const isFormData = options.body instanceof FormData;
  if (options.body && !isFormData) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !csrfToken && !options.publicRequest) await refreshCsrf();
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('X-CSRF-Token', csrfToken);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
    body: options.body && !isFormData ? JSON.stringify(options.body) : options.body,
  });
  return parseResponse(response);
};

const createEntityApi = (entityName) => ({
  async list(sortBy, limit = 100) {
    const params = new URLSearchParams({ limit: String(Math.min(limit || 100, 250)) });
    const items = await request(`/entities/${encodeURIComponent(entityName)}?${params}`);
    return sortItems(items, sortBy);
  },
  async filter(query = {}, sortBy, limit = 100) {
    const items = await this.list(sortBy, 250);
    const filtered = items.filter((item) => matchesQuery(item, query));
    return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
  },
  async create(payload) {
    const record = await request(`/entities/${encodeURIComponent(entityName)}`, { method: 'POST', body: payload, publicRequest: entityName === 'Inquiry' });
    publishDataChange(entityName, 'create', record?.id);
    if (entityName === 'Inquiry') publishDataChange('Notification', 'create', record?.id);
    return record;
  },
  async update(id, payload) {
    const record = await request(`/entities/${encodeURIComponent(entityName)}/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload });
    publishDataChange(entityName, 'update', id);
    return record;
  },
  async delete(id) {
    const result = await request(`/entities/${encodeURIComponent(entityName)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    publishDataChange(entityName, 'delete', id);
    return result;
  },
});

const entities = new Proxy({}, {
  get(cache, property) {
    if (typeof property !== 'string') return undefined;
    if (!cache[property]) cache[property] = createEntityApi(property);
    return cache[property];
  },
});

const auth = {
  async me() {
    const data = await request('/auth/me');
    csrfToken = data.csrf_token;
    return data.user;
  },
  async register({ email, password }) {
    const data = await request('/auth/register', { method: 'POST', body: { email, password }, publicRequest: true });
    csrfToken = data.csrf_token;
    return data;
  },
  async loginViaEmailPassword(email, password) {
    const data = await request('/auth/login', { method: 'POST', body: { email, password }, publicRequest: true });
    csrfToken = data.csrf_token;
    return data.user;
  },
  async resetPasswordRequest(email) {
    return request('/auth/password-reset/request', { method: 'POST', body: { email }, publicRequest: true });
  },
  async resetPassword({ resetToken, newPassword }) {
    return request('/auth/password-reset/confirm', { method: 'POST', body: { resetToken, newPassword }, publicRequest: true });
  },
  async logout(redirectTo) {
    try { await request('/auth/logout', { method: 'POST' }); } finally {
      csrfToken = null;
      if (redirectTo) window.location.assign('/');
    }
  },
  redirectToLogin(fromUrl = window.location.href) {
    const target = new URL('/login', window.location.origin);
    target.searchParams.set('from_url', fromUrl);
    window.location.assign(target);
  },
  setToken() {},
};

const applications = {
  submit(formData) {
    return request('/applications', { method: 'POST', body: formData, publicRequest: true });
  },
};

const commerce = {
  async checkoutOrder(payload) {
    const order = await request('/commerce/orders', { method: 'POST', body: payload });
    ['Order', 'Invoice', 'Customer', 'Notification'].forEach((entity) => publishDataChange(entity, 'checkout', order?.id));
    return order;
  },
  myOrders() {
    return request('/commerce/orders');
  },
};

const apiBase44 = { auth, entities, applications, commerce };

export const base44 = import.meta.env.VITE_DEMO_MODE === 'true' ? demoBase44 : apiBase44;
