import React, { useState } from 'react';
import { Plus, Search, ShoppingCart } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PRODUCT_CATALOG, PRODUCT_CATEGORIES, formatProductPrice } from '@/data/productCatalog';
import { useCart } from '@/lib/CartContext';

export default function PortalProducts() {
  const { addItem, openCart, itemCount } = useCart();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const visibleProducts = PRODUCT_CATALOG.filter((product) =>
    (category === 'all' || product.category === category)
    && `${product.name} ${product.description}`.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div>
      <PageHeader title="Products" description="Browse our products and add items to your basket.">
        <Button onClick={openCart}><ShoppingCart className="mr-2 h-4 w-4" />View basket ({itemCount})</Button>
      </PageHeader>
      <div className="mb-6 flex flex-col gap-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input aria-label="Search products" placeholder="Search products..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
        </div>
        <div role="group" aria-label="Filter products by category" className="flex flex-wrap gap-2">
          {PRODUCT_CATEGORIES.map((item) => (
            <Button key={item.id} variant="outline" aria-pressed={category === item.id} data-selected={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</Button>
          ))}
        </div>
      </div>
      <p role="status" className="mb-4 text-sm text-muted-foreground">{visibleProducts.length} products</p>
      {visibleProducts.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((product) => (
            <article key={product.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex h-48 items-center justify-center bg-white p-4"><img src={product.image} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-contain" /></div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="font-heading text-lg font-semibold">{product.name}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{product.description}</p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <span className="font-semibold">{formatProductPrice(product.price)}</span>
                  <Button size="sm" onClick={() => addItem(product.id)} aria-label={`Add ${product.name} to basket`}><Plus className="mr-1 h-4 w-4" />Add to basket</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : <p className="py-12 text-center text-muted-foreground">No products match your search. Try another name or category.</p>}
    </div>
  );
}
