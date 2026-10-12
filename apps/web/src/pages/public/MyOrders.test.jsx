import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MyOrders from './MyOrders';

const state = vi.hoisted(() => ({ navigateToLogin: vi.fn() }));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useSearchParams: () => [new URLSearchParams()],
}));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: null, isAuthenticated: false, navigateToLogin: state.navigateToLogin }) }));
vi.mock('@/lib/access-control', () => ({ hasCustomerAccess: () => false }));
vi.mock('@/api/base44Client', () => ({ base44: { commerce: { myOrders: vi.fn(), trackOrder: vi.fn() } } }));
vi.mock('@/components/shared/PageSkeleton', () => ({ default: () => <div>Loading</div> }));
vi.mock('@/components/CustomerAccessDenied', () => ({ default: () => <div>Access denied</div> }));

describe('public order tracking', () => {
  it('shows the order-ID form without login', () => {
    const html = renderToStaticMarkup(<MyOrders />);

    expect(html).toContain('Track your order without signing in');
    expect(html).toContain('id="guest-order-number"');
    expect(html).toContain('Order ID');
    expect(html).toContain('No account or password required');
    expect(html).not.toContain('guest-order-email');
    expect(html).not.toContain('Sign in to track orders');
  });
});
