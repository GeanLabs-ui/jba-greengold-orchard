import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, Globe2, Leaf, Mail, ShieldCheck, ShoppingCart, SlidersHorizontal, Sprout } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { formatProductPrice } from '@/data/productCatalog';
import './products-reference.css';

const categories = [['all', 'All Products'], ['fresh', 'Fresh Mangoes'], ['dried', 'Dried Mango'], ['drinks', 'Juices & Drinks'], ['preserves', 'Jams & Pickles'], ['gifts', 'Gift Packs'], ['export', 'Export Range']];
const promises = [[Leaf, '100% Natural'], [ShieldCheck, 'No Added Preservatives'], [Sprout, 'Farm Fresh'], [Globe2, 'Proudly Ghanaian']];
const belongsTo = (product, category) => category === 'all' || (category === 'fresh' ? (product.category === 'fresh' || product.id === 'fresh-mango-export-box') : product.category === category);


function ProductCard({ product }) {
  const { addItem, lastAddedId } = useCart();
  const added = lastAddedId === product.id;
  return <article className="shop-card">
    <div className="shop-card-image"><img src={product.image} alt={product.name} loading="lazy" /></div>
    <div className="shop-card-copy"><h3>{product.name}</h3><p>{product.description}</p>
      <strong>{formatProductPrice(product.price)}{product.id === 'fresh-mango-export-box' && ' / Box'}</strong>
      <button type="button" onClick={() => addItem(product.id)} aria-label={`Add ${product.name} to basket`}>{added ? <Check /> : <ShoppingCart />} {added ? 'Added to Cart' : 'Add to Cart'}</button>
    </div>
  </article>;
}

export default function Products() {
  const { products: catalog, catalogLoading, catalogError } = useCart();
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [price, setPrice] = useState(null);
  const [appliedPrice, setAppliedPrice] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const maximumPrice = Math.max(500, ...catalog.map(product => Math.ceil(product.price / 5) * 5));
  const selectedPrice = price ?? maximumPrice;
  const navigate = useNavigate();
  const displayProducts = useMemo(() => {
    const products = catalog.filter((product) => belongsTo(product, category) && (appliedPrice === null || product.price <= appliedPrice));
    if (sort === 'price-low') products.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') products.sort((a, b) => b.price - a.price);
    if (sort === 'name') products.sort((a, b) => a.name.localeCompare(b.name));
    return products;
  }, [catalog, category, appliedPrice, sort]);
  const clearFilters = () => { setCategory('all'); setPrice(null); setAppliedPrice(null); };
  const requestUpdates = (event) => { event.preventDefault(); navigate('/contact?topic=updates', { state: { newsletterEmail: new FormData(event.currentTarget).get('email') } }); };
  return <div className="products-shop">
    <section className="shop-hero" aria-labelledby="products-heading">
      <div className="shop-hero-inner"><p className="shop-eyebrow">Our products</p>
        <h1 id="products-heading">Pure Mango<br />Goodness,<br /><span>Naturally.</span></h1>
        <p className="shop-hero-description">From our orchards in Ghana to your table — fresh,<br className="shop-desktop-break" /> healthy and naturally delicious.</p>
        <div className="shop-promises">{promises.map(([Icon, label]) => <div key={label}><Icon /><span>{label}</span></div>)}</div>
      </div>
    </section>
    <div className="shop-container">
      <nav className="shop-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><ChevronRight /><span aria-current="page">Products</span></nav>
      <button className="shop-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="shop-filters" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal /> Categories & Filters</button>
      <div className="shop-layout">
        <aside id="shop-filters" className={`shop-filters ${filtersOpen ? 'is-open' : ''}`} aria-label="Product filters">
          <h2>Categories</h2><div className="shop-categories">{categories.map(([id, label]) => <button type="button" key={id} aria-pressed={category === id} onClick={() => setCategory(id)}><span>{label}</span><small>({catalog.filter((product) => belongsTo(product, id)).length})</small></button>)}</div>
          <form onSubmit={(event) => { event.preventDefault(); setAppliedPrice(selectedPrice); setFiltersOpen(false); }}>
            <fieldset><legend>Price Range</legend><label className="sr-only" htmlFor="shop-max-price">Maximum price</label><input id="shop-max-price" type="range" min="0" max={maximumPrice} step="5" value={selectedPrice} onChange={(event) => setPrice(Number(event.target.value))} /><div className="shop-price-labels"><span>₵ 0</span><output htmlFor="shop-max-price">₵ {selectedPrice}</output></div></fieldset>
            <button className="shop-apply" type="submit">Apply Filters</button><button className="shop-clear" type="button" onClick={clearFilters}>Clear All</button>
          </form>
          <p className="shop-filter-help">Looking for bulk quantities?<br /><Link to="/contact?topic=supply">Request a quote <ArrowRight /></Link></p>
        </aside>
        <section className="shop-catalog" aria-labelledby="shop-catalog-heading">
          <header className="shop-catalog-head"><h2 id="shop-catalog-heading">{categories.find(([id]) => id === category)?.[1]} <span aria-live="polite">({displayProducts.length})</span></h2><label><span className="sr-only">Sort products</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Sort by: Newest</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option><option value="name">Name: A to Z</option></select></label></header>
          {catalogLoading && <p role="status">Loading products…</p>}{catalogError && <p role="alert">{catalogError}</p>}
          <div className="shop-grid">{displayProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          {!catalogLoading && !catalogError && !displayProducts.length && <div className="shop-empty"><h3>No products in this price range</h3><p>Try increasing your maximum price or clearing the filters.</p><button type="button" onClick={clearFilters}>Clear Filters</button></div>}
          <p className="shop-result-count" aria-live="polite">Showing {displayProducts.length} of {catalog.length} products</p>
        </section>
      </div>
    </div>
    <section className="shop-newsletter"><div className="shop-newsletter-inner"><Mail className="shop-newsletter-icon" /><div><h2>Stay Fresh with Us</h2><p>Get the latest product updates, harvest news and special offers.</p></div><form onSubmit={requestUpdates}><label className="sr-only" htmlFor="products-email">Your email address</label><input id="products-email" name="email" type="email" placeholder="Your email address" required /><button type="submit">Get updates <ArrowRight /></button></form></div></section>
  </div>;
}
