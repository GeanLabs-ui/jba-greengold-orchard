import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CartDrawer from './CartDrawer';

const state = vi.hoisted(() => ({ cart: {}, path: '/portal/products', navigate: vi.fn(), rootProps: null, checkoutAction: null }));
function findCheckout(children) {
  for (const child of React.Children.toArray(children)) {
    if (!React.isValidElement(child)) continue;
    if (child.props.className === 'basket-checkout') return child.props.onClick;
    const nested = findCheckout(child.props.children);
    if (nested) return nested;
  }
  return null;
}
vi.mock('@/lib/CartContext', () => ({ useCart: () => state.cart }));
vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: state.path }), useNavigate: () => state.navigate }));
vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children, ...props }) => { state.rootProps = props; return props.open ? children : null; },
  Portal: ({ children }) => children,
  Overlay: ({ className }) => <div className={className} />,
  Content: ({ children, className }) => { state.checkoutAction = findCheckout(children); return <div role="dialog" className={className}>{children}</div>; },
  Title: ({ children, className }) => <h2 className={className}>{children}</h2>,
  Description: ({ children, className }) => <p className={className}>{children}</p>,
  Close: ({ children }) => children,
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.path = '/portal/products';
  state.cart = {
    lines: Array.from({ length: 12 }, (_, id) => ({ id: String(id), name: `Product ${id}`, image: '/product.webp', quantity: 2, price: 25, lineTotal: 50 })),
    itemCount: 24, subtotal: 600, deliveryFee: 0, total: 600, isCartOpen: true,
    setQuantity: vi.fn(), removeItem: vi.fn(), closeCart: vi.fn(),
  };
});

describe('basket popup', () => {
  it.each([
    ['/portal/products', '/portal/checkout'],
    ['/portal/checkout', '/portal/checkout'],
    ['/products', '/checkout'],
  ])('opens checkout in the correct shell from %s', (path, destination) => {
    state.path = path;
    renderToStaticMarkup(<CartDrawer />);
    state.checkoutAction();
    expect(state.cart.closeCart).toHaveBeenCalledOnce();
    expect(state.navigate).toHaveBeenCalledWith(destination);
  });
  it('shows a close button, totals, checkout, and pagination together', () => {
    const html = renderToStaticMarkup(<CartDrawer />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Close basket"');
    expect(html).toContain('Order summary');
    expect(html).toContain('Continue to checkout');
    expect(html).toContain('600.00');
    expect(html).toContain('24 items');
    expect(html).toContain('Next basket page');
    expect(html.match(/<article/g)).toHaveLength(1);
    expect(html).not.toContain('View full basket');
  });

  it('stays hidden until manually opened', () => {
    state.cart.isCartOpen = false;
    expect(renderToStaticMarkup(<CartDrawer />)).toBe('');
  });

  it('closes without clearing any products', () => {
    renderToStaticMarkup(<CartDrawer />);
    state.rootProps.onOpenChange(false);
    expect(state.cart.closeCart).toHaveBeenCalledOnce();
    expect(state.cart.removeItem).not.toHaveBeenCalled();
    expect(state.cart.setQuantity).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it('opens legacy /cart links in the same popup and returns to products on close', () => {
    state.path = '/cart';
    state.cart.isCartOpen = false;
    expect(renderToStaticMarkup(<CartDrawer />)).toContain('role="dialog"');
    state.rootProps.onOpenChange(false);
    expect(state.navigate).toHaveBeenCalledWith('/products', { replace: true });
  });

  it('keeps a clear close action available for an empty basket', () => {
    state.cart.lines = [];
    state.cart.itemCount = 0;
    const html = renderToStaticMarkup(<CartDrawer />);
    expect(html).toContain('Your basket is empty');
    expect(html).toContain('aria-label="Close basket"');
    expect(html).toContain('Shop products');
  });
});
