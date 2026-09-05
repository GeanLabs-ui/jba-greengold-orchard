import { publishDataChange } from "../lib/data-sync";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(
  /\/$/,
  "",
);
let csrfToken = null;
let csrfUserId = null;

const rememberSession = (data) => {
  csrfToken = data.csrf_token;
  csrfUserId = data.user?.id || null;
};

const sessionChangedError = () => {
  const error = new Error('Your signed-in account changed in another tab. Sign back in to this account before submitting.');
  error.code = 'SESSION_CHANGED';
  return error;
};

const compareValue = (value) => {
  if (value === undefined || value === null) return "";
  const date = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isNaN(date) ? value : date;
};

const sortItems = (items, sortBy) => {
  if (!sortBy) return items;
  const descending = sortBy.startsWith("-");
  const field = descending ? sortBy.slice(1) : sortBy;
  return [...items].sort((a, b) => {
    const left = compareValue(a[field]);
    const right = compareValue(b[field]);
    if (left < right) return descending ? 1 : -1;
    if (left > right) return descending ? -1 : 1;
    return 0;
  });
};

const matchesQuery = (item, query = {}) =>
  Object.entries(query).every(([key, value]) => {
    if (value === undefined) return true;
    if (Array.isArray(item[key])) return item[key].includes(value);
    return item[key] === value;
  });

const parsePayload = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || "Request failed");
    error.status = response.status;
    error.code = payload.error?.code;
    throw error;
  }
  return payload;
};

const parseResponse = async (response) => (await parsePayload(response)).data;

const apiUnavailableError = (cause) => {
  const error = new Error(
    "The application API is not reachable. Start the app with `npm run dev` or check the deployed API service binding.",
    { cause },
  );
  error.code = "API_UNAVAILABLE";
  return error;
};

const recordClientError = ({ path, error }) => {
  if (path.startsWith('/activity-log/')) return;
  void fetch(`${API_BASE_URL}/activity-log/errors`, {
    method: 'POST', credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) },
    body: JSON.stringify({ path, error_code: error?.code || 'CLIENT_ERROR', error_message: error?.message || 'Unknown client error', status: error?.status || null }),
  }).catch(() => {});
};

const refreshCsrf = async (expectedUserId = csrfUserId) => {
  let response;
  try {
    // Read the token and its account together so a retry cannot silently switch owners.
    response = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (cause) {
    throw apiUnavailableError(cause);
  }
  const data = await parseResponse(response);
  if (expectedUserId && data.user?.id !== expectedUserId) {
    throw sessionChangedError();
  }
  rememberSession(data);
  return csrfToken;
};

const request = async (path, options = {}) => {
  const { includeMeta = false, publicRequest = false, accountUserId, ...fetchOptions } = options;
  const method = (fetchOptions.method || "GET").toUpperCase();
  const protectedMutation = !["GET", "HEAD", "OPTIONS"].includes(method) && !publicRequest;
  const expectedUserId = accountUserId || csrfUserId;
  if (protectedMutation && expectedUserId && csrfUserId && expectedUserId !== csrfUserId)
    throw sessionChangedError();
  const headers = new Headers(fetchOptions.headers || {});
  headers.set("Accept", "application/json");
  const isFormData = fetchOptions.body instanceof FormData;
  if (fetchOptions.body && !isFormData)
    headers.set("Content-Type", "application/json");
  if (protectedMutation && !csrfToken)
    await refreshCsrf(expectedUserId);
  if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method))
    headers.set("X-CSRF-Token", csrfToken);
  const requestOptions = {
      ...fetchOptions,
      method,
      headers,
      credentials: "include",
      body:
        fetchOptions.body && !isFormData
          ? JSON.stringify(fetchOptions.body)
          : fetchOptions.body,
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, requestOptions);
    } catch (cause) {
      throw apiUnavailableError(cause);
    }
    try {
      const payload = await parsePayload(response);
      return includeMeta ? payload : payload.data;
    } catch (error) {
      // CSRF rejection happens before the handler writes anything. Only that
      // explicit rejection is safe to replay, including multipart document uploads.
      if (protectedMutation && error.status === 403 && error.code === 'CSRF_INVALID') {
        csrfToken = null;
        if (attempt === 0) {
          headers.set('X-CSRF-Token', await refreshCsrf(expectedUserId || csrfUserId));
          continue;
        }
      }
      recordClientError({ path, error });
      throw error;
    }
  }
};

const createEntityApi = (entityName) => ({
  async list(sortBy, limit = 100, query = {}) {
    const params = new URLSearchParams({
      limit: String(Math.min(limit || 100, 250)),
    });
    Object.entries(query).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !Array.isArray(value) &&
        typeof value !== "object"
      ) {
        params.set(key, String(value));
      }
    });
    const items = await request(
      `/entities/${encodeURIComponent(entityName)}?${params}`,
    );
    return sortItems(items, sortBy);
  },
  async listAll(sortBy, query = {}) {
    const pageSize = 250;
    let offset = 0;
    const items = [];
    let hasMore = true;
    while (hasMore) {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offset),
      });
      Object.entries(query).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== "" &&
          !Array.isArray(value) &&
          typeof value !== "object"
        ) {
          params.set(key, String(value));
        }
      });
      const payload = await request(
        `/entities/${encodeURIComponent(entityName)}?${params}`,
        { includeMeta: true },
      );
      const page = Array.isArray(payload.data) ? payload.data : [];
      items.push(...page);
      hasMore = Boolean(payload.pagination?.hasMore) && page.length > 0;
      offset += page.length;
    }
    return sortItems(items, sortBy);
  },
  async filter(query = {}, sortBy, limit = 100) {
    const items = await this.list(sortBy, 250, query);
    const filtered = items.filter((item) => matchesQuery(item, query));
    return typeof limit === "number" ? filtered.slice(0, limit) : filtered;
  },
  async create(payload) {
    const record = await request(
      `/entities/${encodeURIComponent(entityName)}`,
      {
        method: "POST",
        body: payload,
        publicRequest: ["Inquiry", "CustomerStory"].includes(entityName),
      },
    );
    publishDataChange(entityName, "create", record?.id);
    if (entityName === "Inquiry")
      publishDataChange("Notification", "create", record?.id);
    return record;
  },
  async update(id, payload) {
    const record = await request(
      `/entities/${encodeURIComponent(entityName)}/${encodeURIComponent(id)}`,
      { method: "PATCH", body: payload },
    );
    publishDataChange(entityName, "update", id);
    return record;
  },
  async delete(id) {
    const result = await request(
      `/entities/${encodeURIComponent(entityName)}/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    publishDataChange(entityName, "delete", id);
    return result;
  },
});

const entities = new Proxy(
  {},
  {
    get(cache, property) {
      if (typeof property !== "string") return undefined;
      if (!cache[property]) cache[property] = createEntityApi(property);
      return cache[property];
    },
  },
);

const auth = {
  async registerLocalCustomer({ fullName, email, password }) {
    const data = await request('/auth/local-register', { method: 'POST', body: { fullName, email, password }, publicRequest: true });
    rememberSession(data);
    return data.user;
  },
  async loginLocalTestAccount(account, audience) {
    const data = await request('/auth/local-login', { method: 'POST', body: { account, audience }, publicRequest: true });
    rememberSession(data);
    return data.user;
  },
  async me() {
    const data = await request("/auth/me");
    rememberSession(data);
    return data.user;
  },
  async updateProfile({ fullName }) {
    const data = await request('/auth/me', { method: 'PATCH', body: { fullName } });
    return data.user;
  },
  async register({ email, password }) {
    const data = await request("/auth/register", {
      method: "POST",
      body: { email, password },
      publicRequest: true,
    });
    rememberSession(data);
    return data;
  },
  async loginViaEmailPassword(email, password, audience = 'customer') {
    const data = await request("/auth/login", {
      method: "POST",
      body: { email, password, audience },
      publicRequest: true,
    });
    rememberSession(data);
    return data.user;
  },
  async loginViaGoogle(credential, audience = 'customer') {
    const data = await request("/auth/google", {
      method: "POST",
      body: { credential, audience },
      publicRequest: true,
    });
    rememberSession(data);
    return data.user;
  },
  async resetPasswordRequest(email) {
    return request("/auth/password-reset/request", {
      method: "POST",
      body: { email },
      publicRequest: true,
    });
  },
  async resetPassword({ resetToken, newPassword }) {
    return request("/auth/password-reset/confirm", {
      method: "POST",
      body: { resetToken, newPassword },
      publicRequest: true,
    });
  },
  async verifyEmail(token) {
    return request("/auth/verify-email", {
      method: "POST",
      body: { token },
      publicRequest: true,
    });
  },
  async resendVerification() {
    return request("/auth/verify-email/resend", { method: "POST" });
  },
  async logout(redirectTo) {
    await request("/auth/logout", { method: "POST" });
    csrfToken = null;
    csrfUserId = null;
    if (redirectTo) window.location.assign("/");
  },
  redirectToLogin(fromUrl = window.location.href) {
    const target = new URL("/login", window.location.origin);
    target.searchParams.set("from_url", fromUrl);
    window.location.assign(target);
  },
  setToken() {},
};

const applications = {
  submit(formData) {
    return request("/applications", {
      method: "POST",
      body: formData,
      publicRequest: true,
    });
  },
};

const staff = {
  listInvitations() {
    return request('/auth/staff-invitations');
  },
  invite(payload) {
    return request('/auth/staff-invitations', { method: 'POST', body: payload });
  },
  updateInvitation(id, payload) {
    return request(`/auth/staff-invitations/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload });
  },
  listUsers() {
    return request('/auth/staff-users');
  },
  updateUser(id, payload) {
    return request(`/auth/staff-users/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload });
  },
  acceptInvitation({ token, credential }) {
    return request('/auth/staff-invitations/accept', {
      method: 'POST',
      body: { token, credential },
      publicRequest: true,
    });
  },
};

const files = {
  upload(file, recordId) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("recordId", recordId);
    return request("/files", { method: "POST", body: formData });
  },
};

const commerce = {
  paymentOptions(country = 'GH') {
    return request(`/payments/options?country=${encodeURIComponent(country)}`);
  },
  startPayment(orderId, selection) {
    return request(`/payments/orders/${encodeURIComponent(orderId)}/session`, { method: 'POST', body: selection });
  },
  verifyPayment(reference) {
    return request(`/payments/attempts/${encodeURIComponent(reference)}/verify`, { method: 'POST' });
  },
  async checkoutOrder(payload) {
    const order = await request("/commerce/orders", {
      method: "POST",
      body: payload,
    });
    ["Order", "Invoice", "Customer", "Notification"].forEach((entity) =>
      publishDataChange(entity, "checkout", order?.id),
    );
    return order;
  },
  myOrders() {
    return request("/commerce/orders");
  },
  trackOrder(orderNumber) {
    return request("/commerce/orders/track", {
      method: "POST",
      body: { order_number: orderNumber },
      publicRequest: true,
    });
  },
};

const farms = {
  list(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "")
        params.set(key, String(value));
    });
    return request(`/farms${params.size ? `?${params}` : ""}`);
  },
  get(id, filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "")
        params.set(key, String(value));
    });
    return request(
      `/farms/${encodeURIComponent(id)}${params.size ? `?${params}` : ""}`,
    );
  },
  async create(payload) {
    const record = await request("/farms", { method: "POST", body: payload });
    publishDataChange("Farm", "create", record?.id);
    return record;
  },
  async update(id, payload) {
    const record = await request(`/farms/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    });
    publishDataChange("Farm", "update", id);
    return record;
  },
  async deactivate(id, payload) {
    const record = await request(`/farms/${encodeURIComponent(id)}/deactivate`, {
      method: "POST",
      body: payload,
    });
    publishDataChange("Farm", "deactivate", id);
    return record;
  },
  async reactivate(id) {
    const record = await request(`/farms/${encodeURIComponent(id)}/reactivate`, {
      method: "POST",
    });
    publishDataChange("Farm", "reactivate", id);
    return record;
  },
  history(id) {
    return request(`/farms/${encodeURIComponent(id)}/history`);
  },
  blocks(id, filters = {}) {
    const params = new URLSearchParams(filters);
    return request(
      `/farms/${encodeURIComponent(id)}/blocks${params.size ? `?${params}` : ""}`,
    );
  },
  async createBlock(id, payload) {
    const record = await request(`/farms/${encodeURIComponent(id)}/blocks`, {
      method: "POST",
      body: payload,
    });
    publishDataChange("FarmBlock", "create", record?.id);
    return record;
  },
  getBlock(id, filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "")
        params.set(key, String(value));
    });
    return request(
      `/blocks/${encodeURIComponent(id)}${params.size ? `?${params}` : ""}`,
    );
  },
  async updateBlock(id, payload) {
    const record = await request(`/blocks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    });
    publishDataChange("FarmBlock", "update", id);
    return record;
  },
  async deactivateBlock(id, payload) {
    const record = await request(`/blocks/${encodeURIComponent(id)}/deactivate`, {
      method: "POST",
      body: payload,
    });
    publishDataChange("FarmBlock", "deactivate", id);
    return record;
  },
  async reactivateBlock(id) {
    const record = await request(`/blocks/${encodeURIComponent(id)}/reactivate`, {
      method: "POST",
    });
    publishDataChange("FarmBlock", "reactivate", id);
    return record;
  },
  blockHistory(id) {
    return request(`/blocks/${encodeURIComponent(id)}/history`);
  },
  async addInventory(id, payload) {
    const record = await request(`/blocks/${encodeURIComponent(id)}/inventory`, {
      method: "POST",
      body: payload,
    });
    publishDataChange("FarmBlock", "inventory-create", id);
    return record;
  },
  async updateInventory(id, payload) {
    const record = await request(`/block-inventory/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    });
    publishDataChange("FarmBlock", "inventory-update", record?.block_id || id);
    return record;
  },
  addActivity(id, payload) {
    return request(`/blocks/${encodeURIComponent(id)}/activities`, {
      method: "POST",
      body: payload,
    });
  },
  updateActivity(id, payload) {
    return request(`/block-activities/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    });
  },
  harvestPeriods(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "")
        params.set(key, String(value));
    });
    return request(`/harvest-periods${params.size ? `?${params}` : ""}`);
  },
  async createHarvestPeriod(payload) {
    const record = await request("/harvest-periods", {
      method: "POST",
      body: payload,
    });
    publishDataChange("HarvestPeriod", "create", record?.id);
    return record;
  },
  async updateHarvestPeriod(id, payload) {
    const record = await request(`/harvest-periods/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    });
    publishDataChange("HarvestPeriod", "update", id);
    return record;
  },
  mergeImpact(id) {
    return request(`/blocks/merge/${encodeURIComponent(id)}/impact`);
  },
  async mergeBlocks(payload) {
    const record = await request("/blocks/merge", { method: "POST", body: payload });
    publishDataChange("FarmBlock", "merge", record?.id);
    return record;
  },
  cropVarieties() {
    return request("/crop-varieties");
  },
};

const activityLog = {
  list: (limit = 200) => request(`/activity-log?limit=${Math.min(limit, 500)}`),
  delete: (id) => request(`/activity-log/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  deleteMany: (ids) => request('/activity-log/bulk-delete', { method: 'POST', body: { ids } }),
};
const account = {
  get: () => request('/account'),
  upload: (file, purpose, accountUserId) => {
    const form = new FormData();
    form.set('file', file);
    form.set('purpose', purpose);
    return request('/account/files', { method: 'POST', body: form, accountUserId });
  },
  fileUrl: (id) => `${API_BASE_URL}/account/files/${encodeURIComponent(id)}`,
  submit: (payload, accountUserId) => request('/account/verification', { method: 'POST', body: payload, accountUserId }),
  refresh: (accountUserId) => request('/account/verification/refresh', { method: 'POST', accountUserId }),
  requestChange: (reason, accountUserId) => request('/account/change-requests', { method: 'POST', body: { reason }, accountUserId }),
  reviews: () => request('/account/admin/reviews'),
  review: (id, payload) => request(`/account/admin/reviews/${encodeURIComponent(id)}`, { method: 'POST', body: payload }),
};
const apiBase44 = { auth, entities, applications, commerce, files, farms, staff, activityLog, account };

// The demo/preview client (and its seeded demo credentials) is only pulled into the
// bundle when demo mode is actually enabled at build/runtime, via a dynamic import.
// This keeps it out of the main production chunk instead of always shipping it.
const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

export const base44 = isDemoMode
  ? (await import("./demoBase44Client")).demoBase44
  : apiBase44;
