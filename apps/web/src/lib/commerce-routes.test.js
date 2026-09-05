import { describe, expect, it } from 'vitest';
import { commerceRoutes } from './commerce-routes';

describe('purchase journey destinations', () => {
  it.each(['/portal', '/portal/products', '/portal/checkout', '/portal/tracking'])('keeps %s inside the portal', (path) => {
    expect(commerceRoutes(path)).toEqual({ portal: true, products: '/portal/products', checkout: '/portal/checkout', tracking: '/portal/tracking' });
  });
  it.each(['/', '/products', '/cart', '/checkout', '/portal-other'])('preserves public shopping for %s', (path) => {
    expect(commerceRoutes(path)).toEqual({ portal: false, products: '/products', checkout: '/checkout', tracking: '/my-orders' });
  });
});
