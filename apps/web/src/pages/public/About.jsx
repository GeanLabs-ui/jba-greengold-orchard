import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Globe2,
  HandHeart,
  Leaf,
  ShieldCheck,
  Sprout,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const heroPromises = [
  { icon: Leaf, lineOne: '100%', lineTwo: 'Natural' },
  { icon: HandHeart, lineOne: 'Sustainable', lineTwo: 'Farming' },
  { icon: ShieldCheck, lineOne: 'Premium', lineTwo: 'Quality' },
  { icon: Globe2, lineOne: 'Proudly', lineTwo: 'African' },
];

const leadershipProfiles = [
  {
    name: 'Name to be added',
    role: 'Co-Chief Executive Officer',
    chapter: 'The orchard story',
    image: '/pages/about-leader-orchard.webp',
    imageAlt: 'Temporary portrait for the orchard-focused co-chief executive profile',
    story: 'This profile will share the personal journey that shaped the orchard: the early conviction, the lessons learned from the land, and the commitment to grow fruit with patience, care, and respect for the people behind every harvest.',
    vision: 'To build an orchard business where quality begins in the soil and every growing decision protects the future.',
  },
  {
    name: 'Name to be added',
    role: 'Co-Chief Executive Officer',
    chapter: 'The market story',
    image: '/pages/about-leader-market.webp',
    imageAlt: 'Temporary portrait for the market-focused co-chief executive profile',
    story: 'This profile will tell the complementary leadership story behind GreenGold: turning a seasonal harvest into thoughtful products, opening dependable routes to market, and carrying Ghanaian mangoes from the orchard to tables near and far.',
    vision: 'To create lasting value from every harvest and make the GreenGold name a trusted mark of Ghanaian quality.',
  },
];

const principles = [
  {
    icon: Sprout,
    title: 'Grow with care',
    body: 'Healthy orchards, responsible farming, and decisions measured in generations rather than seasons.',
  },
  {
    icon: HandHeart,
    title: 'Create with purpose',
    body: 'Natural mango products designed to preserve flavour, reduce waste, and honour the harvest.',
  },
  {
    icon: UsersRound,
    title: 'Share with confidence',
    body: 'Consistent quality and a distinctly Ghanaian story, prepared for customers at home and around the world.',
  },
];

const serif = { fontFamily: 'Georgia, Cambria, "Times New Roman", serif' };

export default function About() {
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.12 },
        transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <div className="overflow-hidden bg-[#fbf7ed] text-[#0b432f]">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="relative isolate min-h-[calc(100svh-4rem)] bg-[#f4efdf] lg:min-h-[690px]"
        aria-labelledby="about-hero-heading"
      >
        <div className="absolute inset-y-0 right-0 hidden w-[62%] lg:block">
          <img
            src="/pages/about-hero-reference.webp"
            alt="JBA GreenGold mango products arranged in a harvest basket in the orchard"
            className="h-full w-full object-cover object-center"
            decoding="async"
          />
          <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#f4efdf] to-transparent" />
        </div>

        <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center px-5 py-16 sm:px-8 lg:min-h-[690px] lg:grid-cols-[0.43fr_0.57fr] lg:px-10 lg:py-20">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 max-w-xl"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#a66b0b]">
              Grown by nature. Shared by choice.
            </p>
            <h1
              id="about-hero-heading"
              style={serif}
              className="mt-7 text-[3.35rem] font-normal uppercase leading-[0.98] tracking-[0.015em] text-[#0b432f] sm:text-6xl lg:text-[4.5rem]"
            >
              Naturally<br />grown.<br />
              <span className="text-[#b17816]">Carefully<br />shared.</span>
            </h1>
            <p className="mt-7 max-w-sm text-base leading-7 text-[#243d32] sm:text-lg">
              Premium mangoes and natural products from our orchard to your table.
            </p>

            <div className="mt-10 grid max-w-lg grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-4">
              {heroPromises.map((promise) => (
                <div key={promise.lineTwo} className="text-center sm:text-left">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#0b432f] sm:mx-0">
                    <promise.icon className="h-5 w-5" strokeWidth={1.35} />
                  </span>
                  <p className="mt-3 text-[10px] font-bold uppercase leading-4 tracking-[0.06em]">
                    {promise.lineOne}<br />{promise.lineTwo}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="mt-12 overflow-hidden rounded-t-[2rem] lg:hidden">
            <img
              src="/pages/about-hero-reference.webp"
              alt="JBA GreenGold mango products arranged in a harvest basket in the orchard"
              className="aspect-[1.15/1] w-full object-cover"
              decoding="async"
            />
          </div>
        </div>
      </motion.section>

      <section className="relative px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="pointer-events-none absolute -right-24 top-28 h-72 w-72 rounded-full border border-[#dba63d]/20" />
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24">
          <motion.div {...reveal} className="flex flex-col">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#a66b0b]">Why GreenGold exists</p>
            <h2 style={serif} className="mt-6 max-w-lg text-5xl font-normal leading-[1.08] sm:text-6xl lg:text-[4.25rem]">
              An orchard idea with a much bigger horizon.
            </h2>
            <div className="mt-8 h-px w-14 bg-[#c68a20]" />
            <img
              src="/pages/about-farm-sketch.webp"
              alt="Line illustration of a mango orchard and rolling farm fields"
              className="mt-10 w-full max-w-md mix-blend-multiply"
              loading="lazy"
              decoding="async"
            />
          </motion.div>

          <motion.div {...reveal} className="lg:pt-8">
            <p style={serif} className="max-w-2xl text-3xl font-normal leading-[1.28] sm:text-[2.1rem]">
              JBA GreenGold Orchard was built around a simple belief: what is grown naturally and carefully should be shared just as thoughtfully.
            </p>
            <div className="mt-8 max-w-2xl space-y-6 text-[15px] leading-7 text-[#506057]">
              <p>
                Our work begins in the orchard, where patience, timing, and stewardship shape the quality of every mango. It continues through careful handling and product-making that keeps the fruit&apos;s character at the centre.
              </p>
              <p>
                Fresh mangoes are only one expression of the harvest. Dried fruit, juice, jam, pickles, and other natural products allow more of each season to be enjoyed, create more value close to home, and open new possibilities beyond the farm gate.
              </p>
            </div>

            <div className="mt-10 border-y border-[#0b432f]/15">
              {['Rooted in Ghana', 'Natural by intention', 'Built for lasting value'].map((line, index) => (
                <div key={line} className="flex items-center gap-4 border-b border-[#0b432f]/15 py-4 last:border-b-0">
                  <Leaf className="h-5 w-5 shrink-0 text-[#d0921c]" strokeWidth={1.35} />
                  <span className="text-sm font-medium">{line}</span>
                  <span className="ml-auto text-xs font-bold text-[#a66b0b]">0{index + 1}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative bg-[#063c2b] px-5 py-20 text-[#fffaf0] sm:px-8 lg:px-10 lg:py-24">
        <Leaf className="pointer-events-none absolute -right-16 top-4 h-72 w-72 rotate-[-18deg] text-white/[0.05]" strokeWidth={0.45} />
        <div className="relative mx-auto max-w-7xl">
          <motion.div {...reveal} className="grid gap-8 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#e1a327]">Our leadership</p>
              <h2 style={serif} className="mt-5 max-w-xl text-5xl font-normal leading-[1.02] sm:text-6xl lg:text-[4.25rem]">
                Two leaders.<br />One shared <span className="text-[#e1a327]">vision.</span>
              </h2>
            </div>
            <p className="max-w-lg text-base leading-7 text-white/80 lg:justify-self-end">
              GreenGold is guided by two CEOs whose stories come together around the same ambition: nurture the orchard, honour the harvest, and build something that can outlive its founders.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-16 xl:grid-cols-2 xl:gap-12">
            {leadershipProfiles.map((leader, index) => (
              <motion.article
                key={leader.chapter}
                {...reveal}
                transition={{ duration: 0.65, delay: index * 0.1 }}
                className="grid items-start gap-8 sm:grid-cols-[0.75fr_1.25fr]"
              >
                <div className="group overflow-hidden rounded-[1.2rem] border border-[#dca32d] bg-[#0a533b]">
                  <img
                    src={leader.image}
                    alt={leader.imageAlt}
                    className="aspect-[151/221] h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.23em] text-[#e1a327]">{leader.chapter}</p>
                  <h3 style={serif} className="mt-3 text-3xl font-normal leading-tight">{leader.name}</h3>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/70">{leader.role}</p>
                  <p className="mt-6 text-[13px] leading-6 text-white/75">{leader.story}</p>
                  <blockquote className="mt-6 border-l-2 border-[#dca32d] pl-4 text-sm font-semibold leading-6 text-[#fff8e8]">
                    “{leader.vision}”
                  </blockquote>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...reveal} className="relative min-h-[210px] lg:pr-[34%]">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#a66b0b]">The vision behind the orchard</p>
            <h2 style={serif} className="mt-6 max-w-5xl text-4xl font-normal leading-[1.12] sm:text-5xl lg:text-[3.75rem]">
              Make every harvest matter — on the farm, in the community, <span className="text-[#b57916]">and at the table.</span>
            </h2>
            <img
              src="/pages/about-mango-reference.webp"
              alt="A ripe mango and a golden diced mango half"
              className="mx-auto mt-10 w-full max-w-md mix-blend-multiply lg:absolute lg:-right-4 lg:-top-10 lg:mt-0 lg:w-[38%] lg:max-w-none"
              loading="lazy"
              decoding="async"
            />
          </motion.div>

          <div className="mt-12 grid border-y border-[#0b432f]/15 md:grid-cols-3 lg:w-[70%]">
            {principles.map((principle, index) => (
              <motion.div
                key={principle.title}
                {...reveal}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                className="border-b border-[#0b432f]/15 py-8 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0"
              >
                <principle.icon className="h-8 w-8 text-[#d0921c]" strokeWidth={1.25} />
                <h3 className="mt-5 text-lg font-semibold">{principle.title}</h3>
                <p className="mt-4 text-xs leading-6 text-[#59675f]">{principle.body}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            {...reveal}
            className="relative mt-16 overflow-hidden rounded-[1.4rem] bg-[#dfa11e] px-6 py-9 text-[#083b2b] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] sm:px-10 lg:px-14"
          >
            <div className="absolute -left-10 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full border border-white/25" />
            <div className="relative grid gap-8 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <Leaf className="hidden h-12 w-12 text-white/80 sm:block" strokeWidth={1} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white">Grow with us</p>
                <h2 style={serif} className="mt-2 max-w-xl text-3xl font-normal leading-tight sm:text-4xl">
                  From our orchard<br />to your next opportunity.
                </h2>
              </div>
              <Link
                to="/contact"
                className="inline-flex w-fit items-center gap-4 rounded-full bg-[#063c2b] px-7 py-4 text-sm font-medium text-white transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[#0a5039] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#063c2b]"
              >
                Start a conversation <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
