import React, { useState } from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

export default function AdminTopbar({ onMenuClick }) {
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/95 px-4 backdrop-blur md:px-6">
      <button className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative hidden flex-1 max-w-md md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search anything..." className="pl-9 bg-muted/50 border-0" />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setNotifOpen(!notifOpen)}>
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
          </Button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-card shadow-lg">
              <div className="border-b border-border px-4 py-3">
                <p className="font-semibold text-sm">Notifications</p>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                <div className="rounded-md px-3 py-2 hover:bg-muted cursor-pointer">
                  <p className="text-sm font-medium">New inquiry received</p>
                  <p className="text-xs text-muted-foreground">2 minutes ago</p>
                </div>
                <div className="rounded-md px-3 py-2 hover:bg-muted cursor-pointer">
                  <p className="text-sm font-medium">Low stock alert: Kent Mango</p>
                  <p className="text-xs text-muted-foreground">1 hour ago</p>
                </div>
                <div className="rounded-md px-3 py-2 hover:bg-muted cursor-pointer">
                  <p className="text-sm font-medium">Payment received: UGX 2.5M</p>
                  <p className="text-xs text-muted-foreground">3 hours ago</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-mango text-sm font-semibold text-white">
            {(user?.full_name || 'A')[0]}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium leading-tight">{user?.full_name || 'Admin User'}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role || 'admin'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}