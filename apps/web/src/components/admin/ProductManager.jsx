import AdminActionButton from '@/components/admin/AdminActionButton';
import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { mergeCatalog, PRODUCT_CATEGORIES, formatProductPrice } from '@/data/productCatalog';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DataTable from '@/components/shared/DataTable';

const emptyProduct = { name: '', description: '', category: 'fresh', price: '', image: '', status: 'published' };

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [imageReady, setImageReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const load = async () => {
    try {
      const records = await base44.entities.Product.listAll('-created_date');
      setProducts(mergeCatalog(records, true));
      setError('');
    } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); return subscribeToDataChanges(load, ['Product']); }, []);
  const edit = (product) => { setEditing({ ...product }); setFormError(''); setImageReady(false); setNotice(''); };
  const update = (key, value) => { setEditing(current => ({ ...current, [key]: value })); if (key === 'image') setImageReady(false); };
  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) {
      setFormError('Choose a JPG, PNG, or WebP image up to 5 MB.');
      return;
    }
    setUploading(true); setFormError('');
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      const uploaded = await base44.files.uploadProductImage(file);
      update('image', uploaded.url);
    } catch (failure) {
      setFormError(failure.message || 'Image could not be uploaded. Please try another image.');
    } finally { setUploading(false); }
  };
  const save = async (event) => {
    event.preventDefault();
    if (uploading) return;
    if (!imageReady) { setFormError('Upload an image or enter a working image URL, then wait for the preview to load.'); return; }
    setSaving(true); setFormError('');
    try {
      const payload = {
        storefront: true, catalog_id: editing.id || crypto.randomUUID(),
        name: editing.name.trim(), description: editing.description.trim(),
        category: editing.category, price: Number(editing.price), image: editing.image.trim(), status: editing.status,
      };
      if (editing.recordId) await base44.entities.Product.update(editing.recordId, payload);
      else await base44.entities.Product.create(payload);
      await load();
      setNotice(`${payload.name} saved${payload.status === 'published' ? ' and published to Products.' : ' as a draft.'}`);
      setEditing(null);
    } catch (failure) { setFormError(failure.message || 'Product could not be saved. Please try again.'); }
    finally { setSaving(false); }
  };
  return <section aria-label="Manage products" className="space-y-4">
    <div className="flex flex-wrap items-center justify-end gap-3"><Button disabled={loading || !!error} onClick={() => edit(emptyProduct)}><Plus className="mr-2 h-4 w-4" />Add Product</Button></div>
    {notice && <p role="status" className="text-green-700">{notice}</p>}
    {error && <p role="alert">{error} <Button variant="outline" onClick={load}>Retry</Button></p>}
    {loading ? <p role="status">Loading products…</p> : <DataTable items={products} columns={[
      { key: 'name', label: 'Product', render: (name, product) => <div className="flex items-center gap-3"><img src={product.image} alt="" className="h-12 w-12 rounded object-contain" /><span>{name}</span></div> },
      { key: 'category', label: 'Category', render: value => PRODUCT_CATEGORIES.find(category => category.id === value)?.label || value },
      { key: 'price', label: 'Price', format: formatProductPrice },
      { key: 'status', label: 'Status' },
    ]} rowActions={product => <AdminActionButton action="edit" disabled={!!error} aria-label={`Edit ${product.name}`} onClick={() => edit(product)} />} />}
    <Dialog open={!!editing} onOpenChange={open => { if (!open && !saving && !uploading) setEditing(null); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{editing?.id ? 'Edit Product' : 'Add Product'}</DialogTitle><DialogDescription>Published products appear in the shop. Images fit the same fixed frame as existing products.</DialogDescription></DialogHeader>
        {editing && <form onSubmit={save}><fieldset disabled={saving || uploading} className="space-y-4">
          <div><Label htmlFor="product-name">Product name</Label><Input id="product-name" required maxLength={120} value={editing.name} onChange={event => update('name', event.target.value)} /></div>
          <div><Label htmlFor="product-description">Description</Label><Textarea id="product-description" required maxLength={1000} value={editing.description} onChange={event => update('description', event.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4"><div><Label htmlFor="product-category">Category</Label><select id="product-category" className="h-10 w-full rounded border bg-background px-2" value={editing.category} onChange={event => update('category', event.target.value)}>{PRODUCT_CATEGORIES.filter(category => category.id !== 'all').map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select></div><div><Label htmlFor="product-price">Price (₵)</Label><Input id="product-price" type="number" min="0" max="10000000" step="0.01" required value={editing.price} onChange={event => update('price', event.target.value)} /></div></div>
          <div className="space-y-2"><Label htmlFor="product-image-upload">Upload product image</Label><Input id="product-image-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} /><p className="text-xs text-muted-foreground">JPG, PNG, or WebP, up to 5 MB. Or paste an image link below.</p>{uploading && <p role="status" className="text-sm">Uploading image�</p>}</div>
          <div><Label htmlFor="product-image">Image URL or site path</Label><Input id="product-image" required maxLength={2048} placeholder="https://… or /products/…" value={editing.image} onChange={event => update('image', event.target.value)} />{editing.image && <img key={editing.image} src={editing.image} alt="Product image preview" className="mt-2 h-36 w-full rounded bg-muted object-contain" onLoad={() => setImageReady(true)} onError={() => setImageReady(false)} />}</div>
          <div><Label htmlFor="product-status">Status</Label><select id="product-status" className="h-10 w-full rounded border bg-background px-2" value={editing.status} onChange={event => update('status', event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></div>
          {formError && <p role="alert" className="text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing.status === 'published' ? 'Save & Publish' : 'Save Draft'}</Button></div>
        </fieldset></form>}
      </DialogContent>
    </Dialog>
  </section>;
}
