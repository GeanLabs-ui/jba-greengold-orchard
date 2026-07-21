import React from 'react';
import { Truck, Store, Package, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const SUPPLY_TYPES = [
  {
    icon: Store,
    title: 'Retail Supply',
    desc: 'Fresh mangoes supplied to supermarkets, grocery stores, and fruit vendors with reliable weekly deliveries.',
    image: '/pages/local-supply-retail.png',
  },
  {
    icon: Package,
    title: 'Wholesale',
    desc: 'Bulk supply for distributors and processors. Competitive pricing with flexible ordering and volume discounts.',
    image: '/pages/local-supply-wholesale.png',
  },
  {
    icon: Truck,
    title: 'Direct Delivery',
    desc: 'Door-to-door delivery service for businesses and institutions. Same-day or scheduled delivery options.',
    image: '/pages/local-supply-delivery.png',
    transparentImage: true,
  },
];

export default function LocalSupply() {
  return (
    <div className="relative overflow-hidden bg-background">
      <section className="relative overflow-hidden py-20 md:py-28">
        <img
          src="/pages/local-supply-header.png"
          alt="Fresh mangoes under an orchard tree for local supply"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/15" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white md:text-5xl">Local Supply</h1>
          <p className="mt-3 max-w-2xl text-lg text-amber-50">
            Fresh mangoes delivered to retailers, wholesalers, and walk-in customers across the region.
          </p>
        </div>
      </section>

      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {SUPPLY_TYPES.map((item) => (
              <div
                key={item.title}
                className={`group relative min-h-[360px] overflow-hidden rounded-2xl border shadow-xl ${
                  item.transparentImage ? 'border-emerald-900/15 bg-gradient-to-br from-emerald-950 via-emerald-800 to-amber-700' : 'border-white/20'
                }`}
              >
                {item.transparentImage ? (
                  <img
                    src={item.image}
                    alt={`${item.title} truck`}
                    className="absolute inset-x-0 top-7 mx-auto h-[58%] w-[94%] object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <>
                    <img
                      src={item.image}
                      alt={`${item.title} background`}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
                  </>
                )}
                {item.transparentImage && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-white/10" />}
                <div className="relative flex h-full min-h-[360px] flex-col justify-end p-8 text-white">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                    <item.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="mt-4 font-heading text-xl font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm text-white/85">{item.desc}</p>
                </div>
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
                  { icon: Truck, title: 'Free Delivery', desc: 'Free delivery on orders above GHS 500,000 within Accra and surrounding areas.' },
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
            <img src="/pages/local-supply-why-choose.png" alt="Why choose JBA GreenGold local supply" className="rounded-2xl shadow-xl" />
          </div>
        </div>
      </section>
    </div>
  );
}
