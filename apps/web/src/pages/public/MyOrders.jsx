import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Circle, Loader2, LockKeyhole, PackageCheck, PackageSearch, RefreshCw, Truck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatProductPrice } from '@/data/productCatalog';

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
            {index > 0 && <span className={`absolute right-1/2 top-3.5 h-0.5 w-full ${complete ? 'bg-[#e19a16]' : 'bg-[#dfe4e1]'}`} />}
            <span className={`relative z-10 mx-auto grid h-7 w-7 place-items-center rounded-full border-2 ${complete ? 'border-[#0b432f] bg-[#0b432f] text-white' : 'border-[#d6ddda] bg-white text-[#a2ada7]'}`}>
              {complete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2" fill="currentColor" />}
            </span>
            <span className={`mt-2 block text-[10px] font-semibold sm:text-xs ${complete ? 'text-[#0b432f]' : 'text-[#8b968f]'}`}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function MyOrders() {
  const { isAuthenticated, navigateToLogin } = useAuth();
  const [searchParams] = useSearchParams();
  const placed = searchParams.get('placed');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(isAuthenticated);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      setOrders(await base44.commerce.myOrders() || []);
    } catch (loadError) {
      setError(loadError.message || 'We could not load your orders.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  if (!isAuthenticated) {
    return (
      <section className="bg-[#fffdf7] px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <LockKeyhole className="mx-auto h-11 w-11 text-[#0b432f]" strokeWidth={1.4} />
          <h1 className="mt-6 font-heading text-4xl font-semibold text-[#0b432f]">Your orders stay private</h1>
          <p className="mt-4 text-sm leading-7 text-[#68756e]">Sign in with the account used at checkout to see live fulfillment and delivery progress.</p>
          <button type="button" onClick={navigateToLogin} className="mt-7 rounded-lg bg-[#063c2b] px-7 py-3 text-sm font-semibold text-white">Sign in to track orders</button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[70vh] bg-[#f7f4ea] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#a66b0b]">Customer tracking</p>
            <h1 className="mt-2 font-heading text-4xl font-semibold text-[#0b432f] sm:text-5xl">My orders</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#68756e]">Updates made by the fulfillment team appear here when you refresh.</p>
          </div>
          <button type="button" onClick={loadOrders} disabled={loading} className="inline-flex h-10 items-center rounded-lg border border-[#0b432f]/15 bg-white px-4 text-xs font-semibold text-[#0b432f] hover:bg-[#0b432f]/5 disabled:opacity-60">
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
          <div className="mt-12 flex items-center justify-center py-20 text-sm text-[#68756e]"><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Loading your orders...</div>
        ) : !orders.length ? (
          <div className="mt-10 rounded-2xl border border-[#0b432f]/10 bg-white px-6 py-16 text-center">
            <PackageSearch className="mx-auto h-10 w-10 text-[#0b432f]" strokeWidth={1.4} />
            <h2 className="mt-5 font-heading text-2xl font-semibold text-[#0b432f]">No orders yet</h2>
            <p className="mt-2 text-sm text-[#68756e]">Your first website order will appear here automatically.</p>
            <Link to="/products" className="mt-6 inline-flex rounded-lg bg-[#063c2b] px-6 py-3 text-sm font-semibold text-white">Shop products</Link>
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            {orders.map((order) => (
              <article key={order.id} className={`overflow-hidden rounded-2xl border bg-white shadow-[0_14px_45px_rgba(19,57,43,0.06)] ${order.order_number === placed ? 'border-[#d99a27] ring-2 ring-[#d99a27]/15' : 'border-[#0b432f]/10'}`}>
                <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#0b432f]/10 px-5 py-5 sm:px-7">
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b968f]">Order reference</p><h2 className="mt-1 font-heading text-xl font-semibold text-[#0b432f]">{order.order_number}</h2><p className="mt-1 text-xs text-[#7b847f]">Placed {dateTime(order.order_date || order.created_date)}</p></div>
                  <div className="text-right"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-[#e9f4ef] text-[#0b432f]'}`}>{statusLabels[order.status] || order.status}</span><p className="mt-2 text-lg font-bold text-[#0b432f]">{formatProductPrice(order.total_amount)}</p></div>
                </header>
                <div className="px-5 py-6 sm:px-7">
                  <OrderProgress status={order.status} />
                  <div className="mt-7 grid gap-6 border-t border-[#0b432f]/10 pt-6 md:grid-cols-[1fr_16rem]">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#7b847f]">Products</h3>
                      <div className="mt-3 space-y-3">
                        {(order.items || []).map((item) => (
                          <div key={`${order.id}-${item.product_id}`} className="flex items-center gap-3">
                            <img src={item.product_image} alt="" className="h-12 w-12 rounded-lg bg-[#f7f4ea] object-contain p-1" />
                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#253a31]">{item.product_name}</p><p className="text-xs text-[#7b847f]">{item.quantity} × {formatProductPrice(item.unit_price)}</p></div>
                            <span className="text-xs font-semibold text-[#0b432f]">{formatProductPrice(item.line_total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#f7f4ea] p-4 text-xs leading-5 text-[#53635b]">
                      <p className="flex items-center font-bold text-[#0b432f]"><Truck className="mr-2 h-4 w-4" /> Delivery</p>
                      <p className="mt-2">{order.shipping_address?.address}</p>
                      <p>{order.shipping_address?.city}{order.shipping_address?.region ? `, ${order.shipping_address.region}` : ''}</p>
                      <p className="mt-3 border-t border-[#0b432f]/10 pt-3">Payment: <span className="font-semibold capitalize">{String(order.payment_method || 'pending').replaceAll('_', ' ')}</span></p>
                    </div>
                  </div>
                  {!!order.status_history?.length && (
                    <details className="mt-5 border-t border-[#0b432f]/10 pt-4">
                      <summary className="cursor-pointer text-xs font-semibold text-[#a66b0b]">View update history</summary>
                      <ol className="mt-4 space-y-3">
                        {[...order.status_history].reverse().map((entry, index) => <li key={`${entry.timestamp}-${index}`} className="text-xs leading-5 text-[#68756e]"><strong className="text-[#253a31]">{entry.label || statusLabels[entry.status] || entry.status}</strong> · {dateTime(entry.timestamp)}{entry.note ? <span className="block">{entry.note}</span> : null}</li>)}
                      </ol>
                    </details>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
