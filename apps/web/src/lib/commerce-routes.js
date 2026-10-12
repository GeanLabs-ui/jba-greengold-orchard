// Keep the whole purchase journey in the shell where it started.
export function commerceRoutes(pathname = '/') {
  const portal = pathname === '/portal' || pathname.startsWith('/portal/');
  return {
    portal,
    products: portal ? '/portal/products' : '/products',
    checkout: portal ? '/portal/checkout' : '/checkout',
    tracking: portal ? '/portal/tracking' : '/my-orders',
  };
}
