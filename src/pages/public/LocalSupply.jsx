import React from 'react';
import { Truck, Store, Package, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function LocalSupply() {
  return (
    <div>
      <section className="bg-gradient-to-br from-amber-600 to-orange-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white">Local Supply</h1>
          <p className="mt-2 text-amber-50">Fresh mangoes delivered to retailers, wholesalers, and walk-in customers across the region.</p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Store, title: 'Retail Supply', desc: 'Fresh mangoes supplied to supermarkets, grocery stores, and fruit vendors with reliable weekly deliveries.' },
              { icon: Package, title: 'Wholesale', desc: 'Bulk supply for distributors and processors. Competitive pricing with flexible ordering and volume discounts.' },
              { icon: Truck, title: 'Direct Delivery', desc: 'Door-to-door delivery service for businesses and institutions. Same-day or scheduled delivery options.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-mango">
                  <item.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mt-4 font-heading text-xl font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-heading text-3xl font-bold tracking-tight">Why Choose Our Local Supply?</h2>
              <ul className="mt-6 space-y-4">
                {[
                  { icon: Clock, title: 'Fresh Daily', desc: 'Harvested and delivered within 24–48 hours for maximum freshness.' },
                  { icon: Package, title: 'Flexible Quantities', desc: 'From single boxes to truckloads — we serve all order sizes.' },
                  { icon: Truck, title: 'Free Delivery', desc: 'Free delivery on orders above UGX 500,000 within Kampala and surrounding areas.' },
                  { icon: Store, title: 'Quality Guarantee', desc: 'Every delivery is quality-checked. Not satisfied? We replace it free.' },
                ].map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                      <item.icon className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Button className="mt-6 gradient-mango text-white" asChild>
                <Link to="/contact">Place an Order <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <img src="https://images.unsplash.com/photo-1546470427-227df1e3b9b8?w=800&q=80" alt="Local mango supply" className="rounded-2xl shadow-xl" />
          </div>
        </div>
      </section>
    </div>
  );
}