import { afterEach, describe, expect, it, vi } from 'vitest';
import { loginDestination, customerDestination } from './login-audience';
import { hasCustomerAccess, hasAdminAccess } from './access-control';

afterEach(() => vi.unstubAllGlobals());
describe('login boundaries', () => {
  it.each([
    ['', false, 'customer', '/portal'], ['from_url=/admin/orders', false, 'staff', '/admin/orders'],
    ['', true, 'staff', '/admin'], ['from_url=/portal', true, 'staff', '/admin'],
    ['from_url=https://evil.example/admin', false, 'customer', '/portal'],
  ])('routes %s with staff path %s', (query, staff, audience, target) => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } });
    expect(loginDestination(new URLSearchParams(query), staff)).toEqual({ audience, target });
    expect(customerDestination('/admin')).toBe('/portal');
  });
  it('allows only verified customers in the portal and staff in admin', () => {
    expect(hasCustomerAccess({ role: 'customer', email_verified: true })).toBe(true);
    expect(hasCustomerAccess({ role: 'customer', email_verified: false })).toBe(false);
    expect(hasCustomerAccess({ role: 'admin', email_verified: true })).toBe(false);
    expect(hasAdminAccess({ role: 'customer' })).toBe(false);
  });
});
