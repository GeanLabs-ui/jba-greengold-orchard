import React, { useEffect, useState } from 'react';
import { Ship, Globe2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import PageSkeleton from '@/components/shared/PageSkeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/components/shared/format';
import DataTable from '@/components/shared/DataTable';
import AdminCreateDialog from '@/components/admin/AdminCreateDialog';
import { base44 } from '@/api/base44Client';

const shipmentFields = [
  { name: 'customer_name', label: 'Customer', required: true },
  { name: 'destination_country', label: 'Destination Country', required: true },
  { name: 'incoterm', label: 'Incoterm', defaultValue: 'FOB' },
  { name: 'shipment_date', label: 'Shipment Date', type: 'date' },
  { name: 'total_amount', label: 'Shipment Value', type: 'number' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    defaultValue: 'preparing',
    options: [
      { value: 'preparing', label: 'Preparing' },
      { value: 'in_transit', label: 'In Transit' },
      { value: 'delivered', label: 'Delivered' },
    ],
  },
];

export default function ExportOps() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    base44.entities.ExportShipment.list('-created_date', 50)
      .then((d) => { setShipments(d || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createShipment = (payload) => base44.entities.ExportShipment.create({
    ...payload,
    export_code: `EXP-SH-${Date.now().toString().slice(-6)}`,
  });

  return (
    <div>
      <PageHeader>
        <AdminCreateDialog
          title="New Export Shipment"
          description="Create an export shipment record."
          buttonLabel="New Export Shipment"
          fields={shipmentFields}
          onCreate={createShipment}
          onCreated={load}
          submitLabel="Create Shipment"
        />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Ship className="h-5 w-5 text-primary" /><p className="mt-2 font-heading text-2xl font-bold">{shipments.length}</p><p className="text-xs text-muted-foreground">Total Shipments</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Ship className="h-5 w-5 text-amber-500" /><p className="mt-2 font-heading text-2xl font-bold">{shipments.filter((s) => s.status === 'preparing').length}</p><p className="text-xs text-muted-foreground">Preparing</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Ship className="h-5 w-5 text-indigo-500" /><p className="mt-2 font-heading text-2xl font-bold">{shipments.filter((s) => s.status === 'in_transit').length}</p><p className="text-xs text-muted-foreground">In Transit</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Globe2 className="h-5 w-5 text-emerald-500" /><p className="mt-2 font-heading text-2xl font-bold">{new Set(shipments.map((s) => s.destination_country)).size}</p><p className="text-xs text-muted-foreground">Destinations</p></div>
      </div>

      {loading ? <PageSkeleton contentOnly /> : (
        <DataTable items={shipments} columns={[
          { key: 'export_code', label: 'Export #' },
          { key: 'customer_name', label: 'Customer' },
          { key: 'destination_country', label: 'Destination' },
          { key: 'incoterm', label: 'Incoterm' },
          { key: 'shipment_date', label: 'Shipment Date', format: formatDate },
          { key: 'total_amount', label: 'Revenue', semantic: 'revenue', align: 'right', format: (v) => formatCurrency(v) },
          { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
        ]} />
      )}
    </div>
  );
}
