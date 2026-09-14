import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import CartDrawer from '@/components/commerce/CartDrawer';

export default function PublicLayout() {
  const location = useLocation();
  const isDeliveryReference = location.pathname === '/supply';
  if (location.pathname === '/about') {
    return <div className="public-shell about-reference-shell"><PublicNavbar /><main><Outlet /></main><PublicFooter /><CartDrawer /></div>;
  }

  if (isDeliveryReference) {
    return (
      <div className="public-shell delivery-logistics-shell min-h-screen bg-white">
        <PublicNavbar />
        <main>
          <Outlet />
        </main>
        <PublicFooter />
        <CartDrawer />
      </div>
    );
  }

  return (
    <div className={`public-shell app-surface flex min-h-screen flex-col ${location.pathname === '/sustainability' ? 'sustainability-shell' : ''}`}>
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter workingLinks={location.pathname === '/sustainability'} />
      <CartDrawer />
    </div>
  );
}
