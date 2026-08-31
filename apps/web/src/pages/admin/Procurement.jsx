import React, { useEffect, useState } from 'react';
import { FileText, Package } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import PageSkeleton from '@/components/shared/PageSkeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/components/shared/format';
import DataTable from '@/components/shared/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminCreateDialog from '@/components/admin/AdminCreateDialog';
import { base44 } from '@/api/base44Client';

const purchaseOrderFields = [
  { name: 'supplier_name', label: 'Supplier', required: true },
  { name: 'order_date', label: 'Order Date', type: 'date', required: true },
  { name: 'expected_delivery_date', label: 'Expected Delivery', type: 'date' },
  { name: 'total_amount', label: 'Total Amount', type: 'number', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    defaultValue: 'draft',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'received', label: 'Received' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
];

export default function Procurement() {
  const [suppliers, setSuppliers] = useState([]);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Supplier.list(),
      base44.entities.PurchaseOrder.list('-order_date', 50),
    ]).then(([sups, orders]) => {
      setSuppliers(sups || []);
      setPos(orders || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createPurchaseOrder = (payload) => base44.entities.PurchaseOrder.create({
    ...payload,
    po_number: `PO-${Date.now().toString().slice(-6)}`,
  });

  return (
    <div>
      <PageHeader>
        <AdminCreateDialog
          title="New Purchase Order"
          description="Create a supplier purchase order."
          buttonLabel="New Purchase Order"
          fields={purchaseOrderFields}
          onCreate={createPurchaseOrder}
          onCreated={load}
          submitLabel="Create Purchase Order"
        />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Package className="h-5 w-5 text-primary" /><p className="mt-2 font-heading text-2xl font-bold">{suppliers.length}</p><p className="text-xs text-muted-foreground">Suppliers</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><FileText className="h-5 w-5 text-blue-500" /><p className="mt-2 font-heading text-2xl font-bold">{pos.length}</p><p className="text-xs text-muted-foreground">Purchase Orders</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><FileText className="h-5 w-5 text-amber-500" /><p className="mt-2 font-heading text-2xl font-bold">{pos.filter((p) => p.status === 'draft' || p.status === 'sent').length}</p><p className="text-xs text-muted-foreground">Pending POs</p></div>
      </div>

      <Tabs defaultValue="orders">
        <TabsList><TabsTrigger value="orders">Purchase Orders</TabsTrigger><TabsTrigger value="suppliers">Suppliers</TabsTrigger></TabsList>

        <TabsContent value="orders" className="mt-4">
          {loading ? <PageSkeleton contentOnly /> : (
            <DataTable items={pos} columns={[
              { key: 'po_number', label: 'PO #' },
              { key: 'supplier_name', label: 'Supplier' },
              { key: 'order_date', label: 'Date', format: formatDate },
              { key: 'expected_delivery_date', label: 'Expected', format: formatDate },
              { key: 'total_amount', label: 'Total Cost', semantic: 'cost', align: 'right', format: (v) => formatCurrency(v) },
              { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
            ]} />
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.length > 0 ? suppliers.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
                    <div><p className="font-semibold">{s.name}</p><p className="text-xs text-muted-foreground">{s.supplier_code}</p></div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  {s.email && <p>{s.email}</p>}
                  {s.phone && <p>{s.phone}</p>}
                  {s.country && <p>{s.country}</p>}
                </div>
                {s.performance_rating && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Rating:</span>
                    <span className="text-xs font-medium">{'★'.repeat(s.performance_rating)}{'☆'.repeat(5 - s.performance_rating)}</span>
                  </div>
                )}
              </div>
            )) : <div className="col-span-full text-center py-12 text-muted-foreground">No suppliers registered.</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
