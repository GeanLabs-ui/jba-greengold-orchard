import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Leaf, LayoutDashboard, ShoppingCart, CreditCard, FileText, LogOut, Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { label: 'Dashboard', path: '/portal', icon: LayoutDashboard },
  { label: 'My Orders', path: '/portal/orders', icon: ShoppingCart },
  { label: 'Payments', path: '/portal/payments', icon: CreditCard },
  { label: 'Documents', path: '/portal/documents', icon: FileText },
];

function SidebarContent() {
  const location = useLocation();
  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link key={item.path} to={item.path} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function PortalLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-mango"><Leaf className="h-4 w-4 text-white" /></div>
          <div><p className="font-heading text-sm font-bold">MangoOps</p><p className="text-xs text-muted-foreground">Customer Portal</p></div>
        </div>
        <div className="flex-1"><SidebarContent /></div>
        <div className="border-t border-border p-3">
          <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <LogOut className="h-4 w-4" /> Back to Website
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4 md:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><button className="lg:hidden"><Menu className="h-5 w-5" /></button></SheetTrigger>
            <SheetContent side="left" className="w-64 p-0"><div className="flex h-16 items-center gap-2 border-b border-border px-6"><div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-mango"><Leaf className="h-4 w-4 text-white" /></div><span className="font-heading text-sm font-bold">MangoOps Portal</span></div><SidebarContent /></SheetContent>
          </Sheet>
          <h1 className="font-heading text-lg font-semibold">My Account</h1>
          <div className="ml-auto flex items-center gap-3">
            <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-mango text-sm font-semibold text-white">C</div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}