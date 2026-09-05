import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  FileText,
  Inbox,
  Mail,
  MessageSquareText,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import StatusBadge from '@/components/shared/StatusBadge';
import PageSkeleton from '@/components/shared/PageSkeleton';
import DataTable from '@/components/shared/DataTable';
import { formatDateTime, timeAgo } from '@/components/shared/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';

const statusOptions = ['all', 'new', 'in_progress', 'resolved', 'closed'];
const humanize = (value) => String(value || 'general').replaceAll('_', ' ');
const identityLabels = {
  legalName: 'Legal name',
  country: 'Issuing country',
  dateOfBirth: 'Date of birth',
  documentType: 'Document type',
  documentNumber: 'Document number',
};

export default function Inquiries() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState(searchParams.get('view') === 'verification' ? 'verification' : 'inquiries');
  const [inquiries, setInquiries] = useState([]);
  const [reviews, setReviews] = useState({ verifications: [], changes: [] });
  const [selectedId, setSelectedId] = useState(searchParams.get('inquiry') || '');
  const [selectedReview, setSelectedReview] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const [inquiryRecords, reviewRecords] = await Promise.all([
        base44.entities.Inquiry.list('-created_date', 250),
        base44.account.reviews(),
      ]);
      setInquiries(inquiryRecords || []);
      setReviews({
        verifications: reviewRecords?.verifications || [],
        changes: reviewRecords?.changes || [],
      });
      const requestedId = searchParams.get('inquiry');
      if (requestedId && inquiryRecords.some((item) => item.id === requestedId)) setSelectedId(requestedId);
      else if (!selectedId && inquiryRecords[0]) setSelectedId(inquiryRecords[0].id);
    } catch (loadError) {
      setError(loadError.message || 'Inquiries and verification requests could not be loaded.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [searchParams, selectedId]);

  useEffect(() => {
    load();
    let timer;
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = setTimeout(() => load({ quiet: true }), 120);
    }, ['Inquiry']);
    const poll = window.setInterval(() => load({ quiet: true }), 30000);
    return () => { clearTimeout(timer); window.clearInterval(poll); unsubscribe(); };
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return inquiries.filter((inquiry) => {
      const matchesStatus = status === 'all' || inquiry.status === status;
      const matchesSearch = !term || [inquiry.name, inquiry.email, inquiry.phone, inquiry.company, inquiry.subject, inquiry.message, inquiry.inquiry_type]
        .some((value) => String(value || '').toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [inquiries, search, status]);

  const filteredVerifications = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reviews.verifications.filter((review) => !term || [
      review.email,
      review.identity?.legalName,
      review.identity?.country,
      review.identity?.documentType,
      review.identity?.documentNumber,
      ...((review.documents || []).map((document) => document.name)),
    ].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [reviews.verifications, search]);

  const selected = inquiries.find((inquiry) => inquiry.id === selectedId) || null;
  const selectInquiry = (inquiry) => {
    setSelectedId(inquiry.id);
    setSearchParams({ inquiry: inquiry.id }, { replace: true });
  };
  const changeView = (nextView) => {
    setView(nextView);
    setSearch('');
    setSearchParams(nextView === 'verification' ? { view: 'verification' } : {}, { replace: true });
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
    verification: reviews.verifications.length,
  };

  return (
    <div>
      {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={Inbox} label="All inquiries" value={counts.all} onClick={() => changeView('inquiries')} active={view === 'inquiries'} />
        <Summary icon={MessageSquareText} label="New inquiries" value={counts.new} tone="text-blue-700" onClick={() => changeView('inquiries')} />
        <Summary icon={Clock3} label="In follow-up" value={counts.inProgress} tone="text-amber-700" onClick={() => changeView('inquiries')} />
        <Summary icon={ShieldCheck} label="Verification reviews" value={counts.verification} tone="text-amber-700" onClick={() => changeView('verification')} active={view === 'verification'} />
      </div>

      <div className="mb-4 flex flex-col gap-3 border-b border-border sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-1" role="tablist" aria-label="Inquiry queues">
          <QueueTab active={view === 'inquiries'} onClick={() => changeView('inquiries')} label="Customer inquiries" count={inquiries.length} />
          <QueueTab active={view === 'verification'} onClick={() => changeView('verification')} label="Verification requests" count={reviews.verifications.length} attention={reviews.verifications.length > 0} />
        </div>
        <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={() => load()} className="mb-2 self-start sm:self-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={view === 'verification' ? 'Search customer, document number, country, or filename…' : 'Search sender, subject, email, company, or message…'} className="pl-9" />
        </div>
        {view === 'inquiries' && <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{statusOptions.map((option) => <SelectItem key={option} value={option}>{option === 'all' ? 'All statuses' : humanize(option)}</SelectItem>)}</SelectContent>
        </Select>}
      </div>

      {view === 'verification' ? (
        <VerificationQueue loading={loading} records={filteredVerifications} onReview={setSelectedReview} changeRequests={reviews.changes} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.75fr)]">
          {loading ? <PageSkeleton contentOnly /> : (
            <DataTable
              items={filtered}
              selectedId={selectedId}
              onRowClick={selectInquiry}
              emptyMessage="No client inquiries match these filters."
              columns={[
                { key: 'subject', label: 'Subject', render: (value, inquiry) => <div><p className="font-semibold">{value || 'Website inquiry'}</p><p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{inquiry.message}</p></div> },
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
      )}

      <VerificationReviewDialog review={selectedReview} onClose={() => setSelectedReview(null)} onReviewed={async () => { setSelectedReview(null); await load({ quiet: true }); }} />
    </div>
  );
}

function VerificationQueue({ loading, records, onReview, changeRequests }) {
  if (loading) return <PageSkeleton contentOnly />;
  return <div className="space-y-6">
    <DataTable
      items={records}
      onRowClick={onReview}
      emptyMessage="No customer verification requests are waiting for review."
      columns={[
        { key: 'email', label: 'Customer', render: (value, record) => <div><p className="font-semibold">{record.identity?.legalName || 'Unnamed customer'}</p><p className="mt-0.5 text-xs text-muted-foreground">{value}</p></div> },
        { key: 'identity', label: 'Identity', render: (value) => <div><p className="capitalize">{humanize(value?.documentType)}</p><p className="mt-0.5 text-xs text-muted-foreground">{value?.country} · {value?.documentNumber}</p></div> },
        { key: 'documents', label: 'Attachments', render: (value) => <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />{value?.length || 0} file{value?.length === 1 ? '' : 's'}</span> },
        { key: 'created_at', label: 'Submitted', render: (value) => <div><p>{timeAgo(value)}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(value)}</p></div> },
        { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value || 'pending'} /> },
      ]}
      rowActions={(record) => <Button type="button" size="sm" variant="outline" onClick={() => onReview(record)}><Eye className="mr-2 h-4 w-4" />Review</Button>}
    />
    {changeRequests.length > 0 && <section className="border-t border-border pt-5">
      <h2 className="font-heading text-lg font-semibold">Customer change requests ({changeRequests.length})</h2>
      <p className="mt-1 text-sm text-muted-foreground">These customers want to correct identity details that are currently locked.</p>
      <div className="mt-3 divide-y rounded-lg border bg-card">{changeRequests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium">{request.email}</p><p className="mt-1 text-sm text-muted-foreground">{request.reason}</p></div><StatusBadge status={request.status} /></div>)}</div>
    </section>}
  </div>;
}

function VerificationReviewDialog({ review, onClose, onReviewed }) {
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setNote(''); setConfirmed(false); setError(''); }, [review?.id]);

  const decide = async (decision) => {
    setBusy(true);
    setError('');
    try {
      await base44.account.review(review.id, { kind: 'verification', decision, note, confirmed });
      toast({
        title: decision === 'approve' ? 'Customer identity verified' : 'Verification rejected',
        description: decision === 'approve' ? 'The verified status is now saved to the customer account.' : 'The customer can now see your reason, correct the details, and submit new documents.',
      });
      await onReviewed();
    } catch (reviewError) {
      setError(reviewError.message || 'The verification decision could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const documents = review?.documents || (review?.document_ids || []).map((id, index) => ({ id, name: `Identity document ${index + 1}`, contentType: '' }));
  return <Dialog open={Boolean(review)} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-h-[92dvh] max-w-[min(96vw,72rem)] overflow-y-auto p-0">
      <DialogHeader className="border-b border-border px-6 py-5 pr-12">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><DialogTitle>Review customer verification</DialogTitle><DialogDescription className="mt-1">{review?.identity?.legalName} · {review?.email}</DialogDescription></div>
          <StatusBadge status="pending" label="Awaiting review" />
        </div>
      </DialogHeader>

      <div className="grid gap-0 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="space-y-5 border-b border-border bg-muted/30 p-6 lg:border-b-0 lg:border-r">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submitted details</p><dl className="mt-4 space-y-3 text-sm">{Object.entries(review?.identity || {}).map(([key, value]) => <div key={key}><dt className="text-xs text-muted-foreground">{identityLabels[key] || humanize(key)}</dt><dd className="mt-0.5 break-words font-medium capitalize">{humanize(value)}</dd></div>)}</dl></div>
          <div className="border-t border-border pt-4"><p className="text-xs text-muted-foreground">Submitted</p><p className="mt-1 text-sm font-medium">{formatDateTime(review?.created_at)}</p><p className="mt-3 text-xs text-muted-foreground">Review method</p><p className="mt-1 text-sm font-medium">{review?.provider === 'stripe_identity' ? 'Stripe Identity' : 'Manual administrator review'}</p></div>
        </aside>

        <main className="space-y-5 p-6">
          <div><h3 className="font-heading text-lg font-semibold">Attachment preview</h3><p className="mt-1 text-sm text-muted-foreground">Open every attachment below and compare it with the submitted details. Images and PDFs display here without downloading.</p></div>
          {documents.length ? <div className="grid gap-4 xl:grid-cols-2">{documents.map((document, index) => <DocumentPreview key={document.id} document={document} index={index} />)}</div> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800"><AlertTriangle className="mb-2 h-5 w-5" />No manual document attachments were supplied for this provider.</div>}

          <div className="border-t border-border pt-5">
            <Label htmlFor="verification-review-note">Decision note shown to the customer</Label>
            <Textarea id="verification-review-note" className="mt-2" minLength={10} maxLength={1000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record what you checked. For a rejection, explain exactly what the customer must correct and resubmit." />
            <p className="mt-1 text-xs text-muted-foreground">At least 10 characters. Rejected customers see this notice on their account page.</p>
            {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
            <label className="mt-4 flex items-start gap-3 rounded-lg border border-border p-3 text-sm"><input className="mt-0.5" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I reviewed every available attachment and confirmed that this decision is supported by the submitted evidence.</span></label>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button>
              <Button type="button" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800" disabled={busy || !confirmed || note.trim().length < 10} onClick={() => decide('reject')}><XCircle className="mr-2 h-4 w-4" />Reject and request update</Button>
              <Button type="button" disabled={busy || !confirmed || note.trim().length < 10 || review?.provider === 'stripe_identity'} onClick={() => decide('approve')}><FileCheck2 className="mr-2 h-4 w-4" />Verify customer</Button>
            </div>
          </div>
        </main>
      </div>
    </DialogContent>
  </Dialog>;
}

function DocumentPreview({ document, index }) {
  const url = base44.account.fileUrl(document.id);
  const contentType = document.contentType || document.content_type || '';
  const name = document.name || document.original_name || `Identity document ${index + 1}`;
  const image = contentType.startsWith('image/');
  return <section className="overflow-hidden rounded-lg border border-border bg-card">
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{name}</p><p className="text-xs text-muted-foreground">{image ? 'Image document' : contentType === 'application/pdf' ? 'PDF document' : `Attachment ${index + 1}`}</p></div><Eye className="h-4 w-4 shrink-0 text-primary" /></div>
    <div className="h-[24rem] bg-slate-100">
      {image ? <img src={url} alt={`${name} preview`} className="h-full w-full object-contain" /> : <iframe src={url} title={`${name} preview`} className="h-full w-full border-0" />}
    </div>
  </section>;
}

function QueueTab({ active, onClick, label, count, attention = false }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`relative px-4 py-3 text-sm font-semibold transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{label}<span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${attention ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'}`}>{count}</span>{active && <span className="absolute inset-x-1 bottom-0 h-0.5 bg-primary" />}</button>;
}

function Summary({ icon: Icon, label, value, tone = '', onClick, active = false }) {
  const content = <><div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4" />{label}</div><p className={`mt-2 font-heading text-2xl font-bold ${tone}`}>{value}</p></>;
  if (onClick) return <button type="button" onClick={onClick} className={`rounded-xl border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-muted/20 ${active ? 'border-primary/40 ring-1 ring-primary/10' : 'border-border'}`}>{content}</button>;
  return <div className="rounded-xl border border-border bg-card p-5 shadow-sm">{content}</div>;
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-current text-muted-foreground" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
}
