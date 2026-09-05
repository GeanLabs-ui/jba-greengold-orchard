import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PaymentOptions from '@/components/commerce/PaymentOptions';
import { paymentCheckoutUrl } from '@/lib/payment-navigation';
import { formatProductPrice } from '@/data/productCatalog';
import '@/components/commerce/checkout-dialog.css';

export default function PaymentReturn() {
  const [params, setParams] = useSearchParams();
  const reference = params.get('attempt');
  const orderId = params.get('order');
  const autoStart = params.get('start') === '1';
  const cancelled = params.get('cancelled') === '1';
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('pending');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [country, setCountry] = useState('GH');
  const [method, setMethod] = useState('mobile_money_on_confirmation');
  const operation = useRef(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      let result = reference ? await base44.commerce.verifyPayment(reference) : null;
      const rows = await base44.commerce.myOrders();
      const found = rows.find((item) => item.id === (result?.order_id || orderId));
      if (!found) throw new Error('This payment order could not be found in your account.');
      if (!reference && found.payment_attempt_id && found.payment_status !== 'paid') result = await base44.commerce.verifyPayment(found.payment_attempt_id);
      setOrder(found);
      setCountry(found.payment_country || 'GH');
      setMethod(found.payment_method || 'mobile_money_on_confirmation');
      setStatus(found.payment_status === 'paid' ? 'paid' : result?.status || 'pending');
    } catch (err) { setError(err.message || 'We could not verify your payment. Please check again.'); }
    finally { setBusy(false); }
  }, [reference, orderId]);
  useEffect(() => { load(); }, [load]);

  const start = useCallback(async (currentOrder, currentMethod, currentCountry) => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError('');
    try {
      const [provider, selectedMethod] = currentMethod.split(':');
      const result = await base44.commerce.startPayment(currentOrder.id, { provider, method: selectedMethod, country: currentCountry });
      // Keep a recoverable, account-linked destination in browser history.
      setParams({ attempt: result.reference, order: currentOrder.id }, { replace: true });
      if (result.checkout_url) window.location.assign(paymentCheckoutUrl(result.checkout_url));
      else setStatus(result.status || 'pending');
    } catch (err) { setError(err.message || 'Payment could not start. Your order is saved.'); }
    finally { setBusy(false); operation.current = false; }
  }, [setParams]);
  const started = useRef(false);
  useEffect(() => {
    if (autoStart && order && status !== 'paid' && !started.current && order.payment_method?.includes(':')) {
      started.current = true;
      void start(order, order.payment_method, order.payment_country || 'GH');
    }
  }, [autoStart, order, status, start]);

  return <div className="mx-auto max-w-xl rounded-xl border bg-white p-5 sm:p-8">
    <h1 className="text-2xl font-bold">{status === 'paid' ? 'Payment confirmed' : 'Complete your payment'}</h1>
    <p className="my-3 text-sm text-slate-600" role="status">{busy ? 'Checking your payment…' : status === 'paid' ? 'Your payment has been verified and your invoice updated.' : status === 'failed' ? 'This payment did not complete. You can try again below.' : cancelled ? 'You left checkout. We will check whether any payment completed.' : 'Your order is saved. Payment is confirmed only after verification.'}</p>
    {order && <p className="mb-4 text-sm font-semibold">{order.order_number} · {formatProductPrice(order.total_amount)}</p>}
    {error && <p role="alert" className="my-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {status !== 'paid' && order && <>
      <PaymentOptions country={country} setCountry={setCountry} value={method} onChange={setMethod} disabled={busy} />
      <button className="checkout-primary mt-4" disabled={busy || !method.includes(':')} onClick={() => start(order, method, country)}>Continue to secure payment</button>
    </>}
    <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
      {status !== 'paid' && <button className="checkout-secondary" disabled={busy} onClick={load}>Check payment status</button>}
      <Link to="/portal/tracking">View my orders</Link>
      <Link to="/portal/payments">Payments &amp; invoices</Link>
    </div>
  </div>;
}
