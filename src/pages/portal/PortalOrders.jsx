import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/components/shared/format';
import { Input } from '@/components/ui/input';
import DataTable from '@/components/shared/DataTable';
import { base44 } from '@/api/base44Client';

export default function PortalOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    base44.entities.Order.list('-order_date')
      .then((d) => { setOrders(d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="My Orders" description="Track your orders and delivery status." />
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      {loading ? <div className="h-64 animate-pulse rounded-xl bg-muted" /> : (
        <DataTable items={orders.filter((o) => !search || o.order_number?.toLowerCase().includes(search.toLowerCase()))} columns={[
          { key: 'order_number', label: 'Order #' },
          { key: 'order_date', label: 'Date', format: formatDate },
          { key: 'source', label: 'Source' },
          { key: 'total_amount', label: 'Total', align: 'right', format: (v) => formatCurrency(v) },
          { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
        ]} />
      )}
    </div>
  );
}
