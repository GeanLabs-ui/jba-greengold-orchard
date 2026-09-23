export { PRODUCT_CATALOG, mergeCatalog } from '../../../../packages/catalog/catalog';
import { PRODUCT_CATALOG } from '../../../../packages/catalog/catalog';
export const PRODUCT_CATEGORIES = [
  { id: 'all', label: 'All Products' },
  { id: 'fresh', label: 'Fresh Mangoes' },
  { id: 'dried', label: 'Dried Mango' },
  { id: 'drinks', label: 'Juices & Drinks' },
  { id: 'preserves', label: 'Jams & Pickles' },
  { id: 'gifts', label: 'Gift Packs' },
  { id: 'export', label: 'Export Range' },
];

export const PRODUCT_BY_ID = Object.fromEntries(PRODUCT_CATALOG.map((product) => [product.id, product]));
export const formatProductPrice = (value) => `₵ ${Number(value || 0).toFixed(2)}`;
