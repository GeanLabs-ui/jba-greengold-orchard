import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import AdminMobileNav from './AdminMobileNav';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { canAccessAdminPath, defaultAdminPath } from '@/lib/access-control';

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const canAccessPage = canAccessAdminPath(user, location.pathname);

  useEffect(() => {
    document.documentElement.classList.add('admin-theme');
    return () => document.documentElement.classList.remove('admin-theme');
  }, []);

  return (
    <div className="admin-shell flex h-[100dvh] overflow-hidden bg-background md:h-screen">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-[min(19rem,86vw)] flex-col bg-[#0b432f] p-0 text-white">
          <SheetHeader className="shrink-0 border-b border-white/10 px-4 py-4">
            <SheetTitle className="text-left text-white">Admin navigation</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pb-16">
            <AdminSidebar />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 pb-24 md:p-6">
          {canAccessPage ? <Outlet /> : (
            <div className="grid min-h-[60vh] place-items-center">
              <div className="max-w-md text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive"><ShieldX className="h-6 w-6" /></span>
                <p className="mt-4 font-heading text-xl font-semibold">Page access is turned off</p>
                <p className="mt-2 text-sm text-muted-foreground">Your staff profile does not allow access to this workspace page.</p>
                <Button asChild className="mt-5"><Link to={defaultAdminPath(user)}>Go to an available page</Link></Button>
              </div>
            </div>
          )}
        </main>
      </div>
      <AdminMobileNav user={user} onMore={() => setMobileOpen(true)} />
    </div>
  );
}
