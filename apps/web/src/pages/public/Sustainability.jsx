import React from 'react';
import { Leaf, Droplets, Recycle, Heart, ShieldCheck } from 'lucide-react';

export default function Sustainability() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-green-800 to-emerald-600 py-20">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80)', backgroundSize: 'cover' }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white md:text-5xl">Sustainability</h1>
          <p className="mt-4 max-w-2xl text-lg text-green-50">
            We grow mangoes responsibly — protecting the environment, empowering communities,
            and building a business that thrives for generations.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            {[
              { icon: Droplets, title: 'Water Stewardship', desc: 'Drip irrigation systems reduce water usage by up to 60%. We monitor soil moisture and schedule irrigation to minimize waste while maintaining optimal growing conditions.' },
              { icon: Leaf, title: 'Soil Health', desc: 'Cover cropping, composting, and minimal tillage practices preserve soil structure and fertility. Regular soil testing ensures balanced nutrition without over-fertilization.' },
              { icon: Recycle, title: 'Waste Reduction', desc: 'Mango by-products are repurposed into pulp, dried fruit, and animal feed. Packaging is designed for recyclability and minimal environmental impact.' },
              { icon: Heart, title: 'Community Engagement', desc: 'We employ locally, provide fair wages, and invest in community infrastructure including schools, water access, and healthcare for farming communities.' },
              { icon: ShieldCheck, title: 'Certified Standards', desc: 'Our farms hold Global GAP, Organic, and Fair Trade certifications. We undergo regular audits to maintain compliance with international food safety standards.' },
              { icon: Leaf, title: 'Biodiversity', desc: 'We maintain natural habitats around farm boundaries, plant windbreaks, and avoid broad-spectrum pesticides to protect pollinators and beneficial insects.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                  <item.icon className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-emerald-800 to-green-700 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="font-heading text-3xl font-bold text-white">Our Commitment to the SDGs</h2>
          <p className="mt-4 text-emerald-100">
            We align our sustainability efforts with the UN Sustainable Development Goals,
            focusing on responsible consumption, climate action, decent work, and zero hunger.
          </p>
        </div>
      </section>
    </div>
  );
}