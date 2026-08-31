import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardList, RefreshCw, Search, Trash2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import PageSkeleton from '@/components/shared/PageSkeleton';
import DataTable from '@/components/shared/DataTable';
import MetricCard from '@/components/shared/MetricCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const formatDateTime = (value) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value)) : '—';

export default function SystemLog() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const loadEvents = async () => { setLoading(true); try { setEvents(await base44.activityLog.list()); } finally { setLoading(false); } };
  useEffect(() => { loadEvents(); }, []);
  const errors = events.filter((event) => event.action === 'error');
  const visibleEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events.filter((event) => (!showErrors || event.action === 'error') && (!term || [event.action, event.target, event.record_id, event.actor, event.error_code, event.error_message, event.path].filter(Boolean).join(' ').toLowerCase().includes(term)));
  }, [events, search, showErrors]);
  const canDelete = ['super_admin', 'admin'].includes(user?.role);
  const deleteEvent = async (event) => {
    if (!window.confirm('Permanently delete this system log entry? This cannot be undone.')) return;
    await base44.activityLog.delete(event.id);
    setEvents((current) => current.filter((item) => item.id !== event.id));
    setSelectedIds((current) => current.filter((id) => id !== event.id));
  };
  const deleteSelected = async () => {
    if (!selectedIds.length || !window.confirm(`Permanently delete ${selectedIds.length} selected system log ${selectedIds.length === 1 ? 'entry' : 'entries'}? This cannot be undone.`)) return;
    const result = await base44.activityLog.deleteMany(selectedIds);
    const deletedIds = result?.deletedIds || selectedIds;
    setEvents((current) => current.filter((item) => !deletedIds.includes(item.id)));
    setSelectedIds([]);
  };
  return <div>
    <PageHeader title="System Log" description="Platform activity and signed-in application errors, with exact timestamps and error details."><Button variant="outline" size="sm" onClick={loadEvents} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button></PageHeader>
    <div className="grid gap-4 sm:grid-cols-3"><MetricCard title="Logged events" value={events.length} icon={ClipboardList} color="primary" /><MetricCard title="Errors recorded" value={errors.length} icon={AlertTriangle} color="red" /><MetricCard title="Latest event" value={events[0] ? formatDateTime(events[0].timestamp) : '—'} icon={RefreshCw} color="blue" /></div>
    <div className="mt-6 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search action, record, user, error code, or message…" /></div><Button variant={showErrors ? 'default' : 'outline'} onClick={() => setShowErrors((value) => !value)}><AlertTriangle className="mr-2 h-4 w-4" /> {showErrors ? 'Showing errors' : 'Errors only'}</Button></div>
    <div className="mt-4">{loading ? <PageSkeleton contentOnly /> : <>{canDelete && selectedIds.length > 0 && <div className="mb-3 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"><span className="text-sm font-medium">{selectedIds.length} selected</span><Button type="button" variant="destructive" size="sm" onClick={deleteSelected}><Trash2 className="mr-2 h-4 w-4" /> Delete selected</Button></div>}<DataTable items={visibleEvents} emptyMessage="No activity matches these filters." columns={[
      { key: 'timestamp', label: 'Date & time', render: (value) => formatDateTime(value) },
      { key: 'action', label: 'Activity', render: (value) => value === 'error' ? 'Error' : String(value || '').replace(/^./, (letter) => letter.toUpperCase()) },
      { key: 'target', label: 'Area' }, { key: 'record_id', label: 'Record' }, { key: 'actor', label: 'Performed by' },
      { key: 'error_code', label: 'Error code' }, { key: 'error_message', label: 'Exact error', render: (value, item) => value ? <span title={item.path || undefined}>{value}</span> : '—' },
    ]} selectable={canDelete} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} rowActions={canDelete ? (event) => <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteEvent(event)} aria-label={`Permanently delete system log entry from ${formatDateTime(event.timestamp)}`} title="Permanently delete"><Trash2 className="h-4 w-4" /></Button> : undefined} /></>}</div>
  </div>;
}
