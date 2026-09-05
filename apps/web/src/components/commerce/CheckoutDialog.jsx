import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, Loader2, LockKeyhole, Package, ShoppingBag, Truck, X } from 'lucide-react';
import { formatProductPrice } from '@/data/productCatalog';
import { basketPage } from './basket-pagination';
import PaymentOptions from './PaymentOptions';
import './checkout-dialog.css';

const steps = ['Contact', 'Delivery', 'Payment', 'Review'];
const payments = [
  ['mobile_money_on_confirmation', 'Mobile money after confirmation', 'We send the verified payment number after confirming your order.'],
  ['cash_on_delivery', 'Cash on delivery', 'Pay when your eligible local order arrives.'],
  ['bank_transfer', 'Bank transfer', 'Verified bank details are sent after order review.'],
];

export default function CheckoutDialog({ routes, isAuthenticated, navigateToLogin, cart, shipping, updateShipping, paymentMethod, setPaymentMethod, paymentCountry = 'GH', setPaymentCountry, notes, setNotes, submitting, error, placeOrder }) {
  const [closed, setClosed] = useState(false);
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 1099px), (max-height: 659px)').matches);
  const [step, setStep] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(1);
  const formRef = useRef(null);
  const listRef = useRef(null);
  const headingRef = useRef(null);
  const launcherRef = useRef(null);
  const submittingRef = useRef(false);
  const { lines, subtotal, deliveryFee, total, openCart, isCartOpen } = cart;
  const open = !closed && !isCartOpen;
  const orderPage = basketPage(lines, page, pageSize);
  const ready = isAuthenticated && lines.length > 0;

  useEffect(() => {
    const query = window.matchMedia('(max-width: 1099px), (max-height: 659px)');
    const update = () => setCompact(query.matches);
    query.addEventListener('change', update);
    update();
    return () => query.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    if (!open || !ready || (compact && step !== 3)) return undefined;
    let observer;
    const measure = () => {
      const list = listRef.current;
      if (!list) return;
      const rowHeight = parseFloat(window.getComputedStyle(list).getPropertyValue('--checkout-row-height')) || 68;
      setPageSize(Math.max(1, Math.floor(list.clientHeight / rowHeight)));
    };
    const frame = window.requestAnimationFrame(() => {
      measure();
      if (listRef.current && typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(measure);
        observer.observe(listRef.current);
      }
    });
    window.addEventListener('resize', measure);
    return () => { window.cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [open, ready, compact, step, lines.length]);

  const showStep = (next) => {
    setStep(next);
    window.requestAnimationFrame(() => headingRef.current?.focus());
  };
  const validate = (onlyStep) => {
    const selector = onlyStep === undefined ? 'input, textarea' : `[data-checkout-step="${onlyStep}"] input, [data-checkout-step="${onlyStep}"] textarea`;
    const invalid = Array.from(formRef.current?.querySelectorAll(selector) || []).find((field) => !field.checkValidity());
    if (!invalid) return true;
    if (compact) setStep(Number(invalid.closest('[data-checkout-step]')?.dataset.checkoutStep || 0));
    window.requestAnimationFrame(() => invalid.reportValidity());
    return false;
  };
  const nextStep = () => { if (validate(step)) showStep(Math.min(3, step + 1)); };
  const submit = async (event) => {
    event.preventDefault();
    if (submitting || submittingRef.current) return;
    if (compact && step < 3) { nextStep(); return; }
    if (!validate()) return;
    submittingRef.current = true;
    try { await placeOrder(event); } finally { submittingRef.current = false; }
  };
  const close = () => { if (!submitting && !submittingRef.current) setClosed(true); };

  const field = (name, label, type, placeholder, autoComplete) => (
    <label className="checkout-field" key={name}>{label}
      <input name={name} type={type} autoComplete={autoComplete} value={shipping[name]} onChange={updateShipping} placeholder={placeholder} required disabled={submitting} />
    </label>
  );
  const totals = (
    <dl className="checkout-totals">
      <div><dt>Subtotal</dt><dd>{formatProductPrice(subtotal)}</dd></div>
      <div><dt>Delivery</dt><dd>{deliveryFee ? formatProductPrice(deliveryFee) : 'Free'}</dd></div>
      <div className="checkout-grand-total"><dt>Total</dt><dd>{formatProductPrice(total)}</dd></div>
    </dl>
  );

  return <>
    <section className="checkout-launcher">
      <LockKeyhole size={28} aria-hidden="true" />
      <h1>Checkout</h1>
      <p>Your basket and delivery details stay here while you review your order.</p>
      <button ref={launcherRef} type="button" className="checkout-primary" onClick={() => setClosed(false)}>Continue checkout</button>
      <Link to={routes.products}>Continue shopping</Link>
    </section>
    <Dialog.Root open={open} onOpenChange={(value) => { if (!value) close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="checkout-overlay" />
        <Dialog.Content className="checkout-dialog" data-compact={compact} onOpenAutoFocus={(event) => { event.preventDefault(); headingRef.current?.focus(); }} onCloseAutoFocus={(event) => { event.preventDefault(); if (closed) launcherRef.current?.focus(); }} onEscapeKeyDown={(event) => { if (submitting) event.preventDefault(); }} onInteractOutside={(event) => { if (submitting) event.preventDefault(); }}>
          <header className="checkout-header">
            <div>
              <Dialog.Title ref={headingRef} tabIndex={-1}>Checkout</Dialog.Title>
              <Dialog.Description>Delivery, payment, and order review — all in one place.</Dialog.Description>
            </div>
            <button type="button" onClick={close} disabled={submitting} className="checkout-close" aria-label="Close checkout"><X size={18} aria-hidden="true" />Close</button>
          </header>
          {!ready ? <div className="checkout-empty">
            <ShoppingBag size={36} aria-hidden="true" />
            <h2>{!lines.length ? 'Your basket is empty' : 'Sign in to checkout'}</h2>
            <p>{!lines.length ? 'Choose products before starting checkout.' : 'Your basket stays saved while you sign in.'}</p>
            {!lines.length ? <Link className="checkout-primary" to={routes.products}>Shop products</Link> : <><button type="button" className="checkout-primary" onClick={navigateToLogin}>Sign in securely</button><Link to={`/register?from_url=${encodeURIComponent(routes.checkout)}`}>Create a customer account</Link></>}
          </div> : <form ref={formRef} onSubmit={submit} noValidate className="checkout-form">
            {compact && <nav className="checkout-steps" aria-label="Checkout steps">{steps.map((label, index) => <span key={label} aria-current={step === index ? 'step' : undefined}><b>{index + 1}</b>{label}</span>)}</nav>}
            <div className="checkout-workspace">
              <section className="checkout-delivery" hidden={compact && step > 1}>
                <h2><Truck size={18} aria-hidden="true" />{compact ? steps[step] + ' details' : 'Delivery details'}</h2>
                <div className="checkout-fields" data-checkout-step="0" hidden={compact && step !== 0}>
                  {field('full_name', 'Full name', 'text', 'Full name', 'name')}
                  {field('email', 'Contact email', 'email', 'you@example.com', 'email')}
                  {field('phone', 'Phone number', 'tel', '+233 00 000 0000', 'tel')}
                </div>
                <div className="checkout-fields" data-checkout-step="1" hidden={compact && step !== 1}>
                  {field('city', 'City / town', 'text', 'Accra', 'address-level2')}
                  {field('region', 'Region', 'text', 'Greater Accra', 'address-level1')}
                  <label className="checkout-field checkout-wide">Street address and landmark<textarea name="address" value={shipping.address} onChange={updateShipping} placeholder="House number, street, area, and landmark" autoComplete="street-address" required disabled={submitting} rows={2} /></label>
                  <label className="checkout-field checkout-wide">Delivery notes <span>(optional)</span><input name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} disabled={submitting} placeholder="Gate directions or preferred call time" /></label>
                </div>
              </section>
              <section className="checkout-payment" hidden={compact && step !== 2}>
                <h2><CreditCard size={18} aria-hidden="true" />Payment method</h2>
                <PaymentOptions country={paymentCountry} setCountry={setPaymentCountry} value={paymentMethod} onChange={setPaymentMethod} disabled={submitting} />
                <p className="checkout-payment-help checkout-pay-later">Or pay after order confirmation</p>
                <fieldset disabled={submitting}><legend className="sr-only">Choose a payment method</legend>{payments.map(([value, title, description]) => <label className="checkout-payment-option" key={value} data-selected={paymentMethod === value}>
                  <input type="radio" name="payment_method" value={value} checked={paymentMethod === value} onChange={(event) => setPaymentMethod(event.target.value)} />
                  <span><strong>{title}</strong><small>{description}</small></span>
                </label>)}</fieldset>
              </section>
              <section className="checkout-review" hidden={compact && step !== 3}>
                <h2><Package size={18} aria-hidden="true" />Your order <span>({cart.itemCount ?? lines.reduce((sum, line) => sum + line.quantity, 0)} items)</span></h2>
                <div ref={listRef} className="checkout-order-list">{orderPage.items.map((line) => <article key={line.id} className="checkout-order-line">
                  <img src={line.image} alt="" /><div><h3>{line.name}</h3><p>Qty {line.quantity}</p></div><strong>{formatProductPrice(line.lineTotal)}</strong>
                </article>)}</div>
                <nav className="checkout-order-pages" aria-label="Order product pages"><span role="status">{orderPage.start + 1}–{orderPage.end} of {lines.length}</span><div><button type="button" aria-label="Previous order products" disabled={orderPage.page === 0} onClick={() => setPage(orderPage.page - 1)}><ChevronLeft size={16} /></button><span>{orderPage.page + 1}/{orderPage.pageCount}</span><button type="button" aria-label="Next order products" disabled={orderPage.page + 1 >= orderPage.pageCount} onClick={() => setPage(orderPage.page + 1)}><ChevronRight size={16} /></button></div></nav>
                {!compact && totals}
              </section>
            </div>
            <footer className="checkout-footer">
              {error && <p className="checkout-error" role="alert">{error}</p>}
              {compact && totals}
              <div className="checkout-footer-actions">
                <button type="button" disabled={submitting} onClick={compact && step > 0 ? () => showStep(step - 1) : openCart} className="checkout-secondary"><ArrowLeft size={16} aria-hidden="true" />{compact && step > 0 ? 'Back' : 'Return to basket'}</button>
                {!compact && <span className="checkout-security"><LockKeyhole size={14} aria-hidden="true" />Private, account-linked order tracking</span>}
                {compact && step < 3 ? <button type="button" className="checkout-primary" onClick={nextStep}>Continue<ArrowRight size={16} aria-hidden="true" /></button> : <button type="submit" className="checkout-primary" disabled={submitting}>{submitting ? <><Loader2 size={16} className="animate-spin" />Please wait...</> : <><CheckCircle2 size={16} />{paymentMethod.includes(':') ? 'Continue to payment' : 'Place order'}</>}</button>}
              </div>
            </footer>
          </form>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}
