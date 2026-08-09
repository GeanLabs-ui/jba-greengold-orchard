import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole, ShoppingBag, Truck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/CartContext';
import { formatProductPrice } from '@/data/productCatalog';

const initialShipping = { full_name: '', email: '', phone: '', address: '', city: '', region: '' };

export default function Checkout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const { items, lines, subtotal, deliveryFee, total, clearCart } = useCart();
  const [shipping, setShipping] = useState(initialShipping);
  const [paymentMethod, setPaymentMethod] = useState('mobile_money_on_confirmation');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setShipping((current) => ({
        ...current,
        full_name: current.full_name || user.full_name || '',
        email: current.email || user.email || '',
      }));
    }
  }, [user]);

  const updateShipping = (event) => setShipping((current) => ({ ...current, [event.target.name]: event.target.value }));

  const placeOrder = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const order = await base44.commerce.checkoutOrder({
        items: items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
        shipping,
        payment_method: paymentMethod,
        notes,
      });
      clearCart();
      navigate(`/my-orders?placed=${encodeURIComponent(order.order_number)}`, { replace: true });
    } catch (checkoutError) {
      setError(checkoutError.message || 'We could not place your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!lines.length) {
    return (
      <section className="bg-[#fffdf7] px-4 py-24 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-[#0b432f]" strokeWidth={1.4} />
        <h1 className="mt-6 font-heading text-4xl font-semibold text-[#0b432f]">Your basket is empty</h1>
        <p className="mt-3 text-sm text-[#68756e]">Choose your products before starting checkout.</p>
        <Link to="/products" className="mt-7 inline-flex rounded-lg bg-[#063c2b] px-6 py-3 text-sm font-semibold text-white">Shop products</Link>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="bg-[#fffdf7] px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-[#0b432f]/10 bg-white p-8 text-center shadow-[0_24px_70px_rgba(19,57,43,0.09)] sm:p-12">
          <LockKeyhole className="mx-auto h-10 w-10 text-[#0b432f]" strokeWidth={1.5} />
          <h1 className="mt-6 font-heading text-4xl font-semibold text-[#0b432f]">Sign in to checkout</h1>
          <p className="mt-4 text-sm leading-7 text-[#68756e]">Your account keeps this order private and lets you follow every fulfillment update. Your basket will stay saved.</p>
          <button type="button" onClick={navigateToLogin} className="mt-7 inline-flex h-12 items-center rounded-lg bg-[#063c2b] px-7 text-sm font-semibold text-white">Sign in securely</button>
          <p className="mt-4 text-xs text-[#7b847f]">New here? <Link to={`/register?from_url=${encodeURIComponent('/checkout')}`} className="font-semibold text-[#a66b0b] hover:underline">Create a customer account</Link></p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#f7f4ea] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <Link to="/cart" className="inline-flex items-center text-xs font-semibold text-[#7b6846] hover:text-[#a66b0b]"><ArrowLeft className="mr-2 h-4 w-4" /> Return to basket</Link>
        <div className="mt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#a66b0b]">Secure checkout</p>
          <h1 className="mt-2 font-heading text-4xl font-semibold text-[#0b432f] sm:text-5xl">Delivery details</h1>
        </div>

        <form onSubmit={placeOrder} className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#0b432f]/10 bg-white p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-heading text-xl font-semibold text-[#0b432f]">Where should we deliver?</h2>
                <Truck className="h-5 w-5 text-[#b77708]" />
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {[
                  ['full_name', 'Full name', 'text', 'Ama Mensah'],
                  ['email', 'Contact email', 'email', 'ama@example.com'],
                  ['phone', 'Phone number', 'tel', '+233 00 000 0000'],
                  ['city', 'City / town', 'text', 'Accra'],
                  ['region', 'Region', 'text', 'Greater Accra'],
                ].map(([name, label, type, placeholder]) => (
                  <label key={name} className="block text-sm font-semibold text-[#253a31]">
                    {label}
                    <input name={name} type={type} value={shipping[name]} onChange={updateShipping} placeholder={placeholder} required className="mt-2 h-12 w-full rounded-lg border border-[#0b432f]/15 bg-[#fffdf7] px-4 text-sm font-normal outline-none transition focus:border-[#b77708] focus:ring-2 focus:ring-[#d39a27]/15" />
                  </label>
                ))}
                <label className="block text-sm font-semibold text-[#253a31] sm:col-span-2">
                  Street address and landmark
                  <textarea name="address" value={shipping.address} onChange={updateShipping} placeholder="House number, street, area, and a nearby landmark" required rows={3} className="mt-2 w-full rounded-lg border border-[#0b432f]/15 bg-[#fffdf7] px-4 py-3 text-sm font-normal outline-none transition focus:border-[#b77708] focus:ring-2 focus:ring-[#d39a27]/15" />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-[#0b432f]/10 bg-white p-6 sm:p-8">
              <h2 className="font-heading text-xl font-semibold text-[#0b432f]">Payment method</h2>
              <p className="mt-2 text-xs leading-5 text-[#68756e]">No card details are collected on this page. Our team confirms mobile money or bank transfer instructions after receiving your order.</p>
              <div className="mt-5 grid gap-3">
                {[
                  ['mobile_money_on_confirmation', 'Mobile money after confirmation', 'We will send the verified payment number with your order confirmation.'],
                  ['cash_on_delivery', 'Cash on delivery', 'Pay when your eligible local order arrives.'],
                  ['bank_transfer', 'Bank transfer', 'Verified bank details will be sent after order review.'],
                ].map(([value, title, description]) => (
                  <label key={value} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${paymentMethod === value ? 'border-[#b77708] bg-[#fff8e8]' : 'border-[#0b432f]/10 hover:border-[#0b432f]/25'}`}>
                    <input type="radio" name="payment_method" value={value} checked={paymentMethod === value} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1 accent-[#0b432f]" />
                    <span><span className="block text-sm font-semibold text-[#253a31]">{title}</span><span className="mt-1 block text-xs leading-5 text-[#68756e]">{description}</span></span>
                  </label>
                ))}
              </div>
              <label className="mt-5 block text-sm font-semibold text-[#253a31]">Delivery notes (optional)
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={3} placeholder="Gate directions, preferred call time, or another useful detail" className="mt-2 w-full rounded-lg border border-[#0b432f]/15 bg-[#fffdf7] px-4 py-3 text-sm font-normal outline-none focus:border-[#b77708]" />
              </label>
            </div>
          </div>

          <aside className="h-fit rounded-2xl border border-[#0b432f]/10 bg-white p-6 shadow-[0_18px_50px_rgba(19,57,43,0.08)] lg:sticky lg:top-24">
            <h2 className="font-heading text-xl font-semibold text-[#0b432f]">Your order</h2>
            <div className="mt-5 max-h-72 space-y-4 overflow-auto pr-1">
              {lines.map((line) => (
                <div key={line.id} className="flex gap-3">
                  <img src={line.image} alt="" className="h-14 w-14 rounded-lg bg-[#f7f4ea] object-contain p-1" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#253a31]">{line.name}</p><p className="mt-1 text-xs text-[#7b847f]">Qty {line.quantity}</p></div>
                  <span className="text-xs font-semibold text-[#0b432f]">{formatProductPrice(line.lineTotal)}</span>
                </div>
              ))}
            </div>
            <dl className="mt-6 space-y-3 border-t border-[#0b432f]/10 pt-5 text-sm text-[#53635b]">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatProductPrice(subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>{deliveryFee ? formatProductPrice(deliveryFee) : 'Free'}</dd></div>
              <div className="flex justify-between border-t border-[#0b432f]/10 pt-4 text-lg font-bold text-[#0b432f]"><dt>Total</dt><dd>{formatProductPrice(total)}</dd></div>
            </dl>
            {error && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</div>}
            <button type="submit" disabled={submitting} className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-[#063c2b] text-sm font-semibold text-white hover:bg-[#0a5039] disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing order...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Place order</>}
            </button>
            <p className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#7b847f]"><LockKeyhole className="h-3.5 w-3.5" /> Private, account-linked order tracking</p>
          </aside>
        </form>
      </div>
    </section>
  );
}
