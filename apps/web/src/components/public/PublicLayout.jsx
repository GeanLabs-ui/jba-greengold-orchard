import React from 'react';
import { useLocation } from 'react-router-dom';
import RouteContent from '@/components/shared/RouteContent';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import CartDrawer from '@/components/commerce/CartDrawer';

export default function PublicLayout() {
  const location = useLocation();
  const isDeliveryReference = location.pathname === '/supply';
  if (location.pathname === '/about') {
    return <div className="public-shell about-reference-shell"><PublicNavbar /><main><RouteContent /></main><PublicFooter /><CartDrawer /></div>;
  }

  if (isDeliveryReference) {
    return (
      <div className="public-shell delivery-logistics-shell min-h-screen bg-white">
        <PublicNavbar />
        <main>
          <RouteContent />
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
        <RouteContent />
      </main>
      <PublicFooter workingLinks={location.pathname === '/sustainability'} />
      <CartDrawer />
    </div>
  );
}
