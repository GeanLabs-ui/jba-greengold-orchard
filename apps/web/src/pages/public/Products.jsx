import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Globe2,
  Leaf,
  Plus,
  ShieldCheck,
  WheatOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';
import { formatProductPrice } from '@/data/productCatalog';

const categories = [
  { id: 'all', label: 'All Products' },
  { id: 'dried', label: 'Dried Mango' },
  { id: 'drinks', label: 'Juices & Drinks' },
  { id: 'preserves', label: 'Jams & Pickles' },
  { id: 'gifts', label: 'Gift Packs' },
  { id: 'export', label: 'Export Range' },
];

const products = [
  {
    id: 'dried-mango',
    name: 'Dried Mango',
    category: 'dried',
    description: '100% natural sun-dried mango slices with no sugar added.',
    price: 25,
    image: '/products/catalog-dried-mango.webp',
  },
  {
    id: 'mango-juice',
    name: 'Mango Juice',
    category: 'drinks',
    description: 'Pure mango juice made from fresh, ripe mangoes.',
    price: 20,
    image: '/products/catalog-mango-juice.webp',
  },
  {
    id: 'wild-mango-wine',
    name: 'Wild Mango Wine',
    category: 'drinks',
    description: 'Premium wild mango wine crafted naturally.',
    price: 85,
    image: '/products/catalog-wild-mango-wine.webp',
  },
  {
    id: 'mango-jam',
    name: 'Mango Jam',
    category: 'preserves',
    description: 'Rich and fruity mango jam perfect for every meal.',
    price: 25,
    image: '/products/catalog-mango-jam.webp',
  },
  {
    id: 'mango-pickle',
    name: 'Mango Pickle',
    category: 'preserves',
    description: 'Tangy and spicy mango pickle made with natural ingredients.',
    price: 22,
    image: '/products/catalog-mango-pickle.webp',
  },
  {
    id: 'dehydrated-mango',
    name: 'Dehydrated Mango',
    category: 'dried',
    description: 'Naturally sweet dried mango with no preservatives.',
    price: 30,
    image: '/products/catalog-dehydrated-mango.webp',
  },
  {
    id: 'gift-pack-small',
    name: 'Gift Pack (Small)',
    category: 'gifts',
    description: 'A perfect gift of nature\'s goodness.',
    price: 95,
    image: '/products/catalog-gift-small.webp',
  },
  {
    id: 'gift-pack-large',
    name: 'Gift Pack (Large)',
    category: 'gifts',
    description: 'A premium selection for special moments.',
    price: 160,
    image: '/products/catalog-gift-large.webp',
  },
  {
    id: 'fresh-mango-export-box',
    name: 'Fresh Mango Export Box',
    category: 'export',
    description: '4kg export-grade carton for fresh mangoes and cold-chain delivery.',
    price: 120,
    image: '/products/box-package.webp',
  },
  {
    id: 'dried-mango-pouch',
    name: 'Dried Mango Pouch',
    category: 'export',
    description: '250g retail pouch of naturally dried mango slices.',
    price: 25,
    image: '/products/dried-mango.webp',
  },
  {
    id: 'dehydrated-mango-jar',
    name: 'Dehydrated Mango Jar',
    category: 'export',
    description: '180g premium dehydrated mango jar for gift and retail shelves.',
    price: 32,
    image: '/products/dried-mango-jar.webp',
  },
  {
    id: 'mango-pudding-pouch',
    name: 'Mango Pudding Pouch',
    category: 'export',
    description: '150g ready-to-eat mango pudding with milk.',
    price: 18,
    image: '/products/mango-pudding.webp',
  },
];

const heroPromises = [
  { icon: Leaf, first: '100%', second: 'Natural' },
  { icon: WheatOff, first: 'No added', second: 'Preservatives' },
  { icon: ShieldCheck, first: 'Premium', second: 'Quality' },
  { icon: Globe2, first: 'Proudly', second: 'African' },
];

const serif = { fontFamily: 'Georgia, Cambria, "Times New Roman", serif' };

function ProductCard({ product, reveal, duplicate = false }) {
  const { addItem } = useCart();
  return (
    <motion.article
      {...reveal}
      className="group flex min-h-[430px] flex-col rounded-xl border border-[#0b432f]/12 bg-[#fffdf8] p-3 transition-all duration-300 hover:-translate-y-1 hover:border-[#c98d21]/55 hover:shadow-[0_18px_40px_rgba(32,55,43,0.08)]"
    >
      <div className="flex h-64 items-center justify-center overflow-hidden rounded-lg bg-[#fffefa]">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.035]"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
        <h3 style={serif} className="text-xl font-normal leading-tight text-[#0b432f]">{product.name}</h3>
        <p className="mt-2 text-xs leading-5 text-[#5b685f]">{product.description}</p>
        <div className="mt-auto flex items-center justify-between pt-5">
          <span className="text-sm font-bold text-[#102f23]">{formatProductPrice(product.price)}</span>
          <button
            type="button"
            onClick={() => addItem(product.id)}
            aria-label={`Add ${product.name} to basket`}
            tabIndex={duplicate ? -1 : undefined}
            className="flex h-9 items-center justify-center gap-2 rounded-full border border-[#cf9020] px-3 text-[11px] font-bold text-[#bd7b0c] transition-colors hover:bg-[#cf9020] hover:text-white"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function ProductMarqueeSet({ products: marqueeProducts, duplicate = false }) {
  return (
    <div className="jba-product-marquee-set" aria-hidden={duplicate ? true : undefined}>
      {marqueeProducts.map(({ product, repeated }, index) => (
        <div key={`${product.id}-${index}`} className="jba-product-marquee-card" aria-hidden={duplicate || repeated ? true : undefined}>
          <ProductCard product={product} reveal={{}} duplicate={duplicate || repeated} />
        </div>
      ))}
    </div>
  );
}

export default function Products() {
  const [activeCategory, setActiveCategory] = useState('all');
  const reduceMotion = useReducedMotion();
  const visibleProducts = useMemo(
    () => products.filter((product) => activeCategory === 'all' || product.category === activeCategory),
    [activeCategory],
  );
  const marqueeProducts = useMemo(() => {
    if (!visibleProducts.length) return [];
    const repeatCount = Math.max(1, Math.ceil(5 / visibleProducts.length));
    return Array.from({ length: repeatCount }, (_, repeatIndex) => (
      visibleProducts.map((product) => ({ product, repeated: repeatIndex > 0 }))
    )).flat();
  }, [visibleProducts]);
  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 22 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.1 },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <div className="overflow-hidden bg-[#fbf8ef] text-[#0b432f]">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="relative isolate min-h-[calc(100svh-4.5rem)] bg-[#f4efdf] lg:min-h-[630px]"
        aria-labelledby="products-heading"
      >
        <div className="absolute inset-y-0 right-0 hidden w-[63%] lg:block">
          <img
            src="/products/product-hero-reference.webp"
            alt="JBA GreenGold dried mango, mango juice, wine, jam, pickle, and dehydrated mango products"
            className="h-full w-full object-cover object-center"
            decoding="async"
          />
          <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#f4efdf] to-transparent" />
        </div>

        <div className="relative mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-7xl items-center px-5 py-14 sm:px-8 lg:min-h-[630px] lg:grid-cols-[0.42fr_0.58fr] lg:px-10">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 max-w-xl"
          >
            <h1 id="products-heading" style={serif} className="text-5xl font-normal leading-[1.02] sm:text-6xl lg:text-[4.6rem]">
              Pure mango.<br /><span className="text-[#bd8016]">Pure goodness.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-7 text-[#243d32]">
              From our orchard to your table — premium mangoes and natural products crafted with care and passion.
            </p>
            <a
              href="#product-catalog"
              className="mt-7 inline-flex items-center gap-5 rounded-lg bg-[#063c2b] px-7 py-4 text-sm font-medium text-white transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[#0a5039]"
            >
              Explore Our Products <ArrowRight className="h-4 w-4" />
            </a>

            <div className="mt-10 grid max-w-lg grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-4">
              {heroPromises.map((promise) => (
                <div key={promise.second} className="text-center sm:text-left">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#0b432f] sm:mx-0">
                    <promise.icon className="h-5 w-5" strokeWidth={1.3} />
                  </span>
                  <p className="mt-3 text-[10px] font-bold uppercase leading-4 tracking-[0.04em]">
                    {promise.first}<br />{promise.second}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="mt-12 overflow-hidden rounded-t-[2rem] lg:hidden">
            <img
              src="/products/product-hero-reference.webp"
              alt="JBA GreenGold mango product collection"
              className="aspect-[1.25/1] w-full object-cover"
              decoding="async"
            />
          </div>
        </div>
      </motion.section>

      <section id="product-catalog" className="relative px-5 pb-7 pt-20 sm:px-8 lg:px-10 lg:pb-7 lg:pt-24">
        <Leaf className="pointer-events-none absolute -right-20 top-12 h-72 w-72 rotate-[-22deg] text-[#d7a343]/10" strokeWidth={0.5} />
        <div className="relative mx-auto max-w-7xl">
          <motion.div {...reveal} className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#a66b0b]">Our products</p>
            <h2 style={serif} className="mt-5 text-4xl font-normal leading-tight sm:text-5xl lg:text-[3.5rem]">
              Naturally grown. Thoughtfully made.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#5a675f] sm:text-base">
              Each product is a reflection of our commitment to quality, sustainability, and the rich taste of Ghanaian mangoes.
            </p>
          </motion.div>

          <div className="mt-8 flex flex-wrap justify-center gap-3" role="group" aria-label="Filter products by category">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                aria-pressed={activeCategory === category.id}
                className={`rounded-full border px-6 py-3 text-xs font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'border-[#063c2b] bg-[#063c2b] text-white'
                    : 'border-[#0b432f]/15 bg-transparent text-[#284438] hover:border-[#b77b14] hover:text-[#a66b0b]'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          <motion.div {...reveal} className="jba-product-marquee mt-12" role="region" aria-label="Moving product showcase">
            <div key={activeCategory} className="jba-product-marquee-track">
              <ProductMarqueeSet products={marqueeProducts} duplicate />
              <ProductMarqueeSet products={marqueeProducts} />
            </div>
          </motion.div>

          <motion.div {...reveal} className="relative mt-12 overflow-hidden rounded-xl bg-[#063c2b] px-7 py-9 text-white sm:px-10 lg:px-14">
            <div className="relative z-10 grid gap-8 lg:grid-cols-[0.85fr_0.75fr_0.7fr] lg:items-center">
              <div className="flex items-center gap-6">
                <span className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-[#dfa11f] text-[#dfa11f] sm:flex">
                  <Leaf className="h-9 w-9" strokeWidth={1.1} />
                </span>
                <h2 style={serif} className="text-3xl font-normal leading-tight text-[#e2a322] sm:text-4xl">
                  From our orchard<br />to your next opportunity.
                </h2>
              </div>
              <div>
                <p className="max-w-sm text-sm leading-6 text-white/80">
                  We are more than a brand — we are a promise of quality, a commitment to sustainability, and a taste of Ghana.
                </p>
                <Link to="/about" className="mt-5 inline-flex items-center gap-5 rounded-md bg-[#e2a322] px-6 py-3 text-xs font-semibold text-[#063c2b] transition-colors hover:bg-[#f0b83e]">
                  Learn Our Story <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <img
                src="/products/product-cta-mango.webp"
                alt="Fresh whole and diced mango"
                className="mx-auto w-full max-w-xs mix-blend-screen lg:max-w-none"
                loading="lazy"
                decoding="async"
              />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
