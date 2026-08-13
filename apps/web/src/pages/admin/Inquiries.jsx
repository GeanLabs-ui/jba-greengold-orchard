import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Inbox, Mail, MessageSquareText, Phone, Search, UserRoundCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import StatusBadge from '@/components/shared/StatusBadge';
import DataTable from '@/components/shared/DataTable';
import { formatDateTime, timeAgo } from '@/components/shared/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';

const statusOptions = ['all', 'new', 'in_progress', 'resolved', 'closed'];
const humanize = (value) => String(value || 'general').replaceAll('_', ' ');

export default function Inquiries() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inquiries, setInquiries] = useState([]);
  const [selectedId, setSelectedId] = useState(searchParams.get('inquiry') || '');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const records = await base44.entities.Inquiry.list('-created_date', 250);
      setInquiries(records || []);
      const requestedId = searchParams.get('inquiry');
      if (requestedId && records.some((item) => item.id === requestedId)) setSelectedId(requestedId);
      else if (!selectedId && records[0]) setSelectedId(records[0].id);
    } catch (loadError) {
      setError(loadError.message || 'Client inquiries could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    let timer;
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = setTimeout(load, 120);
    }, ['Inquiry']);
    return () => { clearTimeout(timer); unsubscribe(); };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return inquiries.filter((inquiry) => {
      const matchesStatus = status === 'all' || inquiry.status === status;
      const matchesSearch = !term || [inquiry.name, inquiry.email, inquiry.phone, inquiry.company, inquiry.subject, inquiry.message, inquiry.inquiry_type]
        .some((value) => String(value || '').toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [inquiries, search, status]);

  const selected = inquiries.find((inquiry) => inquiry.id === selectedId) || null;
  const selectInquiry = (inquiry) => {
    setSelectedId(inquiry.id);
    setSearchParams({ inquiry: inquiry.id }, { replace: true });
  };

  const updateStatus = async (nextStatus) => {
    if (!selected || selected.status === nextStatus) return;
    setUpdating(true);
    try {
      const updated = await base44.entities.Inquiry.update(selected.id, {
        status: nextStatus,
        last_action_date: new Date().toISOString(),
        ...(nextStatus === 'resolved' ? { resolved_date: new Date().toISOString() } : {}),
      });
      setInquiries((current) => current.map((item) => item.id === selected.id ? { ...item, ...updated } : item));
      toast({ title: `Inquiry marked ${humanize(nextStatus)}` });
    } catch (updateError) {
      toast({ title: 'Inquiry could not be updated', description: updateError.message, variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const counts = {
    all: inquiries.length,
    new: inquiries.filter((item) => item.status === 'new').length,
    inProgress: inquiries.filter((item) => item.status === 'in_progress').length,
    resolved: inquiries.filter((item) => ['resolved', 'closed'].includes(item.status)).length,
  };

  return (
    <div>
      {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={Inbox} label="All inquiries" value={counts.all} />
        <Summary icon={MessageSquareText} label="New" value={counts.new} tone="text-blue-700" />
        <Summary icon={Clock3} label="In follow-up" value={counts.inProgress} tone="text-amber-700" />
        <Summary icon={CheckCircle2} label="Resolved" value={counts.resolved} tone="text-emerald-700" />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sender, subject, email, company, or message…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{statusOptions.map((option) => <SelectItem key={option} value={option}>{option === 'all' ? 'All statuses' : humanize(option)}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.75fr)]">
        {loading ? <div className="h-80 animate-pulse rounded-xl bg-muted" /> : (
          <DataTable
            items={filtered}
            selectedId={selectedId}
            onRowClick={selectInquiry}
            emptyMessage="No client inquiries match these filters."
            columns={[
              { key: 'subject', label: 'Subject', render: (value, inquiry) => <div><p className="font-semibold">{value || 'Website inquiry'}</p><p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{inquiry.message}</p></div> },
              { key: 'name', label: 'Client', render: (value, inquiry) => <div><p>{value}</p><p className="mt-0.5 text-xs text-muted-foreground">{inquiry.email}</p></div> },
              { key: 'inquiry_type', label: 'Type', render: (value) => <span className="capitalize">{humanize(value)}</span> },
              { key: 'created_date', label: 'Received', render: (value) => <div><p>{timeAgo(value)}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(value)}</p></div> },
              { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value || 'new'} /> },
            ]}
          />
        )}

        <aside className="h-fit rounded-xl border border-border bg-card shadow-sm xl:sticky xl:top-20">
          {selected ? <>
            <div className="border-b border-border p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">{humanize(selected.inquiry_type)}</p><h2 className="mt-2 font-heading text-xl font-semibold">{selected.subject || 'Website inquiry'}</h2></div><StatusBadge status={selected.status || 'new'} /></div>
              <p className="mt-3 text-xs text-muted-foreground">Received {formatDateTime(selected.created_date)} · {selected.source_page || 'Website'}</p>
            </div>
            <div className="space-y-5 p-5">
              <div><p className="font-semibold">{selected.name}</p>{selected.company && <p className="text-sm text-muted-foreground">{selected.company}</p>}<div className="mt-3 space-y-2 text-sm"><a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-primary hover:underline"><Mail className="h-4 w-4" />{selected.email}</a>{selected.phone && <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-primary hover:underline"><Phone className="h-4 w-4" />{selected.phone}</a>}</div></div>
              <div className="border-t border-border pt-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{selected.message}</p></div>
              <div className="grid gap-2 border-t border-border pt-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {selected.status !== 'in_progress' && selected.status !== 'resolved' && <Button disabled={updating} onClick={() => updateStatus('in_progress')}><UserRoundCheck className="mr-2 h-4 w-4" />Start follow-up</Button>}
                {selected.status !== 'resolved' && <Button disabled={updating} variant="outline" onClick={() => updateStatus('resolved')}><CheckCircle2 className="mr-2 h-4 w-4" />Mark resolved</Button>}
                {selected.status === 'resolved' && <Button disabled={updating} variant="outline" onClick={() => updateStatus('in_progress')}>Reopen inquiry</Button>}
                {selected.status !== 'closed' && <Button disabled={updating} variant="ghost" onClick={() => updateStatus('closed')}>Close</Button>}
              </div>
            </div>
          </> : <div className="p-10 text-center text-sm text-muted-foreground"><Inbox className="mx-auto mb-3 h-8 w-8" />Select an inquiry to see the full message.</div>}
        </aside>
      </div>
    </div>
  );
}

function Summary({ icon: Icon, label, value, tone = '' }) {
  return <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4" />{label}</div><p className={`mt-2 font-heading text-2xl font-bold ${tone}`}>{value}</p></div>;
}
