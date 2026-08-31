import React, { useEffect, useState } from 'react';
import { Download, FileCheck, Receipt, FileBarChart } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { formatCurrency, formatDate } from '@/components/shared/format';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import PageSkeleton from '@/components/shared/PageSkeleton';

export default function PortalDocuments() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.CustomerContract.list('-created_date')
      .then((d) => { setContracts(d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const docCategories = [
    { icon: FileCheck, title: 'Contracts', count: contracts.length, desc: 'Your commercial agreements' },
    { icon: Receipt, title: 'Invoices & Receipts', count: 0, desc: 'Billing documents' },
    { icon: FileBarChart, title: 'Statements', count: 0, desc: 'Account statements' },
  ];

  return (
    <div>
      <PageHeader title="My Documents" description="Download your contracts, invoices, receipts, and statements." />
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        {docCategories.map((cat) => (
          <div key={cat.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><cat.icon className="h-5 w-5 text-primary" /></div>
            <h3 className="mt-3 font-semibold">{cat.title}</h3>
            <p className="text-xs text-muted-foreground">{cat.desc}</p>
            <p className="mt-2 font-heading text-2xl font-bold">{cat.count}</p>
          </div>
        ))}
      </div>

      <h3 className="mb-3 font-heading font-semibold">Contracts</h3>
      {loading ? <PageSkeleton contentOnly /> : (
        <div className="space-y-3">
          {contracts.length > 0 ? contracts.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><FileCheck className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="font-medium">{c.contract_number}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(c.start_date)} → {formatDate(c.end_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">{formatCurrency(c.value_amount)}</span>
                {c.document_url && <Button variant="outline" size="sm"><Download className="mr-1 h-3 w-3" /> Download</Button>}
              </div>
            </div>
          )) : <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">No documents available.</div>}
        </div>
      )}
    </div>
  );
}
