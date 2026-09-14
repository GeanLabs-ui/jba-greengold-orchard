import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Circle, LockKeyhole, PackageCheck, PackageSearch, RefreshCw, Truck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatProductPrice } from '@/data/productCatalog';
import PageSkeleton from '@/components/shared/PageSkeleton';
import { hasCustomerAccess } from '@/lib/access-control';
import CustomerAccessDenied from '@/components/CustomerAccessDenied';

const progressSteps = [
  { id: 'confirmed', label: 'Received' },
  { id: 'processing', label: 'Processing' },
  { id: 'packed', label: 'Packed' },
  { id: 'dispatched', label: 'On the way' },
  { id: 'delivered', label: 'Delivered' },
];

const statusLabels = { confirmed: 'Order received', processing: 'Processing', packed: 'Packed', dispatched: 'Dispatched', delivered: 'Delivered', cancelled: 'Cancelled', draft: 'Draft' };
const dateTime = (value) => value ? new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not available';

function OrderProgress({ status }) {
  if (status === 'cancelled') return <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">This order was cancelled. Contact our team if you need help.</div>;
  const currentIndex = progressSteps.findIndex((step) => step.id === status);
  return (
    <ol className="grid grid-cols-5">
      {progressSteps.map((step, index) => {
        const complete = currentIndex >= index;
        return (
          <li key={step.id} className="relative text-center">
            {index > 0 && <span className={`absolute right-1/2 top-3.5 h-0.5 w-full ${complete ? 'bg-[#a5d6a7]' : 'bg-[#e8f5e9]'}`} />}
            <span className={`relative z-10 mx-auto grid h-7 w-7 place-items-center rounded-full border-2 ${complete ? 'border-[#123524] bg-[#123524] text-white' : 'border-[#c8e6c9] bg-white text-[#5f7565]'}`}>
              {complete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2" fill="currentColor" />}
            </span>
            <span className={`mt-2 block text-caption font-semibold sm:text-xs ${complete ? 'text-[#123524]' : 'text-[#5f7565]'}`}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function OrderCard({ order, placed, guest = false }) {
  if (guest) {
    return (
      <article className="overflow-hidden rounded-2xl border border-[#a5d6a7] bg-white shadow-[0_14px_45px_rgba(19,57,43,0.06)] ring-2 ring-[#a5d6a7]/15">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#123524]/10 px-5 py-5 sm:px-7">
          <div><p className="text-caption font-bold uppercase tracking-[0.2em] text-[#5f7565]">Order ID</p><h2 className="mt-1 text-[#123524] text-section-title">{order.order_number}</h2><p className="mt-1 text-xs text-[#5f7565]">Placed {dateTime(order.order_date)}</p></div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-[#f4fbf5] text-[#123524]'}`}>{statusLabels[order.status] || order.status}</span>
        </header>
        <div className="px-5 py-6 sm:px-7">
          <OrderProgress status={order.status} />
          <dl className="mt-7 grid gap-4 border-t border-[#123524]/10 pt-6 sm:grid-cols-2">
            <div><dt className="text-caption font-bold uppercase tracking-[0.16em] text-[#5f7565]">Last updated</dt><dd className="mt-1 text-sm font-semibold text-[#123524]">{dateTime(order.updated_date)}</dd></div>
            <div><dt className="text-caption font-bold uppercase tracking-[0.16em] text-[#5f7565]">Estimated delivery</dt><dd className="mt-1 text-sm font-semibold text-[#123524]">{order.estimated_delivery ? dateTime(order.estimated_delivery) : 'To be confirmed'}</dd></div>
          </dl>
          {!!order.status_history?.length && (
            <details className="mt-5 border-t border-[#123524]/10 pt-4">
              <summary className="cursor-pointer text-xs font-semibold text-[#6b8e23]">View status history</summary>
              <ol className="mt-4 space-y-3">
                {[...order.status_history].reverse().map((entry, index) => <li key={`${entry.timestamp}-${index}`} className="text-xs leading-5 text-[#5f7565]"><strong className="text-[#123524]">{entry.label || statusLabels[entry.status] || entry.status}</strong> · {dateTime(entry.timestamp)}</li>)}
              </ol>
            </details>
          )}
        </div>
      </article>
    );
  }

  const delivery = order.shipping_address;
  return (
    <article className={`overflow-hidden rounded-2xl border bg-white shadow-[0_14px_45px_rgba(19,57,43,0.06)] ${order.order_number === placed ? 'border-[#a5d6a7] ring-2 ring-[#a5d6a7]/15' : 'border-[#123524]/10'}`}>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#123524]/10 px-5 py-5 sm:px-7">
        <div><p className="text-caption font-bold uppercase tracking-[0.2em] text-[#5f7565]">Order reference</p><h2 className="mt-1 text-[#123524] text-section-title">{order.order_number}</h2><p className="mt-1 text-xs text-[#5f7565]">Placed {dateTime(order.order_date || order.created_date)}</p></div>
        <div className="text-right"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-[#f4fbf5] text-[#123524]'}`}>{statusLabels[order.status] || order.status}</span><p className="mt-2 text-lg font-bold text-[#123524]">{formatProductPrice(order.total_amount)}</p></div>
      </header>
      <div className="px-5 py-6 sm:px-7">
        <OrderProgress status={order.status} />
        <div className="mt-7 grid gap-6 border-t border-[#123524]/10 pt-6 md:grid-cols-[1fr_16rem]">
          <div>
            <h3 className="uppercase text-[#5f7565] text-card-title">Products</h3>
            <div className="mt-3 space-y-3">
              {(order.items || []).map((item) => (
                <div key={`${order.order_number}-${item.product_id}`} className="flex items-center gap-3">
                  <img src={item.product_image} alt="" className="h-12 w-12 rounded-lg bg-[#f4fbf5] object-contain p-1" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#123524]">{item.product_name}</p><p className="text-xs text-[#5f7565]">{item.quantity} × {formatProductPrice(item.unit_price)}</p></div>
                  <span className="text-xs font-semibold text-[#123524]">{formatProductPrice(item.line_total)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-[#f4fbf5] p-4 text-xs leading-5 text-[#355e3b]">
            <p className="flex items-center font-bold text-[#123524]"><Truck className="mr-2 h-4 w-4" /> Delivery</p>
            <p className="mt-2">{delivery?.address}</p>
            <p>{delivery?.city}{delivery?.region ? `, ${delivery.region}` : ''}</p>
            {order.estimated_delivery && <p className="mt-3 border-t border-[#123524]/10 pt-3">Estimated: <strong>{dateTime(order.estimated_delivery)}</strong></p>}
            <p className="mt-3 border-t border-[#123524]/10 pt-3">Payment: <span className="font-semibold capitalize">{String(order.payment_method || 'pending').replaceAll('_', ' ')}</span></p>
            <p className="mt-2">Status: <strong className="capitalize">{order.payment_status || 'pending'}</strong></p>
            {order.source === 'website' && order.status !== 'cancelled' && order.payment_status !== 'paid' && <Link className="mt-3 inline-flex font-semibold underline" to={order.payment_attempt_id ? `/portal/payments/return?attempt=${encodeURIComponent(order.payment_attempt_id)}` : `/portal/payments/return?order=${encodeURIComponent(order.id)}`}>Pay / check payment</Link>}
          </div>
        </div>
        {!!order.status_history?.length && (
          <details className="mt-5 border-t border-[#123524]/10 pt-4">
            <summary className="cursor-pointer text-xs font-semibold text-[#6b8e23]">View update history</summary>
            <ol className="mt-4 space-y-3">
              {[...order.status_history].reverse().map((entry, index) => <li key={`${entry.timestamp}-${index}`} className="text-xs leading-5 text-[#5f7565]"><strong className="text-[#123524]">{entry.label || statusLabels[entry.status] || entry.status}</strong> · {dateTime(entry.timestamp)}{entry.note ? <span className="block">{entry.note}</span> : null}</li>)}
            </ol>
          </details>
        )}
      </div>
    </article>
  );
}

export default function MyOrders({ portal = false }) {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const customerAccess = hasCustomerAccess(user);
  const [searchParams] = useSearchParams();
  const placed = searchParams.get('placed');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(isAuthenticated);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState({ orderNumber: placed || '' });
  const [guestOrder, setGuestOrder] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState('');

  const loadOrders = useCallback(async () => {
    if (!isAuthenticated || !customerAccess) return;
    setLoading(true);
    setError('');
    try {
      setOrders(await base44.commerce.myOrders() || []);
    } catch (loadError) {
      setError(loadError.message || 'We could not load your orders.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, customerAccess]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const trackGuestOrder = async (event) => {
    event.preventDefault();
    setGuestLoading(true);
    setGuestError('');
    setGuestOrder(null);
    try {
      const order = await base44.commerce.trackOrder(tracking.orderNumber.trim());
      setGuestOrder(order);
    } catch (trackError) {
      setGuestError(trackError.message || 'We could not find that order. Check the order ID, then try again.');
    } finally {
      setGuestLoading(false);
    }
  };

  if (isAuthenticated && !customerAccess) return <CustomerAccessDenied />;

  if (!isAuthenticated) {
    return (
      <section data-layout-section="content" className="min-h-[70vh] bg-[#f4fbf5] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div className="pt-3">
              <p className="text-caption font-bold uppercase tracking-[0.24em] text-[#6b8e23]">Guest order tracking</p>
              <h1 className="mt-3 text-[#123524] text-page-title">Track your order without signing in</h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-[#5f7565]">Enter the order ID from your confirmation. We’ll show the latest fulfillment and delivery progress.</p>
              <div className="mt-7 flex items-start gap-3 border-t border-[#123524]/10 pt-6 text-xs leading-5 text-[#5f7565]">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#2e7d32]" />
                <p>Only tracking status and dates are shown. Customer, product, payment, address, and order-note details stay private.</p>
              </div>
            </div>

            <form onSubmit={trackGuestOrder} className="rounded-2xl border border-[#123524]/10 bg-white p-5 shadow-[0_18px_55px_rgba(19,57,43,0.07)] sm:p-7">
              <div className="flex items-center gap-3 border-b border-[#123524]/10 pb-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#c8e6c9]/20 text-[#2e7d32]"><PackageSearch className="h-5 w-5" /></span>
                <div><h2 className="text-[#123524] text-section-title">Find an order</h2><p className="mt-0.5 text-xs text-[#5f7565]">No account or password required.</p></div>
              </div>
              <label className="mt-6 block text-[#123524] text-label" htmlFor="guest-order-number">Order ID</label>
              <div className="relative mt-2">
                <PackageSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f7565]" />
                <input id="guest-order-number" required autoComplete="off" placeholder="JBA-20260904-ABC123" value={tracking.orderNumber} onChange={(event) => setTracking((current) => ({ ...current, orderNumber: event.target.value.toUpperCase() }))} className="h-12 w-full rounded-lg border border-[#123524]/15 bg-white pl-10 pr-3 text-sm font-semibold uppercase text-[#123524] outline-none transition focus:border-[#c8e6c9] focus:ring-2 focus:ring-[#c8e6c9]/20" />
              </div>
              {guestError && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">{guestError}</div>}
              <button type="submit" disabled={guestLoading} className="platform-action mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#2e7d32] px-5 text-sm font-bold text-white transition hover:bg-[#c8e6c9] hover:text-[#123524] disabled:cursor-wait disabled:opacity-70">
                {guestLoading ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Finding order</> : <>Track order <ArrowRight className="ml-2 h-4 w-4" /></>}
              </button>
              <p className="mt-5 text-center text-xs text-[#5f7565]">Have a customer account? <button type="button" onClick={navigateToLogin} className="font-bold text-[#2e7d32] underline-offset-4 hover:underline">Sign in to see all orders</button></p>
            </form>
          </div>

          {guestOrder && (
            <div className="mt-12" aria-live="polite">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#123524]"><PackageCheck className="h-5 w-5 text-[#2e7d32]" /> Latest tracking result</div>
              <OrderCard order={guestOrder} placed={guestOrder.order_number} guest />
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section data-layout-section={portal ? undefined : 'content'} className={portal ? 'portal-tracking' : 'min-h-[70vh] bg-[#f4fbf5] px-4 py-12 sm:px-6 lg:px-10 lg:py-16'}>
      <div className={portal ? '' : 'mx-auto max-w-5xl'}>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            {!portal && <p className="text-caption font-bold uppercase tracking-[0.24em] text-[#6b8e23]">Customer tracking</p>}
            <h1 className={portal ? 'font-heading text-2xl font-bold tracking-tight md:text-3xl' : 'mt-2 font-heading text-4xl font-semibold text-[#123524] sm:text-5xl'}>{portal ? 'Tracking' : 'My orders'}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#5f7565]">Updates made by the fulfillment team appear here when you refresh.</p>
          </div>
          <button type="button" onClick={loadOrders} disabled={loading} className="platform-action inline-flex h-10 items-center rounded-lg border border-[#123524]/15 bg-white px-4 text-xs font-semibold text-[#123524] hover:bg-[#123524]/5 disabled:opacity-60">
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {placed && (
          <div className="mt-8 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
            <PackageCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <div><p className="text-sm font-bold">Order placed successfully</p><p className="mt-1 text-xs leading-5">Reference <strong>{placed}</strong>. Our team can now see it in the admin Orders workspace.</p></div>
          </div>
        )}

        {error && <div role="alert" className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {loading ? (
          <PageSkeleton contentOnly className="mt-10" />
        ) : !orders.length && !error ? (
          <div className="mt-10 rounded-2xl border border-[#123524]/10 bg-white px-6 py-16 text-center">
            <PackageSearch className="mx-auto h-10 w-10 text-[#123524]" strokeWidth={1.4} />
            <h2 className="mt-5 text-[#123524] text-section-title">No orders yet</h2>
            <p className="mt-2 text-sm text-[#5f7565]">Your first website order will appear here automatically.</p>
            <Link to={portal ? '/portal/products' : '/products'} className="platform-action mt-6 inline-flex rounded-lg bg-[#123524] px-6 py-3 text-sm font-semibold text-white">Shop products</Link>
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} placed={placed} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
