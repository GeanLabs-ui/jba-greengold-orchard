import React, { useEffect, useState } from 'react';
import { Truck, Package } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDateTime } from '@/components/shared/format';
import DataTable from '@/components/shared/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminCreateDialog from '@/components/admin/AdminCreateDialog';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';

const deliveryFields = [
  { name: 'order_number', label: 'Order #', required: true },
  { name: 'customer_name', label: 'Customer', required: true },
  { name: 'vehicle_plate', label: 'Vehicle Plate' },
  { name: 'driver_name', label: 'Driver' },
  { name: 'dispatch_date', label: 'Dispatch Date', type: 'datetime-local' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    defaultValue: 'scheduled',
    options: [
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'in_transit', label: 'In Transit' },
      { value: 'delivered', label: 'Delivered' },
    ],
  },
];

export default function Logistics() {
  const [deliveries, setDeliveries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Delivery.list('-created_date', 50),
      base44.entities.Vehicle.list(),
    ]).then(([dels, vehs]) => {
      setDeliveries(dels || []);
      setVehicles(vehs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    let timer;
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = setTimeout(load, 120);
    }, ['Delivery', 'Vehicle', 'Order']);
    return () => { clearTimeout(timer); unsubscribe(); };
  }, []);

  const createDelivery = (payload) => base44.entities.Delivery.create({
    ...payload,
    delivery_code: `DEL-${Date.now().toString().slice(-6)}`,
  });

  const inTransit = deliveries.filter((d) => d.status === 'in_transit').length;
  const delivered = deliveries.filter((d) => d.status === 'delivered').length;

  return (
    <div>
      <PageHeader title="Delivery & Logistics" description="Dispatch tracking, route management, and proof of delivery.">
        <AdminCreateDialog
          title="Schedule Delivery"
          description="Create a delivery dispatch record."
          buttonLabel="Schedule Delivery"
          fields={deliveryFields}
          onCreate={createDelivery}
          onCreated={load}
          submitLabel="Schedule Delivery"
        />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Truck className="h-5 w-5 text-primary" /><p className="mt-2 font-heading text-2xl font-bold">{deliveries.length}</p><p className="text-xs text-muted-foreground">Total Deliveries</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Truck className="h-5 w-5 text-indigo-500" /><p className="mt-2 font-heading text-2xl font-bold">{inTransit}</p><p className="text-xs text-muted-foreground">In Transit</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Truck className="h-5 w-5 text-emerald-500" /><p className="mt-2 font-heading text-2xl font-bold">{delivered}</p><p className="text-xs text-muted-foreground">Delivered</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><Package className="h-5 w-5 text-amber-500" /><p className="mt-2 font-heading text-2xl font-bold">{vehicles.length}</p><p className="text-xs text-muted-foreground">Vehicles</p></div>
      </div>

      <Tabs defaultValue="deliveries">
        <TabsList><TabsTrigger value="deliveries">Deliveries</TabsTrigger><TabsTrigger value="vehicles">Vehicles</TabsTrigger></TabsList>

        <TabsContent value="deliveries" className="mt-4">
          {loading ? <div className="h-64 animate-pulse rounded-xl bg-muted" /> : (
            <DataTable items={deliveries} columns={[
              { key: 'delivery_code', label: 'Code' },
              { key: 'order_number', label: 'Order #' },
              { key: 'customer_name', label: 'Customer' },
              { key: 'vehicle_plate', label: 'Vehicle' },
              { key: 'driver_name', label: 'Driver' },
              { key: 'dispatch_date', label: 'Dispatched', format: formatDateTime },
              { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
            ]} />
          )}
        </TabsContent>

        <TabsContent value="vehicles" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.length > 0 ? vehicles.map((v) => (
              <div key={v.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Truck className="h-5 w-5 text-primary" /></div>
                    <div><p className="font-semibold">{v.vehicle_code}</p><p className="text-xs text-muted-foreground">{v.plate_number}</p></div>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  <p>Type: <span className="capitalize">{v.vehicle_type?.replace('_', ' ')}</span></p>
                  {v.capacity_kg && <p>Capacity: {v.capacity_kg.toLocaleString()} kg</p>}
                  {v.driver_name && <p>Driver: {v.driver_name}</p>}
                </div>
              </div>
            )) : <div className="col-span-full text-center py-12 text-muted-foreground">No vehicles registered.</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
