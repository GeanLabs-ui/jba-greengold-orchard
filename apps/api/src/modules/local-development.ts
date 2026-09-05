// These are deliberately synthetic identities, never real staff/customer emails.
// Shared with the local seed command so the endpoint cannot select arbitrary users.
export const LOCAL_TEST_ACCOUNTS = {
  admin: { id: '11111111-1111-4111-8111-111111111101', email: 'admin@local-test.invalid', fullName: 'Local Test Admin', role: 'super_admin', audience: 'staff' },
  customer: { id: '11111111-1111-4111-8111-111111111102', email: 'customer@local-test.invalid', fullName: 'Local Test Customer', role: 'customer', audience: 'customer' },
} as const;
export const LOCAL_CUSTOMER_ID_PREFIX = 'local-test-customer-';

type LocalEnvironment = { APP_ENV?: string; LOCAL_TEST_LOGIN_ENABLED?: string; DATABASE_URL?: string };

export function localTestLoginEnabled(env: LocalEnvironment): boolean {
  if (env.APP_ENV !== 'local' || env.LOCAL_TEST_LOGIN_ENABLED !== 'true') return false;
  try {
    const database = new URL(env.DATABASE_URL || '');
    // Defense in depth: even a misconfigured local flag cannot target Neon.
    return ['postgres:', 'postgresql:'].includes(database.protocol)
      && ['localhost', '127.0.0.1'].includes(database.hostname)
      && database.port === '54329' && database.pathname === '/mango_farm';
  } catch { return false; }
}

export function isLocalTestAccount(id: string): boolean {
  return id.startsWith(LOCAL_CUSTOMER_ID_PREFIX) || Object.values(LOCAL_TEST_ACCOUNTS).some(account => account.id === id);
}
