import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { formatProductPrice } from '@/data/productCatalog';

export default function Cart() {
  const { lines, subtotal, deliveryFee, total, setQuantity, removeItem } = useCart();
  const remainingForFreeDelivery = Math.max(0, 250 - subtotal);

  if (!lines.length) {
    return (
      <section className="bg-[#fffdf7] px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#0b432f]/5 text-[#0b432f]">
            <ShoppingBag className="h-9 w-9" strokeWidth={1.4} />
          </span>
          <h1 className="mt-7 font-heading text-4xl font-semibold text-[#0b432f]">Your basket is ready when you are</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#68756e]">Add fresh mangoes, drinks, preserves, dried fruit, or a gift pack and return here to checkout.</p>
          <Link to="/products" className="mt-8 inline-flex h-12 items-center rounded-lg bg-[#063c2b] px-6 text-sm font-semibold text-white hover:bg-[#0a5039]">
            Browse all products <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#f7f4ea] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <Link to="/products" className="inline-flex items-center text-xs font-semibold text-[#7b6846] hover:text-[#a66b0b]">
          <ArrowLeft className="mr-2 h-4 w-4" /> Continue shopping
        </Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#a66b0b]">Review your selection</p>
            <h1 className="mt-2 font-heading text-4xl font-semibold text-[#0b432f] sm:text-5xl">Your basket</h1>
          </div>
          <p className="text-sm text-[#68756e]">{lines.reduce((sum, line) => sum + line.quantity, 0)} items</p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="overflow-hidden rounded-2xl border border-[#0b432f]/10 bg-white">
            {lines.map((line) => (
              <article key={line.id} className="grid gap-4 border-b border-[#0b432f]/10 p-5 last:border-b-0 sm:grid-cols-[7rem_1fr_auto] sm:items-center">
                <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-xl bg-[#f7f4ea]">
                  <img src={line.image} alt={line.name} className="h-full w-full object-contain p-2" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-semibold text-[#0b432f]">{line.name}</h2>
                  <p className="mt-1 text-xs text-[#7b847f]">{formatProductPrice(line.price)} each</p>
                  <div className="mt-4 inline-flex items-center rounded-full border border-[#0b432f]/15">
                    <button type="button" className="grid h-9 w-9 place-items-center" onClick={() => setQuantity(line.id, line.quantity - 1)} aria-label={`Decrease ${line.name}`}><Minus className="h-3.5 w-3.5" /></button>
                    <span className="min-w-8 text-center text-sm font-semibold">{line.quantity}</span>
                    <button type="button" className="grid h-9 w-9 place-items-center" onClick={() => setQuantity(line.id, line.quantity + 1)} aria-label={`Increase ${line.name}`}><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-5 sm:block sm:text-right">
                  <strong className="text-base text-[#0b432f]">{formatProductPrice(line.lineTotal)}</strong>
                  <button type="button" onClick={() => removeItem(line.id)} className="flex items-center text-xs text-[#8b968f] hover:text-red-600 sm:mt-5 sm:ml-auto" aria-label={`Remove ${line.name}`}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-[#0b432f]/10 bg-white p-6 shadow-[0_18px_50px_rgba(19,57,43,0.08)] lg:sticky lg:top-24">
            <h2 className="font-heading text-xl font-semibold text-[#0b432f]">Order summary</h2>
            {remainingForFreeDelivery > 0 ? (
              <div className="mt-5 rounded-xl bg-[#f7f4ea] p-4">
                <p className="text-xs leading-5 text-[#53635b]">Add <strong>{formatProductPrice(remainingForFreeDelivery)}</strong> more for free delivery.</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#0b432f]/10"><div className="h-full rounded-full bg-[#df950f]" style={{ width: `${Math.min(100, (subtotal / 250) * 100)}%` }} /></div>
              </div>
            ) : (
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800"><Truck className="h-4 w-4" /> Free delivery unlocked</div>
            )}
            <dl className="mt-6 space-y-3 text-sm text-[#53635b]">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatProductPrice(subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>{deliveryFee ? formatProductPrice(deliveryFee) : 'Free'}</dd></div>
              <div className="flex justify-between border-t border-[#0b432f]/10 pt-4 text-lg font-bold text-[#0b432f]"><dt>Total</dt><dd>{formatProductPrice(total)}</dd></div>
            </dl>
            <Link to="/checkout" className="mt-6 flex h-12 items-center justify-center rounded-lg bg-[#063c2b] text-sm font-semibold text-white hover:bg-[#0a5039]">
              Checkout securely <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <p className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#7b847f]"><ShieldCheck className="h-4 w-4" /> Prices are verified again by our secure server.</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
