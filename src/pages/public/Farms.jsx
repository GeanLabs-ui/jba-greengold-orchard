import React, { useEffect, useState } from 'react';
import { Sprout, MapPin, Layers, Leaf } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Farms() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Farm.filter({ status: 'active' })
      .then((data) => { setFarms(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="bg-gradient-to-br from-emerald-800 to-green-700 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white">Our Farms</h1>
          <p className="mt-2 text-emerald-100">Sustainable mango cultivation across prime agricultural regions.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              [1, 2, 3].map((i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />)
            ) : farms.length > 0 ? (
              farms.map((farm) => (
                <div key={farm.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="aspect-video overflow-hidden bg-muted">
                    {farm.image_url ? (
                      <img src={farm.image_url} alt={farm.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-amber-100">
                        <Sprout className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-heading text-lg font-semibold">{farm.name}</h3>
                    <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {farm.location}, {farm.region}</p>
                      <p className="flex items-center gap-2"><Layers className="h-4 w-4" /> {farm.size_acres} acres</p>
                      {farm.mango_varieties?.length > 0 && (
                        <p className="flex items-center gap-2"><Leaf className="h-4 w-4" /> {farm.mango_varieties.join(', ')}</p>
                      )}
                    </div>
                    {farm.description && <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{farm.description}</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Sprout className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-3 text-muted-foreground">Farm details coming soon.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Leaf, title: 'Sustainable Practices', desc: 'Drip irrigation, integrated pest management, and soil conservation across all farms.' },
              { icon: Layers, title: 'Modern Infrastructure', desc: 'Equipped with packing houses, cold storage, and quality grading facilities.' },
              { icon: Sprout, title: 'Expert Team', desc: 'Experienced agronomists and farm managers overseeing every stage of production.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-leaf">
                  <item.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}