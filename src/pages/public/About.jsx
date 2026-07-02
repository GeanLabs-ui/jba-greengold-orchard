import React from 'react';
import { Leaf, Target, Eye, Award, Users, Globe2 } from 'lucide-react';

export default function About() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 to-emerald-700 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="font-heading text-4xl font-bold tracking-tight text-white md:text-5xl">About MangoOps</h1>
            <p className="mt-4 text-lg text-emerald-100">
              A leading mango business combining sustainable farming, modern operations, and global export capabilities —
              all managed from a single centralized platform.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="text-sm font-semibold text-primary">OUR STORY</span>
              <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight">From Small Farms to Global Markets</h2>
              <div className="mt-4 space-y-4 text-muted-foreground">
                <p>
                  Founded with a vision to transform mango farming in Uganda, MangoOps started as a single farm
                  operation and has grown into a comprehensive mango business serving local, corporate, and export markets.
                </p>
                <p>
                  Today, we manage over 12 farms, produce thousands of tons of premium mangoes annually, and export
                  to 18+ countries worldwide. Our centralized platform digitizes every aspect of the business —
                  from planting and harvest tracking to sales, logistics, and finance.
                </p>
                <p>
                  We believe in quality, sustainability, and technology as the foundation for building a mango business
                  that serves customers reliably while growing responsibly.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img src="https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&q=80" alt="Mango farm" className="h-full w-full rounded-2xl object-cover" />
              <img src="https://images.unsplash.com/photo-1605027990121-cbae9e0642df?w=400&q=80" alt="Mango harvest" className="mt-8 h-full w-full rounded-2xl object-cover" />
              <img src="https://images.unsplash.com/photo-1546173159-315724a31696?w=400&q=80" alt="Mango export" className="h-full w-full rounded-2xl object-cover" />
              <img src="https://images.unsplash.com/photo-1518569656558-1f25169d6434?w=400&q=80" alt="Mango quality" className="mt-8 h-full w-full rounded-2xl object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Target, title: 'Our Mission', desc: 'To deliver the highest quality mangoes to local and global markets while empowering farmers and communities through sustainable, technology-driven agriculture.' },
              { icon: Eye, title: 'Our Vision', desc: 'To be Africa\'s leading mango business — recognized for quality, sustainability, innovation, and the seamless integration of farm operations with global supply chains.' },
              { icon: Award, title: 'Our Values', desc: 'Quality, sustainability, integrity, innovation, and community. We hold ourselves to the highest standards in everything we grow, pack, and deliver.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-heading text-xl font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-heading text-3xl font-bold tracking-tight">Our Impact in Numbers</h2>
          <div className="mt-12 grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { icon: Leaf, value: '12+', label: 'Farms' },
              { icon: Users, value: '250+', label: 'Employees' },
              { icon: Globe2, value: '18', label: 'Export Markets' },
              { icon: Award, value: '8', label: 'Certifications' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-mango">
                  <stat.icon className="h-7 w-7 text-white" />
                </div>
                <p className="mt-3 font-heading text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}