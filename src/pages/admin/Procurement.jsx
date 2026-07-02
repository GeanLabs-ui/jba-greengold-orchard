import React, { useEffect, useState } from 'react';
import { Plus, FileText, Package } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/components/shared/format';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/shared/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';

export default function Procurement() {
  const [suppliers, setSuppliers] = useState([]);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Supplier.list(),
      base44.entities.PurchaseOrder.list('-order_date', 50),
    ]).then(([sups, orders]) => {
      setSuppliers(sups || []);
      setPos(orders || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Procurement & Suppliers" description="Manage suppliers, purchase orders, and procurement workflows.">
        <Button className="gradient-mango text-white"><Plus className="mr-2 h-4 w-4" /> New Purchase Order</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Package className="h-5 w-5 text-primary" /><p className="mt-2 font-heading text-2xl font-bold">{suppliers.length}</p><p className="text-xs text-muted-foreground">Suppliers</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><FileText className="h-5 w-5 text-blue-500" /><p className="mt-2 font-heading text-2xl font-bold">{pos.length}</p><p className="text-xs text-muted-foreground">Purchase Orders</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><FileText className="h-5 w-5 text-amber-500" /><p className="mt-2 font-heading text-2xl font-bold">{pos.filter((p) => p.status === 'draft' || p.status === 'sent').length}</p><p className="text-xs text-muted-foreground">Pending POs</p></div>
      </div>

      <Tabs defaultValue="orders">
        <TabsList><TabsTrigger value="orders">Purchase Orders</TabsTrigger><TabsTrigger value="suppliers">Suppliers</TabsTrigger></TabsList>

        <TabsContent value="orders" className="mt-4">
          {loading ? <div className="h-64 animate-pulse rounded-xl bg-muted" /> : (
            <DataTable items={pos} columns={[
              { key: 'po_number', label: 'PO #' },
              { key: 'supplier_name', label: 'Supplier' },
              { key: 'order_date', label: 'Date', format: formatDate },
              { key: 'expected_delivery_date', label: 'Expected', format: formatDate },
              { key: 'total_amount', label: 'Total', align: 'right', format: (v) => formatCurrency(v) },
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