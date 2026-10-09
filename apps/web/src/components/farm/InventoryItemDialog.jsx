import { useState } from 'react';
import { Info, ShoppingCart, Users, Wrench, Paperclip, Eye, UploadCloud, Save, CircleCheck, FileText, Box, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import './inventory-item-dialog.css';

const units = ['pcs', 'units', 'bags', 'litres', 'kg', 'tonnes', 'boxes'];
function Section({ title, icon: Icon, children, className = '' }) {
  return <section className={`ii-section ${className}`}><h3><Icon />{title}</h3>{children}</section>;
}
function Pill({ value }) { return <span className={`ii-pill ${['Damaged', 'Poor', 'Under Repair'].includes(value) ? 'ii-pill-alert' : ''}`}><i />{value}</span>; }

export default function InventoryItemDialog({ record, farms, blocks, items, preview, saving, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const remaining = record.remaining_quantity == null ? '' : String(record.remaining_quantity);
    const farm = farms.find(f => String(f.id) === String(record.farm_id) || [f.name, f.farm_name].some(name => name && name.replace(' Land', '') === record.farm_assigned));
    const block = blocks.find(b => String(b.id) === String(record.block_id) || (String(b.farm_id) === String(farm?.id) && [b.block_name, b.name, b.block_code].includes(record.current_location)));
    return { category: 'Equipment', status: 'Available', condition: 'Good', repair_status: 'Not Needed', repair_cost: '0.00', ...record, farm_id: record.farm_id || farm?.id || '', block_id: record.block_id || block?.id || '', remaining_quantity: remaining ? parseFloat(remaining) || 0 : '', unit: record.unit || remaining.match(/[a-z]+$/i)?.[0]?.replace(/^unit$/, 'units') || 'pcs' };
  });
  const [attachments, setAttachments] = useState(record.attachments || []);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const change = (key, value) => setForm(old => ({ ...old, [key]: value, ...(key === 'farm_id' ? { block_id: '', current_location: '' } : {}) }));
  const selectedFarm = farms.find(f => String(f.id) === String(form.farm_id));
  const selectedBlock = blocks.find(b => String(b.id) === String(form.block_id));
  const farmName = selectedFarm?.name || selectedFarm?.farm_name || form.farm_assigned || '—';
  const blockName = selectedBlock?.block_name || selectedBlock?.name || selectedBlock?.block_code || form.current_location || '—';
  const field = (key, label, { options, type = 'text', required = false, placeholder = '', help, className = '' } = {}) => <label className={`ii-field ${className}`} key={key}><span>{label}{required && <b> *</b>}</span>{options ? <select value={form[key] ?? ''} required={required} onChange={e => change(key, e.target.value)}><option value="">Select…</option>{options.map(option => { const value = typeof option === 'string' ? option : option.value; return <option value={value} key={value}>{typeof option === 'string' ? option : option.label}</option>; })}</select> : type === 'textarea' ? <textarea value={form[key] ?? ''} placeholder={placeholder} onChange={e => change(key, e.target.value)} /> : <input type={type} value={form[key] ?? ''} required={required} placeholder={placeholder} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} onChange={e => change(key, e.target.value)} />}{help && <small>{help}</small>}</label>;
  const addFiles = async files => {
    const selected = Array.from(files);
    if (selected.some(f => !['image/png', 'image/jpeg', 'application/pdf'].includes(f.type) || f.size > 5 * 1024 * 1024)) { setError('Choose PNG, JPG or PDF files up to 5 MB each.'); return; }
    setError('');
    const next = await Promise.all(selected.map(file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, url: reader.result, contentType: file.type, file }); reader.onerror = reject; reader.readAsDataURL(file); })));
    setAttachments(old => [...old, ...next]);
  };
  const submit = async (event) => {
    event.preventDefault();
    const draft = event.nativeEvent.submitter?.value === 'draft';
    if (!draft && Number(form.remaining_quantity || 0) > Number(form.quantity_purchased || 0)) { setError('Remaining quantity cannot exceed quantity purchased.'); return; }
    setError(''); setUploading(true);
    try {
      const prefix = { Tool: 'TL', Equipment: 'EQ', Material: 'MT' }[form.category] || 'EQ';
      const code = form.equipment_code?.trim() || `${prefix}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      if (items.some(item => item.id !== record.id && item.equipment_code === code)) { setError('This item ID is already in use. Enter a unique ID.'); return; }
      const uploaded = [];
      for (const attachment of attachments) {
        const { file, ...stored } = attachment;
        uploaded.push(file && !preview ? await base44.files.upload(file, code) : stored);
      }
      await onSave({ ...form, equipment_code: code, farm_assigned: farmName === '—' ? '' : farmName, current_location: blockName === '—' ? '' : blockName, purchase_cost: Number(form.purchase_cost || 0), repair_cost: Number(form.repair_cost || 0), quantity_purchased: Number(form.quantity_purchased || 0), remaining_quantity: Number(form.remaining_quantity || 0), minimum_stock_threshold: Number(form.minimum_stock_threshold || 0), attachments: uploaded, record_status: draft ? 'Draft' : 'Active', updated_date: new Date().toISOString(), created_date: record.created_date || new Date().toISOString() });
    } catch { setError('Unable to save this item. Please retry.'); } finally { setUploading(false); }
  };
  const busy = saving || uploading;
  const photo = attachments.find(a => a.contentType?.startsWith('image/'));
  const assignmentOptions = [...new Set(items.map(item => item.assigned_operator).filter(Boolean))];
  if (form.assigned_operator && !assignmentOptions.includes(form.assigned_operator)) assignmentOptions.push(form.assigned_operator);
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="ii-dialog" data-preserve-colors="true">
    <header className="ii-header ii-header-compact"><div className="sr-only"><DialogTitle>{record.id ? 'Edit Item' : 'Add New Item'}</DialogTitle><DialogDescription>Capture tools, equipment, and materials for inventory tracking.</DialogDescription></div><button className="ii-close" type="button" aria-label="Close item form" disabled={busy} onClick={onClose}><X /></button></header>
    <form onSubmit={submit} className="ii-form">
      <div className="ii-columns"><div className="ii-main">
        <Section title="1. Basic Item Information" icon={Info}><div className="ii-grid ii-three">
          {field('equipment_code', 'Item ID Number', { help: 'Auto-generate or enter unique ID' })}{field('equipment_name', 'Item Name', { required: true })}{field('category', 'Category', { options: ['Tool', 'Equipment', 'Material'], required: true })}
          {field('item_type', 'Item Type / Subcategory', { options: [...new Set(['Sprayer', 'Hand Tool', 'Pump', 'Generator', 'Harvest Crate', 'Fertilizer', 'Chemical', 'Other', form.item_type].filter(Boolean))], required: true })}{field('brand_model', 'Brand / Model')}{field('status', 'Status', { options: ['Available', 'In Use', 'Finished', 'Under Repair', 'Damaged'], required: true })}
        </div></Section>
        <Section title="2. Purchase & Stock Details" icon={ShoppingCart}><div className="ii-grid ii-three">{field('purchase_date', 'Purchase Date', { type: 'date', required: true })}{field('purchase_cost', 'Purchase Cost (GH₵)', { type: 'number', required: true })}{field('supplier', 'Supplier / Vendor', { required: true })}</div><div className="ii-grid ii-four">{field('quantity_purchased', 'Quantity Purchased', { type: 'number', required: true })}{field('unit', 'Unit', { options: units, required: true })}{field('remaining_quantity', 'Remaining Quantity / Unit', { type: 'number', required: true })}{field('minimum_stock_threshold', 'Minimum Stock Threshold', { type: 'number' })}</div><div className="ii-grid">{field('batch_number', 'Batch Number / Lot Number (for materials)', { placeholder: 'e.g. BATCH-2025-031' })}</div></Section>
        <Section title="3. Assignment & Usage" icon={Users}><div className="ii-grid ii-three">{field('assigned_operator', 'Currently Used By / Assigned To', { options: ['Not Assigned', ...assignmentOptions] })}{field('farm_id', 'Main Farm', { required: true, options: farms.map(f => ({ value: f.id, label: f.name || f.farm_name || f.farm_code })) })}{field('block_id', 'Exact Block', { required: true, options: blocks.filter(b => String(b.farm_id) === String(form.farm_id)).map(b => ({ value: b.id, label: b.block_name || b.name || b.block_code })) })}</div><div className="ii-grid ii-usage">{field('storage_location', 'Storage / Location')}{field('date_assigned', 'Date Assigned / First Used', { type: 'date' })}{field('usage_notes', 'Usage Status / Notes', { type: 'textarea' })}</div></Section>
        <Section title="4. Condition / Damage / Repair Tracking" icon={Wrench}><div className="ii-grid ii-condition">{field('condition', 'Current Condition', { options: ['Good', 'Fair', 'Poor', 'Damaged'], required: true })}{field('repair_issue', 'Issue / Damage Description', { type: 'textarea', placeholder: 'e.g. No physical damage. Working properly.' })}{field('repair_status', 'Repair Status', { options: ['Not Needed', 'Pending', 'In Progress', 'Completed'], required: true })}</div><div className="ii-grid ii-four">{field('last_maintenance_date', 'Last Repair Date', { type: 'date' })}{field('repair_cost', 'Repair Cost (GH₵)', { type: 'number' })}{field('repaired_by', 'Repaired By', { placeholder: 'e.g. Maintenance Team' })}{field('expected_return_date', 'Expected Return Date', { type: 'date' })}</div></Section>
      </div><aside className="ii-preview"><h3><Eye />Item Preview</h3><p>This is how the item will appear in the inventory register and other sections.</p><div className="ii-preview-card"><div className="ii-product"><div className="ii-product-photo">{photo ? <img src={photo.url} alt={form.equipment_name || 'Item preview'} /> : <Box />}</div><div><h4>{form.equipment_name || 'Item Name'}</h4><Pill value={form.status} /><p>{form.category} · {form.item_type || 'Subcategory'}</p><p>{form.brand_model || 'Brand / Model'}</p></div></div><dl>{[['ID Number', form.equipment_code || 'Auto-generated on save'], ['Category', form.category], ['Status', <Pill key="status" value={form.status} />], ['Used By', form.assigned_operator || 'Not Assigned'], ['Farm', farmName], ['Block', blockName], ['Remaining Qty', `${form.remaining_quantity || 0} ${form.unit} (of ${form.quantity_purchased || 0})`], ['Purchase Date', form.purchase_date || '—'], ['Purchase Cost', `GH₵${Number(form.purchase_cost || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`], ['Condition', <Pill key="condition" value={form.condition} />], ['Repair Status', form.repair_status], ['Repair Cost', `GH₵${Number(form.repair_cost || 0).toFixed(2)}`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div><div className="ii-notice"><CircleCheck /><p>This record will be added to the <strong>Inventory Register</strong> and will also appear in the <strong>Recent Activity Timeline</strong> for tracking.</p></div></aside></div>
      <Section title="5. Notes & Attachments" icon={Paperclip} className="ii-attachments"><div className="ii-attachment-grid">{field('notes', 'Notes', { type: 'textarea', placeholder: 'Add storage instructions or other item notes…' })}<div><span className="ii-upload-label">Upload Photos / Invoice / Receipt / Warranty / Maintenance Document</span><div className="ii-upload-row" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void addFiles(e.dataTransfer.files).catch(() => setError('Unable to read attachments.')); }}><label className="ii-upload"><UploadCloud /><span>Click to upload files or drag and drop<small>PNG, JPG, PDF (Max 5MB each)</small></span><input aria-label="Upload attachments" type="file" multiple accept="image/png,image/jpeg,application/pdf" onChange={e => { void addFiles(e.target.files).catch(() => setError('Unable to read attachments.')); e.target.value = ''; }} /></label>{attachments.map((a, index) => <div className="ii-thumb" key={`${a.name}-${index}`}>{a.contentType?.startsWith('image/') ? <img src={a.url} alt={a.name} /> : <FileText />}<small>{a.name}</small><button type="button" aria-label={`Remove ${a.name}`} onClick={() => setAttachments(old => old.filter((_, i) => i !== index))}><X /></button></div>)}</div></div></div></Section>
      {error && <p role="alert" className="ii-error">{error}</p>}<footer className="ii-footer"><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" value="draft" formNoValidate disabled={busy} className="ii-draft">Save Draft</button><button type="submit" value="active" disabled={busy} className="ii-save"><Save />{busy ? 'Saving…' : 'Save Item Record'}</button></footer>
    </form>
  </DialogContent></Dialog>;
}
