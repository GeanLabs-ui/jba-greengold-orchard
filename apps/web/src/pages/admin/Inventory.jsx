import React, { useEffect, useState } from 'react';
import { Search, Package, AlertTriangle, ArrowDownUp } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatNumber, formatDate } from '@/components/shared/format';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminCreateDialog from '@/components/admin/AdminCreateDialog';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';

const stockFields = [
  { name: 'product_name', label: 'Product Name', required: true },
  { name: 'sku', label: 'SKU' },
  { name: 'warehouse_name', label: 'Warehouse', required: true },
  { name: 'bin_location', label: 'Bin Location' },
  { name: 'quantity_on_hand', label: 'Quantity On Hand', type: 'number', required: true },
  { name: 'reorder_level', label: 'Reorder Level', type: 'number', defaultValue: 0 },
  { name: 'unit_of_measure', label: 'Unit', defaultValue: 'kg' },
];

const movementFields = [
  { name: 'product_name', label: 'Product Name', required: true },
  { name: 'warehouse_name', label: 'Warehouse', required: true },
  {
    name: 'movement_type',
    label: 'Movement Type',
    type: 'select',
    defaultValue: 'in',
    options: [
      { value: 'in', label: 'Inbound' },
      { value: 'out', label: 'Outbound' },
      { value: 'adjustment', label: 'Adjustment' },
    ],
  },
  { name: 'quantity', label: 'Quantity', type: 'number', required: true },
  { name: 'movement_date', label: 'Movement Date', type: 'date' },
];

export default function Inventory() {
  const [stockItems, setStockItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.StockItem.list('-created_date', 100),
      base44.entities.StockMovement.list('-created_date', 50),
      base44.entities.Warehouse.list(),
    ]).then(([stock, moves, whs]) => {
      setStockItems(stock || []);
      setMovements(moves || []);
      setWarehouses(whs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    let timer;
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = setTimeout(load, 120);
    }, ['StockItem', 'StockMovement', 'Warehouse', 'Harvest']);
    return () => { clearTimeout(timer); unsubscribe(); };
  }, []);

  const createStock = (payload) => base44.entities.StockItem.create({
    ...payload,
    quantity_reserved: 0,
  });

  const createMovement = async (payload) => {
    const matches = await base44.entities.StockItem.filter({ product_name: payload.product_name, warehouse_name: payload.warehouse_name }, '-created_date', 1);
    const current = matches[0];
    const quantity = Number(payload.quantity || 0);
    if (!current && payload.movement_type !== 'in') throw new Error('Add this stock item before recording an outbound or adjustment movement.');
    const onHand = Number(current?.quantity_on_hand || 0);
    const nextQuantity = payload.movement_type === 'in' ? onHand + quantity : payload.movement_type === 'out' ? onHand - quantity : quantity;
    if (nextQuantity < 0) throw new Error(`Only ${formatNumber(onHand)} units are available.`);
    if (current) await base44.entities.StockItem.update(current.id, { quantity_on_hand: nextQuantity, last_movement_date: payload.movement_date || new Date().toISOString() });
    else await base44.entities.StockItem.create({ product_name: payload.product_name, warehouse_name: payload.warehouse_name, quantity_on_hand: nextQuantity, quantity_reserved: 0, reorder_level: 0, unit_of_measure: 'kg' });
    return base44.entities.StockMovement.create({ ...payload, movement_code: `MOV-${Date.now().toString().slice(-6)}`, balance_after: nextQuantity });
  };

  const filteredStock = stockItems.filter((s) => !search || s.product_name?.toLowerCase().includes(search.toLowerCase()) || s.sku?.toLowerCase().includes(search.toLowerCase()));
  const lowStockItems = stockItems.filter((s) => s.quantity_on_hand <= s.reorder_level);

  return (
    <div>
      <PageHeader title="Inventory Management" description="Stock levels, movements, and warehouse allocations.">
        <AdminCreateDialog
          title="Stock Movement"
          description="Record an inbound, outbound, or adjustment movement."
          buttonLabel="Stock Movement"
          buttonIcon={ArrowDownUp}
          buttonVariant="outline"
          buttonClassName="border-primary text-primary"
          fields={movementFields}
          onCreate={createMovement}
          onCreated={load}
          submitLabel="Record Movement"
        />
        <AdminCreateDialog
          title="Add Stock"
          description="Create a stock item for a warehouse."
          buttonLabel="Add Stock"
          fields={stockFields}
          onCreate={createStock}
          onCreated={load}
          submitLabel="Add Stock"
        />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Package className="h-5 w-5 text-primary" />
          <p className="mt-2 font-heading text-2xl font-bold">{stockItems.length}</p>
          <p className="text-xs text-muted-foreground">Stock Items</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <p className="mt-2 font-heading text-2xl font-bold">{lowStockItems.length}</p>
          <p className="text-xs text-muted-foreground">Low Stock Alerts</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <ArrowDownUp className="h-5 w-5 text-blue-500" />
          <p className="mt-2 font-heading text-2xl font-bold">{movements.length}</p>
          <p className="text-xs text-muted-foreground">Movements</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Package className="h-5 w-5 text-emerald-500" />
          <p className="mt-2 font-heading text-2xl font-bold">{warehouses.length}</p>
          <p className="text-xs text-muted-foreground">Warehouses</p>
        </div>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          <div className="mb-4 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search stock..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {loading ? (
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Product</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">SKU</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Warehouse</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">On Hand</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Reserved</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Reorder Level</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStock.length > 0 ? filteredStock.map((item) => {
                    const isLow = item.quantity_on_hand <= item.reorder_level;
                    return (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{item.product_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.sku || '—'}</td>
                        <td className="px-4 py-3">{item.warehouse_name}</td>
                        <td className={`px-4 py-3 text-right font-medium ${isLow ? 'text-amber-600' : ''}`}>{formatNumber(item.quantity_on_hand)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatNumber(item.quantity_reserved)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatNumber(item.reorder_level)}</td>
                        <td className="px-4 py-3">{isLow ? <StatusBadge status="overdue" label="Low" /> : <StatusBadge status="active" label="OK" />}</td>
                      </tr>
                    );
                  }) : <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No stock items found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Warehouse</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Quantity</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.length > 0 ? movements.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{m.movement_code}</td>
                    <td className="px-4 py-3"><StatusBadge status={m.movement_type} /></td>
                    <td className="px-4 py-3">{m.product_name}</td>
                    <td className="px-4 py-3">{m.warehouse_name}</td>
                    <td className={`px-4 py-3 text-right font-medium ${m.movement_type === 'in' ? 'text-emerald-600' : m.movement_type === 'out' ? 'text-red-600' : ''}`}>
                      {m.movement_type === 'in' ? '+' : m.movement_type === 'out' ? '-' : ''}{formatNumber(m.quantity)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(m.created_date)}</td>
                  </tr>
                )) : <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No movements recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="warehouses" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {warehouses.length > 0 ? warehouses.map((w) => (
              <div key={w.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-heading font-semibold">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.warehouse_code}</p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>📍 {w.location}, {w.region}</p>
                  {w.manager_name && <p>👤 {w.manager_name}</p>}
                  {w.capacity_kg && <p>📦 {formatNumber(w.capacity_kg)} kg capacity</p>}
                </div>
              </div>
            )) : <div className="col-span-full text-center py-12 text-muted-foreground">No warehouses configured.</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
