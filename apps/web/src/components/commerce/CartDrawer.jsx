import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { formatProductPrice } from '@/data/productCatalog';
import { commerceRoutes } from '@/lib/commerce-routes';
import { basketPage } from './basket-pagination';
import './basket-dialog.css';

export default function CartDrawer() {
  const { lines, itemCount, subtotal, deliveryFee, total, isCartOpen, setQuantity, removeItem, closeCart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const routes = commerceRoutes(location.pathname);
  const listRef = useRef(null);
  const openerRef = useRef(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(1);
  const isCartRoute = location.pathname === '/cart';
  const open = isCartOpen || isCartRoute;
  const pagination = basketPage(lines, page, pageSize);

  useEffect(() => { closeCart(); }, [location.pathname, closeCart]);
  useEffect(() => { if (open) setPage(0); }, [open]);

  // Measure only the space reserved for rows. Header, pagination, and summary
  // have their own layout areas and never scroll out of view.
  useLayoutEffect(() => {
    if (!open || !lines.length) return undefined;
    let observer;
    let frame;
    const measure = () => {
      const list = listRef.current;
      if (!list) return;
      const rowHeight = parseFloat(window.getComputedStyle(list).getPropertyValue('--basket-row-height')) || 104;
      setPageSize(Math.max(1, Math.floor(list.clientHeight / rowHeight)));
    };
    frame = window.requestAnimationFrame(() => {
      measure();
      if (listRef.current && typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(measure);
        observer.observe(listRef.current);
      }
    });
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [open, lines.length]);

  useEffect(() => { setPage(pagination.page); }, [pagination.page]);

  const closeBasket = () => {
    closeCart();
    if (isCartRoute) navigate('/products', { replace: true });
  };
  const shopProducts = () => {
    closeCart();
    navigate(routes.products);
  };
  const checkout = () => { closeCart(); navigate(routes.checkout); };

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) closeBasket(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="basket-dialog-overlay" />
        <Dialog.Content
          className="basket-dialog"
          onOpenAutoFocus={() => { openerRef.current = document.activeElement; }}
          onCloseAutoFocus={(event) => {
            if (openerRef.current?.isConnected) {
              event.preventDefault();
              openerRef.current.focus();
            }
          }}
        >
          <header className="basket-dialog-header">
            <div>
              <Dialog.Title className="basket-dialog-title">Your basket <span>({itemCount} items)</span></Dialog.Title>
              <Dialog.Description className="basket-dialog-description">Review your products and quantities.</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="basket-close" aria-label="Close basket"><X size={18} aria-hidden="true" /><span>Close</span></button>
            </Dialog.Close>
          </header>

          {lines.length ? (
            <div className="basket-dialog-body">
              <section className="basket-products" aria-label="Basket products">
                <div ref={listRef} className="basket-product-list">
                  {pagination.items.map((line) => (
                    <article key={line.id} className="basket-product">
                      <img src={line.image} alt="" className="basket-product-image" />
                      <div className="basket-product-info">
                        <h3>{line.name}</h3>
                        <p>{formatProductPrice(line.price)} each</p>
                      </div>
                      <button type="button" className="basket-icon-button basket-remove" onClick={() => removeItem(line.id)} aria-label={`Remove ${line.name}`}><Trash2 size={16} aria-hidden="true" /></button>
                      <div className="basket-product-controls">
                        <div className="basket-quantity">
                          <button type="button" onClick={() => setQuantity(line.id, line.quantity - 1)} aria-label={`Decrease ${line.name}`}><Minus size={14} aria-hidden="true" /></button>
                          <span aria-label={`Quantity of ${line.name}`}>{line.quantity}</span>
                          <button type="button" disabled={line.quantity >= 99} onClick={() => setQuantity(line.id, line.quantity + 1)} aria-label={`Increase ${line.name}`}><Plus size={14} aria-hidden="true" /></button>
                        </div>
                        <strong>{formatProductPrice(line.lineTotal)}</strong>
                      </div>
                    </article>
                  ))}
                </div>
                <nav className="basket-pagination" aria-label="Basket product pages">
                  <span role="status">{pagination.start + 1}–{pagination.end} of {lines.length} products</span>
                  <div>
                    <button type="button" className="basket-icon-button" disabled={pagination.page === 0} onClick={() => setPage(pagination.page - 1)} aria-label="Previous basket page"><ChevronLeft size={18} aria-hidden="true" /></button>
                    <span>{pagination.page + 1} / {pagination.pageCount}</span>
                    <button type="button" className="basket-icon-button" disabled={pagination.page + 1 >= pagination.pageCount} onClick={() => setPage(pagination.page + 1)} aria-label="Next basket page"><ChevronRight size={18} aria-hidden="true" /></button>
                  </div>
                </nav>
              </section>

              <aside className="basket-summary" aria-label="Order summary">
                <h3>Order summary</h3>
                <dl>
                  <div><dt>Subtotal</dt><dd>{formatProductPrice(subtotal)}</dd></div>
                  <div><dt>Delivery</dt><dd>{deliveryFee ? formatProductPrice(deliveryFee) : 'Free'}</dd></div>
                  <div className="basket-total"><dt>Total</dt><dd>{formatProductPrice(total)}</dd></div>
                </dl>
                <div className="basket-summary-actions">
                  <button type="button" className="basket-checkout" onClick={checkout}>Continue to checkout</button>
                  <button type="button" className="basket-continue" onClick={closeBasket}>Continue shopping</button>
                </div>
              </aside>
            </div>
          ) : (
            <div className="basket-empty">
              <ShoppingBag size={40} aria-hidden="true" />
              <h3>Your basket is empty</h3>
              <p>Add products to get started.</p>
              <button type="button" className="basket-checkout" onClick={shopProducts}>Shop products</button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
