import React from 'react';
import { Globe2, Ship, FileCheck, Package, Truck, ArrowRight, Plane, Container, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import WorldMap from '@/components/export/WorldMap';

const HEADER_IMG = 'https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=1600&q=80';
const PACKAGING_IMAGES = [
  {
    url: '/products/box-package.png',
    title: 'Fresh Mango Export Box',
    desc: '4kg corrugated export-grade carton for fresh mangoes, designed for cold-chain sea freight and air cargo.',
  },
  {
    url: '/products/dried-mango.png',
    title: 'Dried Mango Pouch',
    desc: '250g retail pouch for dried mango slices with shelf-ready front and back packaging.',
  },
  {
    url: '/products/dried-mango-jar.png',
    title: 'Dehydrated Mango Jar',
    desc: '180g jar format for premium dehydrated mango, packaged for gift, retail, and specialty shelves.',
  },
  {
    url: '/products/mango-pudding.png',
    title: 'Mango Pudding Pouch',
    desc: '150g ready-to-eat mango pudding with milk, designed for convenience retail and export assortments.',
  },
];

const EXPORT_FLOW = [
  { icon: Leaf, label: 'Harvest', desc: 'Grade-A mangoes hand-picked at peak ripeness' },
  { icon: Package, label: 'Pack', desc: 'Sorted, graded & packed in certified facilities' },
  { icon: Truck, label: 'Cold Chain', desc: 'Temperature-controlled transport to port' },
  { icon: Container, label: 'Container', desc: 'Reefer containers loaded for sea freight' },
  { icon: Ship, label: 'Shipping', desc: 'Sea & air freight to 18+ countries' },
  { icon: Plane, label: 'Air Cargo', desc: 'Express air freight for time-sensitive orders' },
  { icon: Globe2, label: 'Destination', desc: 'Delivered to global markets' },
];

const SERVICES = [
  { icon: Ship, title: 'Sea & Air Freight', desc: 'Flexible shipping via reefer containers and air freight for time-sensitive deliveries.' },
  { icon: FileCheck, title: 'Full Compliance', desc: 'Phytosanitary certificates, Global GAP, HACCP, and destination-specific compliance.' },
  { icon: Package, title: 'Quality Packaging', desc: 'Modified atmosphere packaging, temperature monitoring, and grade-specific sorting.' },
  { icon: Truck, title: 'Cold Chain Logistics', desc: 'End-to-end temperature-controlled supply chain from farm to destination port.' },
];

export default function Export() {
  return (
    <div className="relative">
      {/* Header with container yard background */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <img
          src={HEADER_IMG}
          alt="JBA GreenGold export shipping containers"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              <Globe2 className="h-4 w-4" /> Export Operations
            </span>
            <h1 className="mt-5 font-heading text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
              From Ghana to the World
            </h1>
            <p className="mt-5 text-lg text-white/90">
              Premium mangoes and mango products exported to 18+ countries across Europe, the Middle East, and Asia —
              with full compliance, traceability, and cold-chain integrity.
            </p>
            <Button className="mt-7 gradient-mango text-white" asChild>
              <Link to="/contact">Start Export Inquiry <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Packaging showcase — first */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight">Export-Ready Packaging</h2>
            <p className="mt-2 text-muted-foreground">Our products travel the world in packaging designed for quality, compliance, and shelf appeal.</p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PACKAGING_IMAGES.map((pkg) => (
              <div key={pkg.title} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg">
                <div className="aspect-[4/3] overflow-hidden bg-muted/20">
                  <img
                    src={pkg.url}
                    alt={pkg.title}
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-heading text-lg font-semibold">{pkg.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{pkg.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Export journey — second */}
      <section className="relative overflow-hidden bg-muted/30 py-16 lg:py-24">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='600' viewBox='0 0 1200 600'%3E%3Cdefs%3E%3Cpattern id='dots' x='0' y='0' width='24' height='24' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%232D5A27'/%3E%3C/pattern%3E%3C/pattern%3E%3Crect width='1200' height='600' fill='url(%23dots)'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-0 top-1/4 h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="absolute left-0 top-2/3 h-px w-full bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight">The Export Journey</h2>
            <p className="mt-2 text-muted-foreground">Every mango follows a certified path from orchard to destination.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {EXPORT_FLOW.map((step, i) => (
              <div key={step.label} className="relative">
                <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold">{step.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                </div>
                {i < EXPORT_FLOW.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-primary/40 lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global reach with world map */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-heading text-3xl font-bold tracking-tight">Global Reach, Local Quality</h2>
              <p className="mt-4 text-muted-foreground">
                We export fresh and processed mango products to 18+ countries across Europe, the Middle East, and Asia.
                Our export operations are built on certified quality, reliable logistics, and complete documentation.
              </p>
              <div className="mt-6 space-y-4">
                {SERVICES.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <WorldMap />
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight">Export Certifications</h2>
            <p className="mt-2 text-muted-foreground">Meeting international standards for quality and safety.</p>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {['Global GAP', 'HACCP', 'ISO 22000', 'Fair Trade', 'Organic', 'Halal', 'BRC', 'SEDEX'].map((cert) => (
              <div key={cert} className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 shadow-sm">
                <FileCheck className="h-5 w-5 text-emerald-600" />
                <span className="font-medium">{cert}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
