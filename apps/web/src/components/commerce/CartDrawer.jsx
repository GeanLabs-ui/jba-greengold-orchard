import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { formatProductPrice } from '@/data/productCatalog';

export default function CartDrawer() {
  const {
    lines,
    itemCount,
    subtotal,
    deliveryFee,
    total,
    isCartOpen,
    lastAddedId,
    setQuantity,
    removeItem,
    closeCart,
  } = useCart();
  const reduceMotion = useReducedMotion();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    closeCart();
  }, [location.pathname, closeCart]); // close the overlay after any cart-driven navigation

  const continueToCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  if (!isCartOpen) return null;

  return (
        <>
          <motion.button
            type="button"
            aria-label="Close basket"
            className="fixed inset-0 z-[70] cursor-default bg-[#071c15]/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col bg-[#fffdf7] shadow-[-20px_0_60px_rgba(7,28,21,0.18)]"
            initial={reduceMotion ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 310, damping: 32 }}
          >
            <header className="flex h-[4.5rem] items-center border-b border-[#0b432f]/10 px-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a66b0b]">Your selection</p>
                <h2 id="cart-title" className="mt-1 font-heading text-xl font-semibold text-[#0b432f]">
                  Basket <span className="text-sm font-normal text-[#68756e]">({itemCount})</span>
                </h2>
              </div>
              <button type="button" onClick={closeCart} className="ml-auto grid h-10 w-10 place-items-center rounded-full border border-[#0b432f]/10 text-[#0b432f] hover:bg-[#0b432f]/5">
                <X className="h-5 w-5" />
              </button>
            </header>

            {lines.length ? (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-3">
                  {lines.map((line) => (
                    <motion.article
                      layout
                      key={line.id}
                      animate={lastAddedId === line.id ? { backgroundColor: ['#fffdf7', '#fff2d6', '#fffdf7'] } : {}}
                      className="grid grid-cols-[5.25rem_1fr] gap-4 border-b border-[#0b432f]/10 py-5"
                    >
                      <div className="grid h-20 place-items-center overflow-hidden rounded-xl bg-white">
                        <img src={line.image} alt="" className="h-full w-full object-contain p-1" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-start gap-2">
                          <div>
                            <h3 className="font-heading text-sm font-semibold text-[#0b432f]">{line.name}</h3>
                            <p className="mt-1 text-xs text-[#68756e]">{formatProductPrice(line.price)} each</p>
                          </div>
                          <button type="button" onClick={() => removeItem(line.id)} className="ml-auto text-[#8b968f] hover:text-red-600" aria-label={`Remove ${line.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="inline-flex items-center rounded-full border border-[#0b432f]/15 bg-white">
                            <button type="button" className="grid h-8 w-8 place-items-center" onClick={() => setQuantity(line.id, line.quantity - 1)} aria-label={`Decrease ${line.name}`}>
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-7 text-center text-xs font-semibold">{line.quantity}</span>
                            <button type="button" className="grid h-8 w-8 place-items-center" onClick={() => setQuantity(line.id, line.quantity + 1)} aria-label={`Increase ${line.name}`}>
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <strong className="text-sm text-[#0b432f]">{formatProductPrice(line.lineTotal)}</strong>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </div>
                <footer className="border-t border-[#0b432f]/10 bg-white px-5 py-5">
                  <div className="space-y-2 text-sm text-[#53635b]">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatProductPrice(subtotal)}</span></div>
                    <div className="flex justify-between"><span>Delivery</span><span>{deliveryFee ? formatProductPrice(deliveryFee) : 'Free'}</span></div>
                    <div className="flex justify-between border-t border-[#0b432f]/10 pt-3 text-base font-bold text-[#0b432f]"><span>Total</span><span>{formatProductPrice(total)}</span></div>
                  </div>
                  <button type="button" onClick={continueToCheckout} className="mt-5 flex h-12 w-full items-center justify-center rounded-lg bg-[#063c2b] text-sm font-semibold text-white hover:bg-[#0a5039]">
                    Continue to checkout
                  </button>
                  <Link to="/cart" onClick={closeCart} className="mt-2 flex h-10 items-center justify-center text-xs font-semibold text-[#a66b0b] hover:underline">
                    View full basket
                  </Link>
                </footer>
              </>
            ) : (
              <div className="grid flex-1 place-items-center px-8 text-center">
                <div>
                  <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#0b432f]/6 text-[#0b432f]">
                    <ShoppingBag className="h-8 w-8" strokeWidth={1.4} />
                  </span>
                  <h3 className="mt-6 font-heading text-2xl font-semibold text-[#0b432f]">Your basket is empty</h3>
                  <p className="mt-2 text-sm leading-6 text-[#68756e]">Choose from fresh mango boxes, drinks, preserves, dried fruit, and gift packs.</p>
                  <Link to="/products" onClick={closeCart} className="mt-6 inline-flex rounded-lg bg-[#063c2b] px-6 py-3 text-sm font-semibold text-white">
                    Shop products
                  </Link>
                </div>
              </div>
            )}
          </motion.aside>
        </>
  );
}
