import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/CartContext';
import CheckoutDialog from '@/components/commerce/CheckoutDialog';
import { commerceRoutes } from '@/lib/commerce-routes';
import { checkoutKey, forgetCheckoutKey } from '@/lib/payment-navigation';
import { hasCustomerAccess } from '@/lib/access-control';
import CustomerAccessDenied from '@/components/CustomerAccessDenied';

const initialShipping = { full_name: '', email: '', phone: '', address: '', city: '', region: '' };

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const routes = commerceRoutes(location.pathname);
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const cart = useCart();
  const { items, clearCart } = cart;
  const [shipping, setShipping] = useState(initialShipping);
  const [paymentMethod, setPaymentMethod] = useState('mobile_money_on_confirmation');
  const [paymentCountry, setPaymentCountry] = useState('GH');
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

  if (isAuthenticated && !hasCustomerAccess(user)) return <CustomerAccessDenied />;

  const placeOrder = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        items: items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
        shipping,
        payment_method: paymentMethod,
        payment_country: paymentCountry,
        notes,
      };
      const order = await base44.commerce.checkoutOrder({ ...payload, checkout_key: await checkoutKey(payload, user?.id) });
      clearCart();
      forgetCheckoutKey(user?.id);
      if (paymentMethod.includes(':')) {
        navigate(`/portal/payments/return?order=${encodeURIComponent(order.id)}&start=1`, { replace: true });
      } else {
        navigate(`${routes.tracking}?placed=${encodeURIComponent(order.order_number)}`, { replace: true });
      }
    } catch (checkoutError) {
      setError(checkoutError.message || 'We could not place your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return <CheckoutDialog routes={routes} isAuthenticated={isAuthenticated} navigateToLogin={navigateToLogin} cart={cart} shipping={shipping} updateShipping={updateShipping} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} paymentCountry={paymentCountry} setPaymentCountry={setPaymentCountry} notes={notes} setNotes={setNotes} submitting={submitting} error={error} placeOrder={placeOrder} />;
}
