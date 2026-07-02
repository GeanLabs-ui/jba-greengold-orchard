import React, { useEffect, useState } from 'react';
import { Plus, Scissors } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatNumber, formatDate } from '@/components/shared/format';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/shared/DataTable';
import { base44 } from '@/api/base44Client';

export default function Harvests() {
  const [harvests, setHarvests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Harvest.list('-harvest_date')
      .then((d) => { setHarvests(d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalQty = harvests.reduce((sum, h) => sum + (h.total_quantity || 0), 0);

  return (
    <div>
      <PageHeader title="Harvest Tracking" description="Record and monitor harvest batches from farm to warehouse.">
        <Button className="gradient-mango text-white"><Plus className="mr-2 h-4 w-4" /> Record Harvest</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Scissors className="h-5 w-5 text-primary" />
          <p className="mt-2 font-heading text-2xl font-bold">{harvests.length}</p>
          <p className="text-xs text-muted-foreground">Total Harvests</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Scissors className="h-5 w-5 text-emerald-500" />
          <p className="mt-2 font-heading text-2xl font-bold">{formatNumber(totalQty)} kg</p>
          <p className="text-xs text-muted-foreground">Total Quantity</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Scissors className="h-5 w-5 text-amber-500" />
          <p className="mt-2 font-heading text-2xl font-bold">{harvests.filter((h) => h.status === 'in_progress').length}</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      ) : (
        <DataTable
          items={harvests}
          columns={[
            { key: 'harvest_code', label: 'Code' },
            { key: 'farm_name', label: 'Farm' },
            { key: 'harvest_date', label: 'Date', format: formatDate },
            { key: 'harvest_season', label: 'Season' },
            { key: 'total_quantity', label: 'Qty (kg)', align: 'right', format: (v) => formatNumber(v) },
            { key: 'quality_grade', label: 'Grade' },
            { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
          ]}
        />
      )}
    </div>
  );
}