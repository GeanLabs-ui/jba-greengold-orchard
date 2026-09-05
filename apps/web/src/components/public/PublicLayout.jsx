import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import CartDrawer from '@/components/commerce/CartDrawer';

export default function PublicLayout() {
  const location = useLocation();
  const isDeliveryReference = location.pathname === '/supply';

  if (isDeliveryReference) {
    return (
      <div className="public-shell delivery-logistics-shell min-h-screen bg-white">
        <PublicNavbar />
        <main>
          <Outlet />
        </main>
        <CartDrawer />
      </div>
    );
  }

  return (
    <div className="public-shell app-surface flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
      <CartDrawer />
    </div>
  );
}
