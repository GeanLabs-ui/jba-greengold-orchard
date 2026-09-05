import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import PortalLayout from './PortalLayout';

vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { full_name: 'Client Example' } }) }));
vi.mock('@/lib/CartContext', () => ({ useCart: () => ({ itemCount: 2, openCart: vi.fn() }) }));
vi.mock('@/components/commerce/CartDrawer', () => ({ default: () => null }));
vi.mock('@/lib/utils', async () => {
  const { clsx } = await import('clsx');
  const { twMerge } = await import('tailwind-merge');
  return { cn: (...inputs) => twMerge(clsx(inputs)) };
});

describe('portal top navigation', () => {
  it.each(['/portal', '/portal/products', '/portal/tracking', '/portal/orders', '/portal/orders/order-1', '/portal/payments', '/portal/documents'])('marks exactly one destination active on %s', (path) => {
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><PortalLayout /></MemoryRouter>);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain('Customer portal navigation');
    expect(html).toContain('portal-horizontal-menu');
    expect(html).not.toContain('<aside');
    expect(html).not.toContain('bottom-0');
    for (const label of ['Dashboard', 'Products', 'Tracking', 'My Orders', 'Payments', 'Documents', 'Back to Website', 'Basket (2)']) expect(html).toContain(label);
    const activeLink = html.match(/<a[^>]*aria-current="page"[^>]*>/)?.[0];
    expect(activeLink).toContain(`href="${path.startsWith('/portal/orders') ? '/portal/orders' : path}"`);
  });
});
