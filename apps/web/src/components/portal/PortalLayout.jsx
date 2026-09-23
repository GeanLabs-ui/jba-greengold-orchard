import React, { useRef } from 'react';
import usePinnedPageNavigation from '@/components/shared/usePinnedPageNavigation';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, ShoppingBag, Truck, CreditCard, FileText, LogOut, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/shared/BrandLogo';
import AccountMenu from './AccountMenu';
import { useCart } from '@/lib/CartContext';
import CartDrawer from '@/components/commerce/CartDrawer';
import './portal-layout.css';

const navItems = [
  { label: 'Dashboard', path: '/portal', icon: LayoutDashboard },
  { label: 'Products', path: '/portal/products', icon: ShoppingBag },
  { label: 'My Orders', path: '/portal/orders', icon: ShoppingCart },
  { label: 'Tracking', path: '/portal/tracking', icon: Truck },
  { label: 'Payments', path: '/portal/payments', icon: CreditCard },
  { label: 'Documents', path: '/portal/documents', icon: FileText },
];

export default function PortalLayout() {
  const { itemCount, openCart } = useCart();
  const navigationRoot = useRef(null);
  const location = useLocation();
  usePinnedPageNavigation(navigationRoot, location.pathname);

  return (
    <div className="portal-shell app-surface flex min-h-dvh min-w-0 flex-col bg-muted/30">
      <header className="portal-topbar sticky top-0 z-40 border-b border-[#355e3b] bg-[#123524] text-white">
        <div className="portal-header-row flex min-h-16 items-center gap-3 px-4 md:px-6">
          <Link to="/" aria-label="JBA GreenGold Orchard home" className="flex shrink-0 items-center"><BrandLogo light className="h-12 w-[132px]" /></Link>
        <nav className="portal-horizontal-menu flex min-w-0 flex-1 gap-1 overflow-x-auto py-2" aria-label="Customer portal navigation">
          {navItems.map(({ label, path, icon: Icon }, index) => (
            <NavLink key={path} to={path} end={path === '/portal'} className="portal-nav-link flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors motion-reduce:transition-none md:px-2">
              <Icon className="h-4 w-4" aria-hidden="true" /><span className="hidden md:inline">{label}</span><span className="md:hidden">{['Home', 'Shop', 'Orders', 'Tracking', 'Payments', 'Docs'][index]}</span>
            </NavLink>
          ))}
          <button type="button" onClick={openCart} className="portal-nav-link ml-auto hidden min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors motion-reduce:transition-none md:flex" aria-label={`Open basket, ${itemCount} items`}>
            <ShoppingCart className="h-4 w-4" aria-hidden="true" /><span aria-live="polite" aria-atomic="true">Basket ({itemCount})</span>
          </button>
        </nav>
          <div className="portal-topbar-actions ml-auto flex shrink-0 items-center gap-2 md:gap-3">
            <Link to="/" className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Back to Website
            </Link>
            <Button variant="ghost" size="icon" className="relative md:hidden" onClick={openCart} aria-label={`Open basket, ${itemCount} items`}><ShoppingCart className="h-5 w-5" />{itemCount > 0 && <span className="absolute right-0 top-0 rounded-full bg-primary px-1 text-xs text-primary-foreground">{itemCount}</span>}</Button>
            <Button variant="ghost" size="icon" className="hidden md:inline-flex" aria-label="Notifications"><Bell className="h-5 w-5" /></Button>
            <AccountMenu />
          </div>
        </div>

      </header>
      <main ref={navigationRoot} className="portal-scroll-content min-w-0 flex-1 p-4 pb-24 md:p-6"><Outlet /></main>
      <CartDrawer />
    </div>
  );
}
