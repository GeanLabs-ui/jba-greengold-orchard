import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PortalProducts from './PortalProducts';
import { PRODUCT_CATALOG } from '@/data/productCatalog';

const { addItem, openCart } = vi.hoisted(() => ({ addItem: vi.fn(), openCart: vi.fn() }));
let controls = [];
vi.mock('@/lib/CartContext', () => ({ useCart: () => ({ addItem, openCart, itemCount: 2 }) }));
vi.mock('@/lib/utils', async () => {
  const { clsx } = await import('clsx');
  const { twMerge } = await import('tailwind-merge');
  return { cn: (...inputs) => twMerge(clsx(inputs)) };
});
vi.mock('@/components/ui/button', () => ({ Button: ({ children, onClick, size: _size, variant: _variant, ...props }) => {
  controls.push({ onClick, ...props });
  return <button {...props}>{children}</button>;
} }));

describe('portal shopping', () => {
  beforeEach(() => { controls = []; vi.clearAllMocks(); });

  it('uses the existing catalogue and adds each product to the shared cart', () => {
    const html = renderToStaticMarkup(<PortalProducts />);
    expect(html.match(/<article/g)).toHaveLength(PRODUCT_CATALOG.length);
    for (const product of PRODUCT_CATALOG) {
      const control = controls.find((item) => item['aria-label'] === `Add ${product.name} to basket`);
      expect(control).toBeDefined();
      control.onClick();
      expect(addItem).toHaveBeenLastCalledWith(product.id);
    }
    expect(addItem).toHaveBeenCalledTimes(PRODUCT_CATALOG.length);
  });

  it('provides basket access and category/search controls', () => {
    const html = renderToStaticMarkup(<PortalProducts />);
    expect(html).toContain('View basket (2)');
    expect(html).toContain('aria-label="Search products"');
    expect(html).toContain('Filter products by category');
    controls.find((control) => control.onClick === openCart).onClick();
    expect(openCart).toHaveBeenCalledOnce();
  });
});
