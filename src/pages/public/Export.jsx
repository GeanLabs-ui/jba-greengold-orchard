import React from 'react';
import { Globe2, Ship, FileCheck, Package, Truck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function Export() {
  return (
    <div>
      <section className="bg-gradient-to-br from-violet-700 to-purple-700 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white">Export Operations</h1>
          <p className="mt-2 text-violet-100">Premium mangoes exported to markets worldwide with full compliance and traceability.</p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-heading text-3xl font-bold tracking-tight">Global Reach, Local Quality</h2>
              <p className="mt-4 text-muted-foreground">
                We export fresh and processed mango products to 18+ countries across Europe, the Middle East, and Asia.
                Our export operations are built on certified quality, reliable logistics, and complete documentation.
              </p>
              <div className="mt-6 space-y-4">
                {[
                  { icon: Ship, title: 'Sea & Air Freight', desc: 'Flexible shipping options via reefer containers and air freight for time-sensitive deliveries.' },
                  { icon: FileCheck, title: 'Full Compliance', desc: 'Phytosanitary certificates, Global GAP, HACCP, and destination-specific compliance documents.' },
                  { icon: Package, title: 'Quality Packaging', desc: 'Modified atmosphere packaging, temperature monitoring, and grade-specific sorting.' },
                  { icon: Truck, title: 'Cold Chain Logistics', desc: 'End-to-end temperature-controlled supply chain from farm to destination port.' },
                ].map((item) => (
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
              <Button className="mt-6 gradient-mango text-white" asChild>
                <Link to="/contact">Start Export Inquiry <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { country: 'United Kingdom', flag: '🇬🇧' },
                { country: 'Netherlands', flag: '🇳🇱' },
                { country: 'UAE', flag: '🇦🇪' },
                { country: 'Saudi Arabia', flag: '🇸🇦' },
                { country: 'Germany', flag: '🇩🇪' },
                { country: 'France', flag: '🇫🇷' },
                { country: 'Qatar', flag: '🇶🇦' },
                { country: 'China', flag: '🇨🇳' },
              ].map((m) => (
                <div key={m.country} className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
                  <p className="text-3xl">{m.flag}</p>
                  <p className="mt-2 text-sm font-medium">{m.country}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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