import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useProductCatalog } from '@/lib/useProductCatalog';

const STORAGE_KEY = 'jba-storefront-cart-v1';
const CartContext = createContext(null);

const readStoredCart = () => {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value
      .filter((item) => typeof item.productId === 'string' && Number(item.quantity) > 0)
      .map((item) => ({ productId: item.productId, quantity: Math.min(99, Math.floor(Number(item.quantity))) }));
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const { products, loading: catalogLoading, error: catalogError } = useProductCatalog();
  const PRODUCT_BY_ID = useMemo(() => Object.fromEntries(products.map(product => [product.id, product])), [products]);
  const [items, setItems] = useState(readStoredCart);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState('');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((productId, quantity = 1) => {
    if (!PRODUCT_BY_ID[productId]) return;
    const amount = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
    setItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      return existing
        ? current.map((item) => item.productId === productId
          ? { ...item, quantity: Math.min(99, item.quantity + amount) }
          : item)
        : [...current, { productId, quantity: amount }];
    });
    setLastAddedId(productId);
    window.setTimeout(() => setLastAddedId(''), 650);
  }, [PRODUCT_BY_ID]);

  const setQuantity = useCallback((productId, quantity) => {
    const amount = Math.max(0, Math.min(99, Math.floor(Number(quantity) || 0)));
    setItems((current) => amount === 0
      ? current.filter((item) => item.productId !== productId)
      : current.map((item) => item.productId === productId ? { ...item, quantity: amount } : item));
  }, []);

  const removeItem = useCallback((productId) => setItems((current) => current.filter((item) => item.productId !== productId)), []);
  const clearCart = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const lines = useMemo(() => items.filter(item => PRODUCT_BY_ID[item.productId]).map((item) => ({
    ...PRODUCT_BY_ID[item.productId],
    productId: item.productId,
    quantity: item.quantity,
    lineTotal: PRODUCT_BY_ID[item.productId].price * item.quantity,
  })), [items, PRODUCT_BY_ID]);
  const itemCount = lines.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const deliveryFee = lines.length && subtotal < 250 ? 25 : 0;
  const total = subtotal + deliveryFee;
  const value = useMemo(() => ({
    products, catalogLoading, catalogError,
    items: items.filter(item => PRODUCT_BY_ID[item.productId]),
    lines,
    itemCount,
    subtotal,
    deliveryFee,
    total,
    isCartOpen,
    lastAddedId,
    addItem,
    setQuantity,
    removeItem,
    clearCart,
    openCart,
    closeCart,
  }), [PRODUCT_BY_ID, products, catalogLoading, catalogError, items, lines, itemCount, subtotal, deliveryFee, total, isCartOpen, lastAddedId, addItem, setQuantity, removeItem, clearCart, openCart, closeCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
