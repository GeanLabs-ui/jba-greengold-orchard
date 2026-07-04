import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sprout, Truck, Globe2, Leaf, ShieldCheck, TrendingUp, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newsPosts, setNewsPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Product.filter({ featured: true, is_active: true }, '-created_date', 6).catch(() => []),
      base44.entities.NewsPost.filter({ status: 'published' }, '-published_at', 3).catch(() => []),
    ]).then(([prods, news]) => {
      setFeaturedProducts(prods || []);
      setNewsPosts(news || []);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-amber-800">
        <div className="absolute inset-0 overflow-hidden">
          <iframe
            src="https://www.youtube-nocookie.com/embed/Qe-JH3_3yNw?autoplay=1&mute=1&loop=1&playlist=Qe-JH3_3yNw&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0"
            title="Mango farm background video"
            allow="autoplay; encrypted-media; picture-in-picture"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] w-[100vw] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 opacity-40"
            frameBorder="0"
            allowFullScreen={false}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/60 via-emerald-800/50 to-amber-800/60" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-amber-200 backdrop-blur">
              <Leaf className="h-4 w-4" /> Farm-to-Export Mango Operations
            </span>
            <h1 className="mt-6 font-heading text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              The Complete Platform for <span className="text-amber-300">Mango Business</span> Management
            </h1>
            <p className="mt-6 text-lg text-emerald-100">
              From farm management and harvest tracking to sales, inventory, logistics, and export operations —
              digitize your entire mango business from one centralized dashboard.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="gradient-mango text-white hover:opacity-90" asChild>
                <Link to="/contact">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" asChild>
                <Link to="/products">Explore Products</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
            {[
              { icon: Sprout, label: 'Farms Managed', value: '12+' },
              { icon: TrendingUp, label: 'Annual Harvest', value: '2,400t' },
              { icon: Globe2, label: 'Export Markets', value: '18' },
              { icon: Truck, label: 'Deliveries/mo', value: '350+' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-heading text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-heading text-3xl font-bold tracking-tight">Featured Mango Products</h2>
              <p className="mt-2 text-muted-foreground">Premium quality mangoes from our farms to your market.</p>
            </div>
            <Link to="/products" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
              ))
            ) : featuredProducts.length > 0 ? (
              featuredProducts.map((product) => (
                <div key={product.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg">
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-emerald-100">
                        <Sprout className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    {product.featured && <span className="text-xs font-semibold text-primary">★ Featured</span>}
                    <h3 className="mt-1 font-heading text-lg font-semibold">{product.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{product.description || product.variety}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-heading text-lg font-bold text-primary">UGX {product.price?.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">per {product.unit_of_measure}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-full text-center text-muted-foreground py-8">Products coming soon.</p>
            )}
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="bg-muted/30 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight">One Platform, Every Operation</h2>
            <p className="mt-2 text-muted-foreground">Manage your entire mango business ecosystem from a single dashboard.</p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Sprout, title: 'Farm & Harvest', desc: 'Track farms, blocks, harvest batches, and quality grades from field to warehouse.', color: 'from-emerald-500 to-green-600' },
              { icon: TrendingUp, title: 'Sales & CRM', desc: 'Manage customers, quotations, invoices, payments, and returns — local, corporate, and export.', color: 'from-amber-500 to-orange-500' },
              { icon: Truck, title: 'Logistics', desc: 'Plan deliveries, dispatch trucks, track routes, and confirm proof of delivery.', color: 'from-blue-500 to-indigo-600' },
              { icon: Globe2, title: 'Export Operations', desc: 'Manage export shipments, compliance documents, certifications, and destination tracking.', color: 'from-violet-500 to-purple-600' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.color}`}>
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sustainability highlight */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative">
              <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80" alt="Sustainable farming" className="rounded-2xl shadow-xl" />
              <div className="absolute -bottom-6 -right-6 hidden rounded-2xl border border-border bg-card p-6 shadow-lg md:block">
                <ShieldCheck className="h-8 w-8 text-emerald-600" />
                <p className="mt-2 font-heading text-lg font-bold">Global GAP Certified</p>
                <p className="text-xs text-muted-foreground">Food safety & sustainability</p>
              </div>
            </div>
            <div>
              <span className="text-sm font-semibold text-primary">SUSTAINABILITY</span>
              <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight">Growing Responsibly for Generations</h2>
              <p className="mt-4 text-muted-foreground">
                We practice sustainable agriculture with responsible water management, soil stewardship,
                and community engagement. Our farms are certified for quality, food safety, and environmental standards.
              </p>
              <ul className="mt-6 space-y-3">
                {['Drip irrigation & water conservation', 'Integrated pest management', 'Fair labor practices', 'Waste reduction & recycling'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                      <Leaf className="h-3 w-3 text-emerald-600" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="mt-6" asChild>
                <Link to="/sustainability">Learn More <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* News */}
      {newsPosts.length > 0 && (
        <section className="bg-muted/30 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between">
              <h2 className="font-heading text-3xl font-bold tracking-tight">Latest News & Harvest Updates</h2>
              <Link to="/news" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                All news <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {newsPosts.map((post) => (
                <Link key={post.id} to={`/news/${post.slug}`} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg">
                  <div className="aspect-video overflow-hidden bg-muted">
                    {post.featured_image && <img src={post.featured_image} alt={post.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />}
                  </div>
                  <div className="p-5">
                    <span className="text-xs font-semibold uppercase text-primary">{post.category?.replace('_', ' ')}</span>
                    <h3 className="mt-1 font-heading text-lg font-semibold group-hover:text-primary">{post.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl gradient-mango px-8 py-16 text-center text-white">
            <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">Ready to Transform Your Mango Business?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-amber-50">
              Join the platform that brings your farms, sales, inventory, logistics, and export operations together.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="bg-white text-primary hover:bg-amber-50" asChild>
                <Link to="/contact">Contact Us Today</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10" asChild>
                <Link to="/admin">View Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}