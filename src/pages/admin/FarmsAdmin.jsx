import React, { useEffect, useState } from 'react';
import { Plus, Sprout, MapPin, Layers } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatNumber } from '@/components/shared/format';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function FarmsAdmin() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Farm.list('-created_date')
      .then((d) => { setFarms(d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalAcres = farms.reduce((sum, f) => sum + (f.size_acres || 0), 0);
  const totalTrees = farms.reduce((sum, f) => sum + (f.tree_count || 0), 0);

  return (
    <div>
      <PageHeader title="Farm Management" description="Manage farm profiles, locations, and production capacity.">
        <Button className="gradient-mango text-white"><Plus className="mr-2 h-4 w-4" /> New Farm</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Sprout className="h-5 w-5 text-primary" />
          <p className="mt-2 font-heading text-2xl font-bold">{farms.length}</p>
          <p className="text-xs text-muted-foreground">Total Farms</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Layers className="h-5 w-5 text-emerald-500" />
          <p className="mt-2 font-heading text-2xl font-bold">{formatNumber(totalAcres)}</p>
          <p className="text-xs text-muted-foreground">Total Acres</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Sprout className="h-5 w-5 text-amber-500" />
          <p className="mt-2 font-heading text-2xl font-bold">{formatNumber(totalTrees)}</p>
          <p className="text-xs text-muted-foreground">Total Trees</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {farms.length > 0 ? farms.map((farm) => (
            <div key={farm.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="aspect-video bg-muted">
                {farm.image_url ? (
                  <img src={farm.image_url} alt={farm.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-amber-100">
                    <Sprout className="h-12 w-12 text-primary/40" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-semibold">{farm.name}</h3>
                  <StatusBadge status={farm.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{farm.farm_code}</p>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {farm.location}, {farm.region}</p>
                  <p className="flex items-center gap-1"><Layers className="h-3 w-3" /> {farm.size_acres} acres • {formatNumber(farm.tree_count)} trees</p>
                </div>
                {farm.mango_varieties?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {farm.mango_varieties.map((v) => <span key={v} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{v}</span>)}
                  </div>
                )}
              </div>
            </div>
          )) : <div className="col-span-full text-center py-12 text-muted-foreground">No farms registered yet.</div>}
        </div>
      )}
    </div>
  );
}