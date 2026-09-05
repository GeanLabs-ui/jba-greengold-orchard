import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider } from './CartContext';

// Exercise the provider's callbacks and derived totals without a browser or
// real localStorage. State slots persist between simulated provider renders.
const hooks = vi.hoisted(() => ({ slots: [], cursor: 0 }));
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useState: (initial) => {
      const index = hooks.cursor++;
      if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === 'function' ? initial() : initial;
      return [hooks.slots[index], (next) => {
        hooks.slots[index] = typeof next === 'function' ? next(hooks.slots[index]) : next;
      }];
    },
    useCallback: (callback) => callback,
    useMemo: (compute) => compute(),
    useEffect: vi.fn(),
  };
});

function renderCart() {
  hooks.cursor = 0;
  return CartProvider({ children: null }).props.value;
}

beforeEach(() => {
  hooks.slots = [];
  vi.stubGlobal('window', { localStorage: { getItem: () => '[]' }, setTimeout: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe('add to basket without opening it', () => {
  it('adds products and updates the total quantity while the basket stays closed', () => {
    renderCart().addItem('dried-mango');
    let cart = renderCart();
    expect(cart.itemCount).toBe(1);
    expect(cart.isCartOpen).toBe(false);
    cart.addItem('dried-mango', 2);
    cart.addItem('mango-juice');
    cart = renderCart();
    expect(cart.itemCount).toBe(4);
    expect(cart.lines).toHaveLength(2);
    expect(cart.subtotal).toBe(95);
    expect(cart.isCartOpen).toBe(false);
  });

  it('opens only on an explicit openCart call and stays closed after subsequent additions', () => {
    renderCart().addItem('dried-mango');
    renderCart().openCart();
    expect(renderCart().isCartOpen).toBe(true);
    renderCart().closeCart();
    renderCart().addItem('mango-juice');
    expect(renderCart().isCartOpen).toBe(false);
    expect(renderCart().itemCount).toBe(2);
  });

  it('does not close a basket the client has already opened', () => {
    renderCart().openCart();
    renderCart().addItem('dried-mango');
    expect(renderCart().isCartOpen).toBe(true);
  });

  it('keeps quantity limits, removal, and the visible count consistent', () => {
    renderCart().addItem('dried-mango', 120);
    expect(renderCart().itemCount).toBe(99);
    renderCart().setQuantity('dried-mango', 3);
    expect(renderCart().itemCount).toBe(3);
    renderCart().removeItem('dried-mango');
    expect(renderCart().itemCount).toBe(0);
    renderCart().addItem('unknown-product');
    expect(renderCart().itemCount).toBe(0);
    expect(renderCart().isCartOpen).toBe(false);
  });
});
