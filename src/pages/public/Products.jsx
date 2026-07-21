import React, { useEffect, useState } from 'react';
import { Sprout, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';

const PRODUCT_IMAGE_BY_NAME = {
  'Premium Kent Mango': '/products/box-package.png',
  'Dried Mango Slices': '/products/dried-mango.png',
  'Mango Pulp': '/products/mango-pudding.png',
};

const BRANDED_PRODUCT_CARDS = [
  {
    id: 'branded_dehydrated_mango_jar',
    name: 'Dehydrated Mango Jar',
    sku: 'MNG-JAR-180',
    product_type: 'dried',
    variety: 'Premium dried mango',
    description: '180g jar format for premium dehydrated mango slices.',
    price: 32000,
    unit_of_measure: 'jar',
    image_url: '/products/dried-mango-jar.png',
    is_active: true,
  },
  {
    id: 'branded_mango_pudding',
    name: 'Mango Pudding with Milk',
    sku: 'MNG-PUD-150',
    product_type: 'pulp',
    variety: 'Ready-to-eat dessert',
    description: '150g mango pudding pouch with milk for retail shelves.',
    price: 18000,
    unit_of_measure: 'pouch',
    image_url: '/products/mango-pudding.png',
    is_active: true,
  },
];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    base44.entities.Product.filter({ is_active: true }, '-featured')
      .then((data) => { setProducts(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const productCatalog = [
    ...products.map((product) => ({
      ...product,
      image_url: PRODUCT_IMAGE_BY_NAME[product.name] || product.image_url,
    })),
    ...BRANDED_PRODUCT_CARDS.filter((branded) => !products.some((product) => product.name === branded.name)),
  ];

  const filtered = productCatalog.filter((p) => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.product_type === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <section className="bg-gradient-to-br from-amber-600 to-orange-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white">Our Mango Products</h1>
          <p className="mt-2 text-amber-50">Premium mangoes and mango-based products from our farms to your table.</p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search products by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="fresh_fruit">Fresh Fruit</SelectItem>
                <SelectItem value="dried">Dried Mango</SelectItem>
                <SelectItem value="juice">Mango Juice</SelectItem>
                <SelectItem value="pulp">Mango Pulp</SelectItem>
                <SelectItem value="concentrate">Concentrate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? (
              [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />)
            ) : filtered.length > 0 ? (
              filtered.map((product) => (
                <div key={product.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg">
                  <div className="aspect-square overflow-hidden bg-white">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="h-full w-full object-contain p-3 transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-emerald-100">
                        <Package className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-medium text-primary">{product.product_type?.replace('_', ' ')}</span>
                    <h3 className="mt-1 font-heading font-semibold">{product.name}</h3>
                    {product.variety && <p className="text-xs text-muted-foreground">{product.variety}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-heading font-bold text-primary">UGX {product.price?.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">/{product.unit_of_measure}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Sprout className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-3 text-muted-foreground">No products found.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
