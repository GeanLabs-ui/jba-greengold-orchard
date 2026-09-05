import React from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
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

  return (
    <div className="portal-shell app-surface flex min-h-dvh min-w-0 flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex min-h-16 items-center gap-3 px-4 md:gap-6 md:px-6">
          <Link to="/" aria-label="JBA GreenGold Orchard home" className="shrink-0"><BrandLogo className="h-12 md:h-16" imageClassName="h-10 w-20 sm:h-12 sm:w-28" /></Link>
          <h1 className="border-l border-border pl-3 font-heading text-base font-semibold md:pl-6 md:text-lg">My Account</h1>
          <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
            <Link to="/" className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Back to Website
            </Link>
            <Button variant="ghost" size="icon" aria-label="Notifications"><Bell className="h-5 w-5" /></Button>
            <AccountMenu />
          </div>
        </div>
        <nav className="portal-horizontal-menu flex gap-1 overflow-x-auto px-3 py-2 md:px-6" aria-label="Customer portal navigation">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === '/portal'} className="portal-nav-link flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors motion-reduce:transition-none md:px-4">
              <Icon className="h-4 w-4" aria-hidden="true" />{label}
            </NavLink>
          ))}
          <button type="button" onClick={openCart} className="portal-nav-link ml-auto flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors motion-reduce:transition-none" aria-label={`Open basket, ${itemCount} items`}>
            <ShoppingCart className="h-4 w-4" aria-hidden="true" /><span aria-live="polite" aria-atomic="true">Basket ({itemCount})</span>
          </button>
          <Link to="/" className="portal-nav-link flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors motion-reduce:transition-none md:hidden">
            <LogOut className="h-4 w-4" aria-hidden="true" /> Back to Website
          </Link>
        </nav>
      </header>
      <main className="min-w-0 flex-1 p-4 pb-24 md:p-6"><Outlet /></main>
      <CartDrawer />
    </div>
  );
}
