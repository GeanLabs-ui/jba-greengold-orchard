import './home-layout.css';
import OptimizedVideo from '@/components/public/OptimizedVideo';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CirclePlay,
  CloudSun,
  Globe2,
  Handshake,
  LocateFixed,
  Milk,
  MapPinned,
  MessageCircle,
  Navigation,
  PackageCheck,
  Quote,
  ShoppingCart,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import TurnstileWidget from '@/components/TurnstileWidget';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import LiveFarmMap from '@/components/public/LiveFarmMap';
import { publicFarms } from '@/data/publicFarms';
import { whatsappSupportUrl } from '@/lib/whatsapp-support';

const WHATSAPP_SUPPORT_URL = whatsappSupportUrl();

const audiences = [
  {
    title: 'Enterprise Farms',
    description: 'Growing farm businesses that need one clear view of orchard work, harvest, people, productivity, and performance.',
    image: '/pages/audience-enterprise-farms.png',
    imageAlt: 'Farm manager inspecting mangoes in an orchard',
    icon: Sprout,
  },
  {
    title: 'Food & Beverages',
    description: 'Dependable, traceable mango supply for processors, beverage producers, food manufacturers, hospitality businesses, and commercial kitchens.',
    image: '/pages/audience-food-beverages.png',
    imageAlt: 'Farm workers handling freshly harvested mangoes together',
    icon: Milk,
  },
  {
    title: 'Retail',
    description: 'Premium fresh and processed mango products for supermarkets, grocery stores, convenience shops, hospitality outlets, and specialty retailers.',
    image: '/pages/audience-retail.png',
    imageAlt: 'Customer selecting mango juice in a grocery store',
    icon: ShoppingCart,
  },
  {
    title: 'Local & Foreign Partners',
    description: 'Flexible supply, distribution, sourcing, and long-term collaboration for local distributors, African partners, international buyers, exporters, importers, and strategic commercial partners.',
    image: '/pages/audience-local-foreign-partners.png',
    imageAlt: 'Partners inspecting mangoes at a distribution warehouse',
    icon: Handshake,
  },
];

const customerStories = [
  {
    type: 'Fresh mango retail partner',
    title: 'Predictable quality, every delivery.',
    quote: 'JBA GreenGold helps our team plan with confidence. The product information is clear, the quality is consistent, and we always know who to reach when we need support.',
    result: 'A closer, more responsive supply relationship',
  },
  {
    type: 'Export supply customer',
    title: 'A clearer path from orchard to market.',
    quote: 'Traceability and responsive communication make a real difference when planning a mango programme. We value the visibility and care around every delivery.',
    result: 'Better planning across the supply chain',
  },
  {
    type: 'Food processing customer',
    title: 'Reliable support behind every order.',
    quote: 'Working with a team that understands both product quality and the pace of production gives us the reassurance to keep growing together.',
    result: 'A dependable foundation for growth',
  },
  {
    type: 'Hospitality supply partner',
    title: 'Fresh mangoes that arrive ready to serve.',
    quote: 'The JBA GreenGold team makes it easy to keep our kitchen supplied with fruit that looks good, tastes great, and arrives when we need it.',
    result: 'More confidence in every guest experience',
  },
  {
    type: 'Local market distributor',
    title: 'A supply partner that keeps pace with demand.',
    quote: 'We can respond faster to our customers because delivery updates are clear and the fruit quality gives us something dependable to stand behind.',
    result: 'Stronger service for local customers',
  },
];

const emptyCustomerStory = {
  name: '',
  email: '',
  company: '',
  title: '',
  quote: '',
  result: '',
};

const featuredProducts = [
  { id: 'fresh-mango-box', name: 'Fresh mango export box', image: '/products/box-package.webp' },
  { id: 'dried-mango', name: 'Dried mango slices', image: '/products/dried-mango.webp' },
  { id: 'mango-jar', name: 'Dehydrated mango jar', image: '/products/dried-mango-jar.webp' },
  { id: 'mango-pudding', name: 'Mango pudding', image: '/products/mango-pudding.webp' },
  { id: 'mango-juice', name: 'Mango juice', image: '/products/catalog-mango-juice.webp' },
  { id: 'mango-jam', name: 'Mango jam', image: '/products/catalog-mango-jam.webp' },
];

const qualityStandards = [
  {
    label: 'LOCAL · GHANA',
    title: 'National quality compliance',
    description: 'Ghana Standards Authority and food-safety requirements guide the care we bring to every local operation.',
    image: 'https://images.pexels.com/photos/31095043/pexels-photo-31095043.jpeg?auto=compress&cs=tinysrgb&w=1600',
    imageAlt: 'Farmer inspecting ripe mangoes in an orchard',
    icon: ShieldCheck,
  },
  {
    label: 'AFRICA · REGIONAL',
    title: 'Regional trade readiness',
    description: 'Traceability and quality systems support confident market access and dependable cross-border supply.',
    image: 'https://images.pexels.com/photos/36967907/pexels-photo-36967907.jpeg?auto=compress&cs=tinysrgb&w=1600',
    imageAlt: 'Farmers loading freshly harvested mangoes together',
    icon: MapPinned,
  },
  {
    label: 'INTERNATIONAL',
    title: 'Global market standards',
    description: 'Export-ready handling helps us meet the expectations of customers and partners around the world.',
    image: 'https://images.pexels.com/photos/34406344/pexels-photo-34406344.jpeg?auto=compress&cs=tinysrgb&w=1600',
    imageAlt: 'Cargo ship carrying containers for international export',
    icon: Globe2,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};

function SectionHeading({ eyebrow, title, children, dark = false }) {
  return (
    <motion.header
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
      variants={fadeUp}
      transition={{ duration: 0.48 }}
      className="mx-auto max-w-3xl text-center"
    >
      {eyebrow && <p className={`text-[11px] font-bold tracking-[0.16em] ${dark ? 'text-[#c8e6c9]' : 'text-[#2e7d32]'}`}>{eyebrow}</p>}
      <h2 className={`mt-2 font-heading text-3xl font-black tracking-[-0.035em] sm:text-4xl ${dark ? 'text-white' : 'text-[#123524]'}`}>{title}</h2>
      {children && <p className={`mx-auto mt-4 max-w-2xl text-sm leading-7 sm:text-base ${dark ? 'text-white/80' : 'text-[#5f7565]'}`}>{children}</p>}
    </motion.header>
  );
}

function SmallAction({ to, children, external = false, className = '' }) {
  const props = external ? { href: to, target: '_blank', rel: 'noreferrer' } : { to };
  const Component = external ? 'a' : Link;
  return (
    <Component {...props} className={`home-action inline-flex items-center gap-2 bg-[#2e7d32] px-4 py-2 text-xs font-bold uppercase tracking-[0.06em] text-white transition-colors hover:bg-[#c8e6c9] hover:text-[#123524] ${className}`}>
      {children} <ArrowRight className="h-3.5 w-3.5" />
    </Component>
  );
}

function GlobeIcon({ className }) {
  return <CloudSun className={className} />;
}

function FarmMapExplorer({ farms }) {
  const [activeFarmIndex, setActiveFarmIndex] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const activeFarm = activeFarmIndex === null ? null : farms[activeFarmIndex];

  useEffect(() => {
    if (isPaused || farms.length < 2) return undefined;
    const delay = activeFarmIndex === null ? 3500 : 5000;
    const tour = window.setTimeout(() => {
      setActiveFarmIndex((currentIndex) => currentIndex === null ? 0 : currentIndex === farms.length - 1 ? null : currentIndex + 1);
    }, delay);
    return () => window.clearTimeout(tour);
  }, [activeFarmIndex, farms.length, isPaused]);

  const selectFarm = (farm) => setActiveFarmIndex(farms.findIndex((item) => item.id === farm.id));

  return (
    <div className="relative aspect-[1.35/1] overflow-hidden border border-[#e8f5e9] bg-[#e8f5e9] shadow-[0_12px_28px_rgba(26,75,38,.12)]" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} onFocus={() => setIsPaused(true)} onBlur={() => setIsPaused(false)}>
      <LiveFarmMap farms={farms} activeFarm={activeFarm} onFarmSelect={selectFarm} />
      <div className="pointer-events-none absolute left-4 top-4 z-[500] max-w-[calc(100%-2rem)] bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <p className="text-[10px] font-black tracking-[0.08em] text-[#2e7d32]">{activeFarm ? `FARM ${activeFarmIndex + 1} OF ${farms.length}` : 'ALL JBA ORCHARDS'}</p>
        <p className="mt-0.5 text-xs font-bold text-[#123524]">{activeFarm ? `${activeFarm.name} · ${activeFarm.region}` : 'Interactive Ghana farm coverage'}</p>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex items-center gap-2 bg-white/90 px-3 py-2 text-[10px] font-black tracking-[0.08em] text-[#2e7d32] shadow-sm backdrop-blur"><LocateFixed className="h-4 w-4" /> {isPaused ? 'SELECT A FARM MARKER' : activeFarm ? 'AUTOMATIC FARM TOUR' : 'LIVE GPS FARM COVERAGE'}</div>
    </div>
  );
}

function ProductCarousel({ products }) {
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activeProduct = products[activeProductIndex];

  useEffect(() => {
    if (isPaused || products.length < 2) return undefined;

    const rotation = window.setInterval(() => {
      setActiveProductIndex((currentIndex) => (currentIndex + 1) % products.length);
    }, 4500);

    return () => window.clearInterval(rotation);
  }, [isPaused, products.length]);

  return (
    <div
      className="group relative mx-auto h-64 w-full max-w-md overflow-hidden sm:h-72"
      aria-roledescription="carousel"
      aria-label="JBA GreenGold products"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeProduct.id}
          initial={{ opacity: 0, x: -20, scale: 0.975 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 1.02 }}
          transition={{ duration: 0.48, ease: 'easeInOut' }}
          className="absolute inset-0 flex items-center justify-center px-4"
        >
          <img src={activeProduct.image} alt={activeProduct.name} className="h-full w-full object-contain" loading={activeProductIndex === 0 ? 'eager' : 'lazy'} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ProductFeature() {
  return (
    <article className="grid items-center gap-9 md:grid-cols-2">
      <motion.div initial={{ opacity: 0, x: -22 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }}>
        <ProductCarousel products={featuredProducts} />
      </motion.div>
      <div>
        <p className="text-xs font-black tracking-[0.12em] text-[#2e7d32]">JBA PRODUCTS</p>
        <h2 className="mt-2 font-heading text-3xl font-black tracking-tight">Quality customers can trust.</h2>
        <div className="mt-4 border-l-[5px] border-[#c8e6c9] bg-[#2e7d32] px-5 py-4 text-sm leading-6 text-white">From fresh fruit to value-added products, our careful handling and dependable supply protect quality at every stage.</div>
        <div className="mt-5"><SmallAction to="/products">Explore products</SmallAction></div>
      </div>
    </article>
  );
}

function QualityStandardsShowcase() {
  return (
    <section className="border-y border-[#e8f5e9] bg-[#f9fcfa] px-5 py-10 sm:px-8 sm:py-12" aria-labelledby="quality-standards-heading">
      <div className="mx-auto max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black tracking-[0.16em] text-[#2e7d32]">CERTIFICATIONS &amp; STANDARDS</p>
          <h2 id="quality-standards-heading" className="mt-3 font-heading text-3xl font-black leading-[1.04] tracking-[-0.045em] text-[#123524] sm:text-4xl">Quality that earns trust in <span className="text-[#a5d6a7]">every market.</span></h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#355e3b] sm:text-base">From the orchard to export, we work to clear quality practices that respect Ghanaian requirements, regional trade needs, and international food-safety expectations.</p>
        </motion.div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {qualityStandards.map(({ label, title, description, image, imageAlt, icon: Icon }, index) => (
            <motion.article key={label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: index * 0.1, duration: 0.45 }} className="group overflow-hidden border border-[#e8f5e9] bg-white shadow-[0_12px_30px_rgba(18,63,27,.08)]">
              <div className="h-36 overflow-hidden bg-[#f4fbf5]">
                <img src={image} alt={imageAlt} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" loading="lazy" />
              </div>
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-3 text-[#2e7d32]"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#f4fbf5] text-[#123524]"><Icon className="h-[18px] w-[18px]" /></span><p className="text-[11px] font-black tracking-[0.13em]">{label}</p></div>
                <h3 className="mt-3 font-heading text-xl font-black tracking-[-0.03em] text-[#123524]">{title}</h3>
                <p className="mt-2 text-sm leading-5 text-[#355e3b]">{description}</p>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.4 }} className="mt-6 flex justify-center">
          <Link to="/sustainability" className="home-action inline-flex h-10 items-center gap-2 bg-[#123524] px-6 text-sm font-black text-white transition-colors hover:bg-[#a5d6a7] hover:text-[#123524]">Explore quality &amp; sustainability <ArrowRight className="h-4 w-4" /></Link>
        </motion.div>
      </div>
    </section>
  );
}

function AudienceShowcase() {
  return (
    <section className="bg-[#f9fcfa] px-5 py-10 sm:px-8 sm:py-12" aria-labelledby="who-we-serve-heading">
      <div className="mx-auto max-w-6xl">
        <motion.header initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-black tracking-[0.18em] text-[#2e7d32]">WHO WE SERVE</p>
          <h2 id="who-we-serve-heading" className="mt-3 font-heading text-3xl font-black leading-[1.04] tracking-[-0.045em] text-[#123524] sm:text-4xl">Built around the people who <span className="text-[#6b8e23]">move mango forward.</span></h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-[#355e3b] sm:text-base">Whether you grow, process, sell, distribute, or serve mango products, we support you from orchard to market.</p>
        </motion.header>

        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          {audiences.map(({ title, description, image, imageAlt, icon: Icon }, index) => (
            <motion.article key={title} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: index * 0.08, duration: 0.45 }} className="group overflow-hidden rounded-[1.25rem] border border-[#e8f5e9] bg-white shadow-[0_10px_24px_rgba(18,63,27,.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(18,63,27,.12)] sm:grid sm:grid-cols-[45%_55%]">
              <div className="relative h-44 overflow-hidden bg-[#f4fbf5] sm:h-auto sm:min-h-52">
                <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]" loading="lazy" />
              </div>
              <div className="flex flex-col items-start p-4 sm:p-5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f4fbf5] text-[#123524]"><Icon className="h-4 w-4" /></span>
                <h3 className="mt-3 font-heading text-xl font-black leading-tight tracking-[-0.035em] text-[#123524]">{title}</h3>
                <p className="mt-2 text-sm leading-5 text-[#355e3b]">{description}</p>
                <Link to="/contact" className="home-action mt-3 inline-flex items-center gap-2 text-sm font-black text-[#2e7d32] transition-colors hover:text-[#123524]">Learn more <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CustomerStories() {
  const [stories, setStories] = useState(customerStories);
  const [activeStory, setActiveStory] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [form, setForm] = useState(emptyCustomerStory);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const story = stories[activeStory] || stories[0];

  useEffect(() => {
    let active = true;
    base44.entities.CustomerStory.list('-created_date', 50)
      .then((publishedStories) => {
        if (!active || !Array.isArray(publishedStories) || publishedStories.length === 0) return;
        setStories((currentStories) => [
          ...currentStories,
          ...publishedStories.filter((item) => !currentStories.some((storyItem) => storyItem.id === item.id)),
        ]);
      })
      .catch(() => {
        // The five curated stories remain available if the public feed is temporarily offline.
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (isPaused || stories.length < 2) return undefined;
    const rotation = window.setInterval(() => {
      setActiveStory((currentIndex) => (currentIndex + 1) % stories.length);
    }, 6500);
    return () => window.clearInterval(rotation);
  }, [isPaused, stories.length]);

  const closeDialog = (open) => {
    setIsDialogOpen(open);
    if (!open && !isSubmitting) {
      setSubmitError('');
      setSubmitMessage('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const savedStory = await base44.entities.CustomerStory.create({
        ...form,
        source_page: 'home',
        turnstile_token: turnstileToken,
      });
      setStories((currentStories) => [...currentStories, savedStory]);
      setActiveStory(stories.length);
      setForm(emptyCustomerStory);
      setTurnstileToken('');
      setSubmitMessage('Your story is now published. Thank you for sharing your experience.');
    } catch (error) {
      setSubmitError(error?.message || 'We could not publish your story. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-[#f9fcfa] px-5 py-16 text-center sm:px-8" aria-labelledby="customer-stories-heading">
      <div
        className="mx-auto max-w-4xl"
        aria-roledescription="carousel"
        aria-label="Customer success stories"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
      >
        <p className="text-xs font-black tracking-[0.14em] text-[#2e7d32]">CUSTOMER SUCCESS STORIES</p>
        <span className="mx-auto mt-5 grid h-16 w-16 place-items-center rounded-full border-2 border-[#c8e6c9] bg-white text-[#2e7d32]"><Quote className="h-7 w-7" /></span>
        <AnimatePresence mode="wait">
          <motion.div
            key={story.id || story.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            aria-live="polite"
          >
            <p className="mt-6 text-xs font-black tracking-[0.12em] text-[#355e3b]">{story.type.toUpperCase()}</p>
            <h2 id="customer-stories-heading" className="mt-2 font-heading text-2xl font-black tracking-tight sm:text-3xl">{story.title}</h2>
            <blockquote className="mx-auto mt-5 max-w-3xl text-lg italic leading-8 text-[#355e3b] sm:text-2xl sm:leading-10">“{story.quote}”</blockquote>
            <p className="mt-5 text-sm font-bold text-[#2e7d32]">{story.result}</p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-8 flex justify-center gap-2" role="tablist" aria-label="Choose a customer story">
          {stories.map((item, index) => <button key={item.id || item.title} type="button" onClick={() => setActiveStory(index)} role="tab" aria-label={`Show customer story ${index + 1} of ${stories.length}`} aria-selected={activeStory === index} className={`h-2.5 rounded-full transition-all ${activeStory === index ? 'w-7 bg-[#2e7d32]' : 'w-2.5 bg-[#c8e6c9] hover:bg-[#66bb6a]'}`} />)}
        </div>
        <div className="mt-7"><button type="button" onClick={() => setIsDialogOpen(true)} className="home-action inline-flex items-center gap-2 bg-[#2e7d32] px-4 py-2 text-xs font-bold uppercase tracking-[0.06em] text-white transition-colors hover:bg-[#c8e6c9] hover:text-[#123524]">Share your success story <ArrowRight className="h-3.5 w-3.5" /></button></div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-h-[calc(100svh-2rem)] max-w-xl overflow-y-auto border-[#e8f5e9] bg-[#f9fcfa] p-6 text-left sm:p-8">
          <DialogHeader>
            <p className="text-xs font-black tracking-[0.14em] text-[#2e7d32]">YOUR JBA EXPERIENCE</p>
            <DialogTitle className="font-heading text-3xl font-black text-[#123524]">Share your success story</DialogTitle>
            <DialogDescription className="max-w-lg leading-6 text-[#5f7565]">Tell future customers what working with JBA GreenGold has meant for you. Your story is saved and published to this page.</DialogDescription>
          </DialogHeader>
          {submitMessage ? (
            <div className="border-l-4 border-[#2e7d32] bg-[#f4fbf5] px-4 py-4 text-sm leading-6 text-[#1b5e20]" role="status">{submitMessage}</div>
          ) : (
            <form className="mt-2 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label htmlFor="story-name">Your name *</Label><Input id="story-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" /></div>
                <div><Label htmlFor="story-email">Email *</Label><Input id="story-email" required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" /></div>
              </div>
              <div><Label htmlFor="story-company">Company or role</Label><Input id="story-company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="e.g. Fresh mango retail partner" /></div>
              <div><Label htmlFor="story-title">Story headline *</Label><Input id="story-title" required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What changed for your business?" /></div>
              <div><Label htmlFor="story-quote">Your story *</Label><Textarea id="story-quote" required rows={5} maxLength={1000} value={form.quote} onChange={(event) => setForm({ ...form, quote: event.target.value })} placeholder="Tell us about your experience with JBA GreenGold..." /></div>
              <div><Label htmlFor="story-result">The result</Label><Input id="story-result" maxLength={160} value={form.result} onChange={(event) => setForm({ ...form, result: event.target.value })} placeholder="e.g. Better planning for every delivery" /></div>
              <TurnstileWidget onToken={setTurnstileToken} />
              {submitError && <p className="text-sm font-medium text-red-700" role="alert">{submitError}</p>}
              <Button type="submit" disabled={isSubmitting || !turnstileToken} className="h-11 w-full rounded-none bg-[#2e7d32] font-bold text-white hover:bg-[#c8e6c9] hover:text-[#123524]">{isSubmitting ? 'Publishing your story...' : 'Save & publish story'} <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default function Home() {
  return (
    <div className="agrivi-inspired-home overflow-hidden bg-white text-[#123524]">
      <section className="jba-home-hero relative flex h-[26rem] min-h-0 items-center overflow-hidden sm:h-[28rem] lg:h-[32rem]">
        <OptimizedVideo desktop="/videos/optimized/home-6a70f74c1fba-desktop.mp4" mobile="/videos/optimized/home-6a70f74c1fba-mobile.mp4" poster="/videos/optimized/home-6a70f74c1fba-poster.webp" priority className="jba-home-hero-video absolute inset-0 h-full w-full object-cover" aria-hidden="true" />
        <div className="jba-home-hero-overlay absolute inset-0" />
        <div className="jba-home-hero-shade absolute inset-0" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_18rem] lg:px-10">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.65 }} className="jba-home-hero-copy max-w-2xl border-l-[3px] border-[#c8e6c9] px-5 py-4 shadow-[0_10px_28px_rgba(0,0,0,.18)] sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c8e6c9]">JBA GREENGOLD ORCHARD</p>
            <h1 className="mt-2 font-heading text-[30px] font-black leading-[1.05] tracking-[-0.025em] text-white sm:text-4xl"><span className="block">Growing Quality.</span><span className="block">Delivering Ghana to the World.</span></h1>
            <p className="mt-3 max-w-md text-sm leading-[1.4] text-white/[.84]"><span className="block">We cultivate premium mangoes and mango products with a</span><span className="block">commitment to quality, sustainability, reliable supply, and</span><span className="block">stronger communities.</span></p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" className="home-action h-12 rounded-none bg-[#c8e6c9] px-6 font-bold text-[#123524] hover:bg-white" asChild><Link to="/contact">Book a Meeting <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <a href={WHATSAPP_SUPPORT_URL} target="_blank" rel="noreferrer" className="home-action jba-home-hero-whatsapp inline-flex h-12 items-center gap-2 border border-white/45 px-5 text-sm font-bold text-white transition-colors hover:border-[#c8e6c9] hover:bg-[#c8e6c9] hover:text-[#123524]"><MessageCircle className="h-4 w-4" /> WhatsApp support</a>
            </div>
          </motion.div>
          <motion.aside initial={{ opacity: 0, x: 26 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, duration: 0.65 }} className="jba-home-hero-aside hidden border-l-[3px] border-[#c8e6c9] p-5 text-white shadow-[0_10px_28px_rgba(0,0,0,.18)] lg:block">
            <p className="text-[10px] font-bold tracking-[0.16em] text-[#c8e6c9]">A CONNECTED ORCHARD</p>
            <div className="mt-5 grid grid-cols-3 gap-3">{[{ icon: Sprout, label: 'GROW' }, { icon: PackageCheck, label: 'PACK' }, { icon: GlobeIcon, label: 'SUPPLY' }].map(({ icon: Icon, label }) => <div key={label} className="text-center"><div className="mx-auto grid h-11 w-11 place-items-center border border-white/40"><Icon className="h-5 w-5" /></div><p className="mt-2 text-[9px] font-bold tracking-[0.1em]">{label}</p></div>)}</div>
            <p className="mt-7 border-t border-white/25 pt-4 text-xs leading-5 text-white/75">From orchard insight to dependable customer delivery.</p>
          </motion.aside>
        </div>
      </section>

      <section className="border-b border-[#e8f5e9] bg-[#f9fcfa] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <ProductFeature />
        </div>
      </section>

      <section className="bg-[#2e7d32] px-5 py-7 text-center sm:px-8"><p className="font-heading text-xl font-black tracking-tight text-white sm:text-2xl">Empowering mango agriculture with intelligent support.</p></section>

      <section className="bg-[#f9fcfa] px-5 py-16 sm:px-8 sm:py-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} transition={{ duration: 0.5 }} className="home-orchard-media relative mx-auto max-w-5xl overflow-hidden border-[9px] border-white bg-[#1b5e20] shadow-[0_20px_45px_rgba(32,63,38,.16)]">
          <img src="/pages/farm-hero-reference.webp" alt="JBA GreenGold mango orchards and farm locations" className="w-full h-auto" loading="lazy" />
          <div className="absolute inset-0 grid place-items-center bg-[#123524]/15"><a href={WHATSAPP_SUPPORT_URL} target="_blank" rel="noreferrer" aria-label="Speak to our WhatsApp support team" className="grid h-16 w-16 place-items-center rounded-full bg-[#2e7d32] text-white shadow-xl transition-transform hover:scale-110"><CirclePlay className="h-9 w-9" /></a></div>
          <div className="home-media-caption flex flex-wrap items-center justify-between gap-2 bg-[#123524]/85 px-4 py-3 text-xs text-white sm:px-6"><span className="font-bold">JBA GreenGold · From orchard to customer</span><span>See how we work</span></div>
        </motion.div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-24">
        <SectionHeading eyebrow="JBA CONNECT · 24/7 CUSTOMER SUPPORT" title="Personal support, whenever you need it.">Every client receives the time, detailed attention, and clear guidance needed to keep orders, deliveries, and questions moving with confidence—day or night.</SectionHeading>
        <div className="mx-auto mt-16 max-w-5xl space-y-20">
          <article className="jba-whatsapp-support relative grid overflow-hidden p-5 sm:p-8">
            <motion.div initial={{ opacity: 0, x: -22 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="jba-whatsapp-artwork relative mx-auto flex w-full items-center justify-center">
              <img src="/brand/jba-whatsapp-support.png" alt="JBA GreenGold Orchard WhatsApp customer support, available 24 hours a day" loading="lazy" decoding="async" />
            </motion.div>
            <div className="jba-whatsapp-content relative flex flex-col justify-center py-7 md:py-10"><p className="jba-whatsapp-eyebrow text-xs font-black tracking-[0.14em]">JBA CONNECT · 24/7 CUSTOMER CARE</p><h3 className="mt-3 font-heading text-3xl font-black leading-tight tracking-tight">WhatsApp support that feels close to home.</h3><p className="jba-whatsapp-copy mt-5 max-w-lg text-sm leading-7">Chat directly with the JBA GreenGold team for product information, order help, delivery updates, and supply enquiries—whenever you need us.</p><div className="mt-7 flex flex-wrap gap-3"><a href={WHATSAPP_SUPPORT_URL} target="_blank" rel="noreferrer" className="home-action jba-whatsapp-primary inline-flex h-12 items-center gap-2 px-5 text-sm font-black transition-colors"><MessageCircle className="h-4 w-4" /> Chat on WhatsApp</a><Link to="/contact" className="home-action jba-whatsapp-secondary inline-flex h-12 items-center gap-2 px-5 text-sm font-black transition-colors">Contact our team <ArrowRight className="h-4 w-4" /></Link></div><p className="jba-whatsapp-proof mt-5 flex items-center gap-2 text-xs font-bold"><span /> Instant replies · Expert support · Farm guidance</p></div>
          </article>
        </div>
      </section>

      <section className="bg-[#f4fbf5] px-5 py-20 sm:px-8">
        <SectionHeading eyebrow="JBA FARM LOCATIONS" title="Our orchards are mapped, connected, and ready to grow." />
        <div className="mx-auto mt-11 grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,.8fr)] lg:items-center">
          <FarmMapExplorer farms={publicFarms} />
          <div>
            <div className="flex items-center gap-3 border-b border-[#e8f5e9] pb-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#2e7d32] text-white"><Navigation className="h-5 w-5" /></span><div><p className="text-xs font-black tracking-[0.1em] text-[#2e7d32]">5 ORCHARDS · GHANA</p><p className="text-sm text-[#355e3b]">Select a farm to explore its profile.</p></div></div>
            <ul className="divide-y divide-[#e8f5e9]">{publicFarms.map((farm) => <li key={farm.id}><Link to={`/farms/${farm.slug}`} className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-[#2e7d32]"><span><span className="block text-sm font-black">{farm.name}</span><span className="mt-0.5 block text-xs text-[#5f7565]">{farm.region}</span></span><span className="text-right text-[10px] font-bold text-[#2e7d32]">{farm.coordinates}</span></Link></li>)}</ul>
            <div className="mt-6"><SmallAction to="/farms">Explore farm locations</SmallAction></div>
          </div>
        </div>
      </section>

      <AudienceShowcase />

      <QualityStandardsShowcase />

      <CustomerStories />
    </div>
  );
}
