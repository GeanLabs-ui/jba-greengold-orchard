import React, { useEffect, useMemo, useState } from 'react';
import { Bell, LogOut, Menu, RefreshCw, Search, Trash2, UserRoundCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '@/components/shared/BrandLogo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { timeAgo } from '@/components/shared/format';
import { getSafeRedirectTarget } from '@/lib/safe-redirect';
import { canAccessAdminPath, defaultAdminPath } from '@/lib/access-control';
import AdminHorizontalNav from './AdminHorizontalNav';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const adminDestinations = [
  ['Dashboard', '/admin', 'overview summary performance kpi'], ['CRM', '/admin/crm', 'customer contact'],
  ['Client inquiries', '/admin/inquiries', 'website messages leads contact support partnership'],
  ['Sales', '/admin/sales', 'invoice payment quotation return'], ['Orders', '/admin/orders', 'website fulfillment'],
  ['Inventory', '/admin/inventory', 'stock warehouse movement'], ['Logistics', '/admin/logistics', 'delivery vehicle dispatch'],
  ['Production calendar', '/admin/calendar', 'schedule task reminder activity google outlook business calendar'],
  ['Daily activities', '/admin/farm-daily-activities/activities/overview', 'routine worker farm report'], ['Finance', '/admin/finance', 'expense revenue profit'],
  ['Procurement', '/admin/procurement', 'supplier purchase order'], ['Export operations', '/admin/export-ops', 'shipment export'],
  ['Human resources', '/admin/hr', 'employee attendance'], ['Applications', '/admin/applications', 'career applicant'],
  ['Content', '/admin/content', 'website product news'], ['Documents', '/admin/documents', 'certificate notification'],
  ['Reports', '/admin/reports', 'analytics'], ['Settings', '/admin/settings', 'configuration user access'],
];

export default function AdminTopbar({ onMenuClick }) {
  const { user, logout, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const loadNotifications = () => base44.entities.Notification.list('-created_date', 20).then((items) => setNotifications(items || [])).catch(() => {});
  useEffect(() => {
    loadNotifications();
    const unsubscribe = subscribeToDataChanges(loadNotifications, ['Notification', 'Order', 'Invoice', 'Payment', 'Inquiry', 'CalendarEvent']);
    const interval = window.setInterval(loadNotifications, 30000);
    return () => { clearInterval(interval); unsubscribe(); };
  }, []);

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return adminDestinations
      .filter(([, path]) => canAccessAdminPath(user, path))
      .filter(([label, _path, keywords]) => `${label} ${keywords}`.toLowerCase().includes(term))
      .slice(0, 6);
  }, [search, user]);
  const unread = notifications.filter((item) => !['read', 'archived'].includes(item.status)).length;

  const runSearch = (event) => {
    event.preventDefault();
    if (!searchResults[0]) return;
    navigate(searchResults[0][1]);
    setSearch('');
    setMobileSearchOpen(false);
  };
  const selectSearchResult = (path) => {
    navigate(path);
    setSearch('');
    setMobileSearchOpen(false);
  };
  const refreshCurrentPage = () => window.location.reload();
  const openNotification = async (notification) => {
    setNotifOpen(false);
    if (notification.status !== 'read') await base44.entities.Notification.update(notification.id, { status: 'read', read_date: new Date().toISOString() }).catch(() => {});
    const safeDestination = typeof notification.destination === 'string' && !notification.destination.includes('\\')
      ? getSafeRedirectTarget(notification.destination, '')
      : '';
    let destination = '/admin/documents';
    if (safeDestination.startsWith('/admin/')) destination = safeDestination;
    else if (notification.inquiry_id || notification.type === 'inquiry') destination = `/admin/inquiries${notification.inquiry_id ? `?inquiry=${encodeURIComponent(notification.inquiry_id)}` : ''}`;
    else if (notification.order_number || notification.type === 'order') destination = `/admin/orders${notification.order_id ? `?order=${encodeURIComponent(notification.order_id)}` : ''}`;
    else if (notification.invoice_number || notification.type === 'payment') destination = `/admin/sales${notification.invoice_number ? `?invoice=${encodeURIComponent(notification.invoice_number)}` : ''}`;
    navigate(canAccessAdminPath(user, destination) ? destination : defaultAdminPath(user));
  };
  const deleteNotification = async (notification) => {
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    await base44.entities.Notification.delete(notification.id).catch(loadNotifications);
  };
  const displayName = user?.full_name || user?.email || 'Admin User';
  const openProfile = () => {
    setProfileName(user?.full_name || '');
    setProfileOpen(true);
  };
  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile({ fullName: profileName });
      toast({ title: 'Profile updated' });
      setProfileOpen(false);
    } catch (error) {
      toast({ title: 'Could not update profile', description: error?.message, variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <header className="sticky top-0 z-[60] flex h-16 items-center gap-2 border-b border-border bg-card/95 px-3 backdrop-blur sm:gap-3 sm:px-4 md:px-6">
      <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors hover:bg-muted xl:hidden" onClick={onMenuClick} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
      <BrandLogo className="flex h-12 w-[104px] shrink-0 xl:hidden" imageClassName="h-9 max-w-[104px] sm:h-10" />
      <BrandLogo className="hidden h-12 w-[92px] shrink-0 xl:flex" imageClassName="h-10 max-w-[92px] sm:h-10" />
      <AdminHorizontalNav />
      <form onSubmit={runSearch} className="relative hidden min-w-48 max-w-sm flex-1 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search admin tools…" className="border-0 bg-muted/50 pl-9" />
        {search && <div className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          {searchResults.length ? searchResults.map(([label, path]) => <button key={path} type="button" onClick={() => { navigate(path); setSearch(''); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"><Search className="h-3.5 w-3.5 text-muted-foreground" />{label}</button>) : <p className="px-4 py-3 text-sm text-muted-foreground">No matching admin page</p>}
        </div>}
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileSearchOpen(true)} aria-label="Search admin tools" title="Search admin tools">
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={refreshCurrentPage} aria-label="Refresh current page" title="Refresh current page">
          <RefreshCw className="h-5 w-5" />
        </Button>
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setNotifOpen((open) => !open)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
            <Bell className="h-5 w-5" />{unread > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-white">{unread > 9 ? '9+' : unread}</span>}
          </Button>
          {notifOpen && <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3"><p className="text-sm font-semibold">Notifications</p><span className="text-xs text-muted-foreground">{unread} unread</span></div>
            <div className="max-h-80 overflow-y-auto p-2">{notifications.length ? notifications.map((notification) => <div key={notification.id} className={`group flex rounded-md hover:bg-muted ${notification.status === 'read' ? 'opacity-65' : ''}`}><button type="button" onClick={() => openNotification(notification)} className="min-w-0 flex-1 px-3 py-2.5 text-left"><span className="flex items-start justify-between gap-3"><span className="text-sm font-medium">{notification.title}</span>{notification.status !== 'read' && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{notification.message}</span><span className="mt-1 block text-[11px] text-muted-foreground">{timeAgo(notification.created_date)}</span></button>{notification.status === 'read' && <Button type="button" variant="ghost" size="icon" onClick={() => deleteNotification(notification)} className="mr-1 mt-1.5 h-8 w-8 shrink-0" aria-label={`Delete notification: ${notification.title}`} title="Delete notification"><Trash2 className="h-4 w-4" /></Button>}</div>) : <p className="px-3 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>}</div>
          </div>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-2 rounded-lg p-1 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" aria-label="Open account menu">
              <span className="admin-avatar flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold">{displayName[0].toUpperCase()}</span>
              <span className="hidden md:block"><span className="block text-sm font-medium leading-tight">{displayName}</span><span className="block text-xs capitalize text-muted-foreground">{String(user?.role || 'admin').replaceAll('_', ' ')}</span></span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 p-1.5">
            <DropdownMenuLabel className="px-2 py-2"><span className="block truncate text-sm font-semibold">{displayName}</span><span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">{user?.email}</span></DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={openProfile} className="cursor-pointer py-2"><UserRoundCog className="h-4 w-4 text-emerald-700" />Profile setup</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { void logout(); }} className="cursor-pointer py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"><LogOut className="h-4 w-4" />Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Sheet open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <SheetContent side="bottom" className="max-h-[82dvh] rounded-t-2xl px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-7 md:hidden">
          <SheetHeader className="text-left">
            <SheetTitle>Find an admin tool</SheetTitle>
          </SheetHeader>
          <form onSubmit={runSearch} className="mt-4">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pages and tools" className="h-12 bg-muted/50 pl-10 text-base" />
            </label>
          </form>
          <div className="mt-4 max-h-[48dvh] overflow-y-auto">
            {search.trim() ? (
              searchResults.length ? searchResults.map(([label, path]) => <button key={path} type="button" onClick={() => selectSearchResult(path)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-muted"><Search className="h-4 w-4 text-primary" />{label}</button>) : <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matching admin tools.</p>
            ) : <p className="px-3 py-5 text-sm text-muted-foreground">Search only the pages your role can access.</p>}
          </div>
        </SheetContent>
      </Sheet>
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile setup</DialogTitle>
            <DialogDescription>Set the name shown in your workspace account menu.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <Label htmlFor="profile-full-name">Display name</Label>
              <Input id="profile-full-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Your name" required autoFocus />
            </div>
            <div>
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" value={user?.email || ''} disabled />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProfileOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
