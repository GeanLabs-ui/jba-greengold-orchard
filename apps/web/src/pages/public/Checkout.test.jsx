import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Checkout from './Checkout';
vi.mock('@/components/CustomerAccessDenied', () => ({ default: () => <p>Customer account required</p> }));

const state = vi.hoisted(() => ({
  path: '/portal/checkout', controls: [], cart: {},
  navigate: vi.fn(), checkoutOrder: vi.fn(),
}));
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, default: { ...actual.default, createElement: (type, props, ...children) => {
    if (type === 'form' || type === 'button') state.controls.push({ type, ...props });
    return actual.createElement(type, props, ...children);
  } } };
});
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: state.path }), useNavigate: () => state.navigate,
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock('@/api/base44Client', () => ({ base44: { commerce: { checkoutOrder: state.checkoutOrder } } }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'customer-1', role: 'customer', email_verified: true }, isAuthenticated: true }) }));
vi.mock('@/lib/CartContext', () => ({ useCart: () => state.cart }));
vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children, open }) => open ? children : null,
  Portal: ({ children }) => children,
  Overlay: ({ className }) => <div className={className} />,
  Content: ({ children, className }) => <div role="dialog" className={className}>{children}</div>,
  Title: ({ children }) => <h2>{children}</h2>,
  Description: ({ children }) => <p>{children}</p>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.path = '/portal/checkout';
  state.controls = [];
  state.checkoutOrder.mockResolvedValue({ order_number: 'JBA/123' });
  state.cart = {
    items: [{ productId: 'dried-mango', quantity: 2 }],
    lines: [{ id: 'dried-mango', name: 'Dried Mango', image: '/product.webp', quantity: 2, lineTotal: 50 }],
    subtotal: 50, deliveryFee: 25, total: 75, clearCart: vi.fn(), openCart: vi.fn(),
  };
});

afterEach(() => vi.unstubAllGlobals());

describe('checkout inside the client portal', () => {
  it('uses compact steps and does not submit an order from the contact step', async () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }), requestAnimationFrame: vi.fn() });
    const html = renderToStaticMarkup(<Checkout />);
    expect(html).toContain('Checkout steps');
    expect(html).toContain('Contact details');
    expect(html).not.toContain('Place order');
    await state.controls.find((control) => control.type === 'form').onSubmit({ preventDefault: vi.fn() });
    expect(state.checkoutOrder).not.toHaveBeenCalled();
    expect(state.cart.clearCart).not.toHaveBeenCalled();
  });

  it('shows delivery, payment, totals and a clear close action in the popup', () => {
    const html = renderToStaticMarkup(<Checkout />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Close checkout"');
    expect(html).toContain('Delivery details');
    expect(html).toContain('Payment method');
    expect(html).toContain('Your order');
    expect(html).toContain('Place order');
    expect(html).toContain('75.00');
    state.controls.find((control) => control['aria-label'] === 'Close checkout').onClick();
    expect(state.cart.clearCart).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
    expect(state.checkoutOrder).not.toHaveBeenCalled();
  });

  it('hides checkout while the basket popup is open', () => {
    state.cart.isCartOpen = true;
    const html = renderToStaticMarkup(<Checkout />);
    expect(html).not.toContain('role="dialog"');
    expect(html).toContain('Continue checkout');
  });

  it('guards against duplicate order submissions', async () => {
    let finish;
    state.checkoutOrder.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    renderToStaticMarkup(<Checkout />);
    const submit = state.controls.find((control) => control.type === 'form').onSubmit;
    const pending = submit({ preventDefault: vi.fn() });
    await submit({ preventDefault: vi.fn() });
    await vi.waitFor(() => expect(state.checkoutOrder).toHaveBeenCalledOnce());
    finish({ order_number: 'JBA/123' });
    await pending;
  });

  it('reopens the basket without navigating away from the form', () => {
    const html = renderToStaticMarkup(<Checkout />);
    expect(html).not.toContain('href="/cart"');
    expect(html).toContain('Return to basket');
    const basketButton = state.controls.find((control) => control.onClick === state.cart.openCart);
    basketButton.onClick();
    expect(state.cart.openCart).toHaveBeenCalledOnce();
    expect(state.navigate).not.toHaveBeenCalled();
    expect(state.cart.clearCart).not.toHaveBeenCalled();
  });

  it.each([
    ['/portal/checkout', '/portal/tracking?placed=JBA%2F123'],
    ['/checkout', '/my-orders?placed=JBA%2F123'],
  ])('keeps order confirmation in the correct shell for %s', async (path, destination) => {
    state.path = path;
    renderToStaticMarkup(<Checkout />);
    await state.controls.find((control) => control.type === 'form').onSubmit({ preventDefault: vi.fn() });
    expect(state.checkoutOrder).toHaveBeenCalledWith(expect.objectContaining({ items: [{ product_id: 'dried-mango', quantity: 2 }] }));
    expect(state.cart.clearCart).toHaveBeenCalledOnce();
    expect(state.navigate).toHaveBeenCalledWith(destination, { replace: true });
  });

  it('preserves the basket and current page when order submission fails', async () => {
    state.checkoutOrder.mockRejectedValue(new Error('Order not submitted'));
    renderToStaticMarkup(<Checkout />);
    await state.controls.find((control) => control.type === 'form').onSubmit({ preventDefault: vi.fn() });
    expect(state.cart.clearCart).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it('keeps empty-basket shopping in the portal', () => {
    state.cart.lines = [];
    const html = renderToStaticMarkup(<Checkout />);
    expect(html).toContain('href="/portal/products"');
    expect(html).not.toContain('href="/products"');
  });

  it('shows planned gateways and wallets disabled before configuration is available', () => {
    const html = renderToStaticMarkup(<Checkout />);
    expect(html).toContain('Card · Paystack');
    expect(html).toContain('Card · Stripe');
    expect(html).toContain('Apple Pay / Google Pay');
    expect(html).toContain('Telecel');
    expect(html).toContain('Coming soon');
    expect(html).toContain('Burkina Faso');
    expect(html).toContain('Togo');
    expect(html).toContain('data-unavailable="true"');
  });
});
