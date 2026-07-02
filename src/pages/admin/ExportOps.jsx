import React, { useEffect, useState } from 'react';
import { Plus, Ship, Globe2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/components/shared/format';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/shared/DataTable';
import { base44 } from '@/api/base44Client';

export default function ExportOps() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.ExportShipment.list('-created_date', 50)
      .then((d) => { setShipments(d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Export Operations" description="Manage export shipments, compliance, and destination tracking.">
        <Button className="gradient-mango text-white"><Plus className="mr-2 h-4 w-4" /> New Export Shipment</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Ship className="h-5 w-5 text-primary" /><p className="mt-2 font-heading text-2xl font-bold">{shipments.length}</p><p className="text-xs text-muted-foreground">Total Shipments</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Ship className="h-5 w-5 text-amber-500" /><p className="mt-2 font-heading text-2xl font-bold">{shipments.filter((s) => s.status === 'preparing').length}</p><p className="text-xs text-muted-foreground">Preparing</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Ship className="h-5 w-5 text-indigo-500" /><p className="mt-2 font-heading text-2xl font-bold">{shipments.filter((s) => s.status === 'in_transit').length}</p><p className="text-xs text-muted-foreground">In Transit</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Globe2 className="h-5 w-5 text-emerald-500" /><p className="mt-2 font-heading text-2xl font-bold">{new Set(shipments.map((s) => s.destination_country)).size}</p><p className="text-xs text-muted-foreground">Destinations</p></div>
      </div>

      {loading ? <div className="h-64 animate-pulse rounded-xl bg-muted" /> : (
        <DataTable items={shipments} columns={[
          { key: 'export_code', label: 'Export #' },
          { key: 'customer_name', label: 'Customer' },
          { key: 'destination_country', label: 'Destination' },
          { key: 'incoterm', label: 'Incoterm' },
          { key: 'shipment_date', label: 'Shipment Date', format: formatDate },
          { key: 'total_amount', label: 'Value', align: 'right', format: (v) => formatCurrency(v) },
          { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
        ]} />
      )}
    </div>
  );
}