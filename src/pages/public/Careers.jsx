import React from 'react';
import { Briefcase, MapPin, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const openRoles = [
  { title: 'Farm Manager', dept: 'Farm Operations', location: 'Mukono', type: 'Full-time' },
  { title: 'Export Sales Executive', dept: 'Sales & Marketing', location: 'Kampala', type: 'Full-time' },
  { title: 'Quality Control Officer', dept: 'Warehouse', location: 'Kampala', type: 'Full-time' },
  { title: 'Logistics Coordinator', dept: 'Logistics', location: 'Kampala', type: 'Full-time' },
  { title: 'Harvest Team Lead', dept: 'Farm Operations', location: 'Mukono', type: 'Seasonal' },
  { title: 'Accountant', dept: 'Finance', location: 'Kampala', type: 'Full-time' },
];

export default function Careers() {
  return (
    <div>
      <section className="bg-gradient-to-br from-emerald-800 to-green-700 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white">Careers</h1>
          <p className="mt-2 text-emerald-100">Join our team and be part of a growing agricultural business making a difference.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-heading text-2xl font-bold">Why Work With Us?</h2>
              <ul className="mt-4 space-y-3">
                {['Competitive salaries and benefits', 'Career growth and training opportunities', 'Health insurance for you and your family', 'Work in a sustainable, growing industry', 'Modern tools and technology-driven workflows', 'Inclusive and supportive work culture'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <img src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80" alt="Team" className="rounded-2xl shadow-xl" />
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-bold">Open Positions</h2>
          <div className="mt-6 space-y-3">
            {openRoles.map((role) => (
              <div key={role.title} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{role.title}</h3>
                    <p className="text-sm text-muted-foreground">{role.dept}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {role.location}</span>
                  <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {role.type}</span>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/contact">Apply <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}