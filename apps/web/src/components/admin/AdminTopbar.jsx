import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Menu, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { timeAgo } from '@/components/shared/format';
import { getSafeRedirectTarget } from '@/lib/safe-redirect';
import { canAccessAdminPath, defaultAdminPath } from '@/lib/access-control';

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState('');

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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/95 px-4 backdrop-blur md:px-6">
      <button type="button" className="lg:hidden" onClick={onMenuClick} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
      <form onSubmit={runSearch} className="relative hidden max-w-md flex-1 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search admin tools…" className="border-0 bg-muted/50 pl-9" />
        {search && <div className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          {searchResults.length ? searchResults.map(([label, path]) => <button key={path} type="button" onClick={() => { navigate(path); setSearch(''); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"><Search className="h-3.5 w-3.5 text-muted-foreground" />{label}</button>) : <p className="px-4 py-3 text-sm text-muted-foreground">No matching admin page</p>}
        </div>}
      </form>

      <div className="ml-auto flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={refreshCurrentPage} aria-label="Refresh current page" title="Refresh current page">
          <RefreshCw className="h-5 w-5" />
        </Button>
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setNotifOpen((open) => !open)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
            <Bell className="h-5 w-5" />{unread > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-white">{unread > 9 ? '9+' : unread}</span>}
          </Button>
          {notifOpen && <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3"><p className="text-sm font-semibold">Notifications</p><span className="text-xs text-muted-foreground">{unread} unread</span></div>
            <div className="max-h-80 overflow-y-auto p-2">{notifications.length ? notifications.map((notification) => <button key={notification.id} type="button" onClick={() => openNotification(notification)} className={`block w-full rounded-md px-3 py-2.5 text-left hover:bg-muted ${notification.status === 'read' ? 'opacity-65' : ''}`}><span className="flex items-start justify-between gap-3"><span className="text-sm font-medium">{notification.title}</span>{notification.status !== 'read' && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{notification.message}</span><span className="mt-1 block text-[11px] text-muted-foreground">{timeAgo(notification.created_date)}</span></button>) : <p className="px-3 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>}</div>
          </div>}
        </div>
        <div className="flex items-center gap-2"><div className="admin-avatar flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold">{(user?.full_name || user?.email || 'A')[0].toUpperCase()}</div><div className="hidden md:block"><p className="text-sm font-medium leading-tight">{user?.full_name || user?.email || 'Admin User'}</p><p className="text-xs capitalize text-muted-foreground">{String(user?.role || 'admin').replaceAll('_', ' ')}</p></div></div>
      </div>
    </header>
  );
}
