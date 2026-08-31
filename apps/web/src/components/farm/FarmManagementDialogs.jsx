import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, FileText, ImagePlus, Info, Leaf, Loader2, MapPin, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatNumber } from '@/lib/farm-management';

const today = () => new Date().toISOString().slice(0, 10);
const optionalNumber = (value) => value === '' || value == null ? null : Number(value);
const emptyFarm = {
  name: '', farm_code: '', location: '', region: '', country: 'Ghana', size_acres: '',
  latitude: '', longitude: '', soil_type: '', soil_ph: '', soil_notes: '', owner_name: '',
  operations_started_on: '', planting_started_on: '', description: '', notes: '', image_url: '',
};

const Field = ({ label, children, hint }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    {children}
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);

const BlockSection = ({ icon: Icon, title, children, className = '' }) => (
  <section className={`block-editor-section rounded-lg border border-slate-200 bg-white p-2 ${className}`}>
    <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-900"><Icon className="h-4 w-4 text-emerald-700" />{title}</h3>
    {children}
  </section>
);

const DiseaseSeveritySelector = ({ value, onChange }) => (
  <div className="grid grid-cols-3 gap-3">
    {[
      ['Low', 'border-emerald-300 text-emerald-800'],
      ['Medium', 'border-amber-400 text-amber-900'],
      ['High', 'border-red-300 text-red-700'],
    ].map(([severity, tone]) => <button key={severity} type="button" onClick={() => onChange(severity)} className={`flex h-10 items-center justify-center gap-2 rounded-md border text-sm font-medium transition ${value === severity ? `${tone} bg-white ring-1 ring-current` : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><span className={`h-3.5 w-3.5 rounded-full border-2 ${tone}`} />{severity}</button>)}
  </div>
);

export function FarmFormDialog({ open, onOpenChange, farm, onSubmit, saving }) {
  const [form, setForm] = useState(emptyFarm);
  const [imageFile, setImageFile] = useState(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!open) return;
    setForm(farm ? { ...emptyFarm, ...farm, size_acres: farm.size_acres ?? '' } : emptyFarm);
    setImageFile(null);
    setDirty(false);
  }, [open, farm]);

  const imagePreview = useMemo(
    () => imageFile ? URL.createObjectURL(imageFile) : form.image_url,
    [imageFile, form.image_url],
  );
  useEffect(() => () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const change = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setDirty(true); };
  const requestClose = (nextOpen) => {
    if (!nextOpen && dirty && !saving && !window.confirm('Discard your unsaved farm changes?')) return;
    onOpenChange(nextOpen);
  };
  const submit = async (event) => {
    event.preventDefault();
    const saved = await onSubmit({
      ...form,
      size_acres: optionalNumber(form.size_acres),
      latitude: optionalNumber(form.latitude),
      longitude: optionalNumber(form.longitude),
      soil_ph: optionalNumber(form.soil_ph),
      image_file: imageFile || undefined,
    });
    if (saved !== false) setDirty(false);
  };

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{farm ? 'Edit farm' : 'Add farm'}</DialogTitle>
          <DialogDescription>{farm ? 'Update the farm profile. Calculated totals are managed from its blocks.' : 'Create the main physical farm location before adding operational blocks.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          {farm ? (
            <Field label="Farm image" hint="JPG, PNG, or WebP up to 5 MB. The image appears in the Farm Summary header.">
              <label className="group flex cursor-pointer items-center gap-4 rounded-lg border border-dashed bg-muted/20 p-3 transition hover:border-emerald-400 hover:bg-emerald-50/40">
                {imagePreview ? (
                  <img src={imagePreview} alt="Farm preview" className="h-20 w-28 rounded-md object-cover" />
                ) : (
                  <span className="grid h-20 w-28 place-items-center rounded-md bg-muted text-muted-foreground"><ImagePlus className="h-6 w-6" /></span>
                )}
                <span className="min-w-0 text-sm">
                  <span className="block font-medium">{imageFile ? imageFile.name : 'Choose farm image'}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Click to browse from your device</span>
                </span>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setImageFile(file);
                    if (file) setDirty(true);
                  }}
                />
              </label>
            </Field>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Farm name"><Input required value={form.name} onChange={(event) => change('name', event.target.value)} placeholder="Farm A" /></Field>
            <Field label="Farm code"><Input required value={form.farm_code} onChange={(event) => change('farm_code', event.target.value.toUpperCase())} placeholder="FARM-A" /></Field>
            <Field label="Location"><Input value={form.location || ''} onChange={(event) => change('location', event.target.value)} placeholder="Community or area" /></Field>
            <Field label="Region"><Input value={form.region || ''} onChange={(event) => change('region', event.target.value)} placeholder="Region" /></Field>
            <Field label="GPS latitude"><Input type="number" min="-90" max="90" step="any" value={form.latitude ?? ''} onChange={(event) => change('latitude', event.target.value)} placeholder="6.5244" /></Field>
            <Field label="GPS longitude"><Input type="number" min="-180" max="180" step="any" value={form.longitude ?? ''} onChange={(event) => change('longitude', event.target.value)} placeholder="-1.5856" /></Field>
            <Field label="Soil type"><Input value={form.soil_type || ''} onChange={(event) => change('soil_type', event.target.value)} placeholder="Sandy loam" /></Field>
            <Field label="Soil pH"><Input type="number" min="0" max="14" step="0.1" value={form.soil_ph ?? ''} onChange={(event) => change('soil_ph', event.target.value)} /></Field>
            <Field label="Declared size (acres)" hint="Active block allocation cannot exceed this size without an authorized override."><Input type="number" min="0.01" step="0.01" value={form.size_acres} onChange={(event) => change('size_acres', event.target.value)} /></Field>
            <Field label="Owner or tenancy reference"><Input value={form.owner_name || ''} onChange={(event) => change('owner_name', event.target.value)} /></Field>
            <Field label="Operations started"><Input type="date" value={form.operations_started_on || ''} onChange={(event) => change('operations_started_on', event.target.value)} /></Field>
            <Field label="Mango planting started"><Input type="date" value={form.planting_started_on || ''} onChange={(event) => change('planting_started_on', event.target.value)} /></Field>
          </div>
          <Field label="Soil profile notes"><Textarea value={form.soil_notes || ''} onChange={(event) => change('soil_notes', event.target.value)} rows={2} placeholder="Drainage, texture, test observations, or amendments" /></Field>
          <Field label="Description"><Textarea value={form.description || ''} onChange={(event) => change('description', event.target.value)} rows={3} /></Field>
          <Field label="Location or management notes"><Textarea value={form.notes || ''} onChange={(event) => change('notes', event.target.value)} rows={3} /></Field>
          <DialogFooter><Button type="button" variant="outline" onClick={() => requestClose(false)}>Cancel</Button><Button disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{farm ? 'Save changes' : 'Create farm'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const emptyInventory = () => ({ variety_name: '', total_trees: '', productive_trees: '', non_productive_trees: '', dead_trees: '', planting_date: '', notes: '' });
const emptyBlock = {
  name: '', block_code: '', description: '', early_block_classification: '', year_planted: '',
  size_acres: '', maturity_percent: '', forecast_yield_kg: '', actual_yield_kg: '', mango_variety: '', fruit_fly_pressure: '', disease_rating: '', disease_severity: '',
  latitude: '', longitude: '', soil_type: '', soil_ph: '', soil_notes: '',
  operations_started_on: '', planting_started_on: '', inventory: [],
};

export function BlockFormDialog({ open, onOpenChange, block, parentFarm, onSubmit, saving, unallocatedAcres }) {
  const [form, setForm] = useState(emptyBlock);
  const [dirty, setDirty] = useState(false);
  const [farms, setFarms] = useState([]);
  useEffect(() => {
    if (!open) return;
    setForm(block ? {
      ...emptyBlock,
      ...block,
      farm_id: block.farm_id || parentFarm?.id || '',
      farm_name: block.farm_name || parentFarm?.name || '',
      size_acres: block.size_acres ?? '',
      year_planted: block.year_planted ?? '',
      maturity_percent: block.shoot_maturity == null ? '' : Number(block.shoot_maturity) * 100,
      forecast_yield_kg: block.forecast_yield_kg ?? '',
      actual_yield_kg: block.actual_yield_kg ?? '',
      mango_variety: block.mango_variety ?? block.variety ?? '',
      inventory: block.inventory?.length ? block.inventory : [],
    } : { ...emptyBlock, inventory: [] });
    setDirty(false);
  }, [open, block, parentFarm?.id, parentFarm?.name]);
  useEffect(() => {
    if (!open || !block) return;
    base44.entities.Farm.listAll('-name').then((items) => setFarms(items || [])).catch(() => setFarms([]));
  }, [open, block]);
  const change = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setDirty(true); };
  const changeParentFarm = (farmId) => {
    const parent = farms.find((farm) => farm.id === farmId);
    setForm((current) => ({ ...current, farm_id: farmId, farm_name: parent?.name || current.farm_name }));
    setDirty(true);
  };
  const changeInventory = (index, key, value) => {
    setForm((current) => ({ ...current, inventory: current.inventory.map((entry, entryIndex) => entryIndex === index ? { ...entry, [key]: value } : entry) }));
    setDirty(true);
  };
  const requestClose = (nextOpen) => {
    if (!nextOpen && dirty && !saving && !window.confirm('Discard your unsaved block changes?')) return;
    onOpenChange(nextOpen);
  };
  const submit = async (event) => {
    event.preventDefault();
    const inventory = form.inventory.filter((entry) => entry.variety_name.trim()).map((entry) => ({
      variety_name: entry.variety_name.trim(),
      total_trees: Number(entry.total_trees || 0),
      productive_trees: Number(entry.productive_trees || 0),
      non_productive_trees: Number(entry.non_productive_trees || 0),
      dead_trees: Number(entry.dead_trees || 0),
      planting_date: entry.planting_date || null,
      notes: entry.notes || '',
    }));
    const saved = await onSubmit({
      ...form,
      description: String(form.description || '').trim() || null,
      early_block_classification: form.early_block_classification || null,
      year_planted: form.year_planted === '' ? null : Number(form.year_planted),
      size_acres: form.size_acres === '' ? null : Number(form.size_acres),
      shoot_maturity: form.maturity_percent === '' ? 0 : Number(form.maturity_percent) / 100,
      forecast_yield_kg: form.forecast_yield_kg === '' ? null : Number(form.forecast_yield_kg),
      actual_yield_kg: form.actual_yield_kg === '' ? null : Number(form.actual_yield_kg),
      mango_variety: form.mango_variety || null,
      fruit_fly_pressure: String(form.fruit_fly_pressure || '').trim() || null,
      disease_rating: String(form.disease_rating || '').trim() || null,
      disease_severity: form.disease_severity || null,
      latitude: optionalNumber(form.latitude),
      longitude: optionalNumber(form.longitude),
      soil_ph: optionalNumber(form.soil_ph),
      inventory: block ? undefined : inventory,
    });
    if (saved !== false) setDirty(false);
  };

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="z-[70] max-h-[calc(100vh-2rem)] w-[min(100vw-2rem,1080px)] overflow-hidden p-0 sm:max-w-[1080px]">
        <form onSubmit={submit} className="block-editor space-y-2 p-2 sm:p-3">
          <div className="grid gap-2 lg:grid-cols-2">
            <BlockSection icon={Info} title="Basic information"><div className="grid gap-2 sm:grid-cols-2">{block ? <Field label="Parent farm"><Select key={`${form.farm_id}:${farms.map((farm) => farm.id).join(',')}`} value={form.farm_id || ''} onValueChange={changeParentFarm}><SelectTrigger><SelectValue placeholder="Select parent farm" /></SelectTrigger><SelectContent>{[...farms, ...(form.farm_id && !farms.some((farm) => farm.id === form.farm_id) ? [{ id: form.farm_id, name: form.farm_name || 'Current farm' }] : [])].map((farm) => <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>)}</SelectContent></Select></Field> : <Field label="Block name"><Input required value={form.name} onChange={(event) => change('name', event.target.value)} placeholder="Block A1" /></Field>}<Field label="Block code"><Input required value={form.block_code} onChange={(event) => change('block_code', event.target.value.toUpperCase())} placeholder="A1" /></Field><Field label="Mango variety"><Select value={form.mango_variety || 'not-recorded'} onValueChange={(value) => change('mango_variety', value === 'not-recorded' ? '' : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not-recorded">Not recorded</SelectItem><SelectItem value="Kent">Kent</SelectItem><SelectItem value="Keitt">Keitt</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></Field><Field label="Early block"><Select value={form.early_block_classification || 'not-recorded'} onValueChange={(value) => change('early_block_classification', value === 'not-recorded' ? '' : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not-recorded">Not recorded</SelectItem><SelectItem value="Yes">Yes</SelectItem><SelectItem value="Mid">Mid</SelectItem><SelectItem value="New">New</SelectItem></SelectContent></Select></Field><Field label="Year planted"><Input type="number" min="1900" max="2200" value={form.year_planted} onChange={(event) => change('year_planted', event.target.value)} placeholder="Not recorded" /></Field><Field label="Acres"><Input type="number" min="0.01" step="0.01" value={form.size_acres} onChange={(event) => change('size_acres', event.target.value)} placeholder="Not recorded" /></Field><Field label="Maturity (%)"><Input type="number" min="0" max="100" step="1" value={form.maturity_percent} onChange={(event) => change('maturity_percent', event.target.value)} placeholder="100" /></Field><Field label="Yields (kg)"><div className="grid grid-cols-2 gap-1.5"><Input type="number" min="0" step="0.01" value={form.forecast_yield_kg} onChange={(event) => change('forecast_yield_kg', event.target.value)} placeholder="Forecast" /><Input type="number" min="0" step="0.01" value={form.actual_yield_kg} onChange={(event) => change('actual_yield_kg', event.target.value)} placeholder="Actual" /></div></Field></div></BlockSection>
            <BlockSection icon={Leaf} title="Agronomy"><div className="grid gap-2 sm:grid-cols-2"><Field label="Fruit flies (risk)"><Select value={form.fruit_fly_pressure || 'not-recorded'} onValueChange={(value) => change('fruit_fly_pressure', value === 'not-recorded' ? '' : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not-recorded">Not recorded</SelectItem><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select></Field><Field label="Disease name"><Input value={form.disease_rating || ''} onChange={(event) => change('disease_rating', event.target.value)} placeholder="Not recorded" /></Field></div><div className="mt-2"><Field label="Disease severity"><DiseaseSeveritySelector value={form.disease_severity} onChange={(value) => change('disease_severity', value)} /></Field></div><div className="mt-2"><Field label="Description"><Textarea value={form.description || ''} onChange={(event) => change('description', event.target.value)} rows={2} placeholder="Field description from the farm register" /></Field></div></BlockSection>
            <BlockSection icon={MapPin} title="Location & soil"><div className="grid gap-2 sm:grid-cols-2"><Field label="GPS latitude"><Input type="number" min="-90" max="90" step="any" value={form.latitude ?? ''} onChange={(event) => change('latitude', event.target.value)} placeholder="e.g. 6.5244" /></Field><Field label="GPS longitude"><Input type="number" min="-180" max="180" step="any" value={form.longitude ?? ''} onChange={(event) => change('longitude', event.target.value)} placeholder="e.g. -1.5856" /></Field><Field label="Soil type"><Input value={form.soil_type || ''} onChange={(event) => change('soil_type', event.target.value)} placeholder="Sandy loam" /></Field><Field label="Soil pH"><Input type="number" min="0" max="14" step="0.1" value={form.soil_ph ?? ''} onChange={(event) => change('soil_ph', event.target.value)} placeholder="Not recorded" /></Field></div></BlockSection>
            <BlockSection icon={CalendarDays} title="Dates"><div className="grid gap-2 sm:grid-cols-2"><Field label="Operations started"><Input type="date" value={form.operations_started_on || ''} onChange={(event) => change('operations_started_on', event.target.value)} /></Field><Field label="Planting started"><Input type="date" value={form.planting_started_on || ''} onChange={(event) => change('planting_started_on', event.target.value)} /></Field></div></BlockSection>
          </div>
          <BlockSection icon={FileText} title="Notes"><Field label="Soil and land notes"><Textarea value={form.soil_notes || ''} onChange={(event) => change('soil_notes', event.target.value)} rows={2} placeholder="Add notes about soil conditions, land features, drainage, previous crops, etc." /></Field></BlockSection>
          {!block ? <div className="space-y-3 rounded-lg border bg-muted/20 p-4"><div className="flex items-center justify-between"><div><h3 className="font-medium">Crop and tree inventory</h3><p className="text-xs text-muted-foreground">Add one row per variety planted in this block.</p></div><Button type="button" variant="outline" size="sm" onClick={() => { setForm((current) => ({ ...current, inventory: [...current.inventory, emptyInventory()] })); setDirty(true); }}><Plus className="mr-1 h-4 w-4" />Variety</Button></div>{form.inventory.map((entry, index) => <div key={index} className="grid gap-3 border-t pt-3 sm:grid-cols-6"><Field label="Variety"><Input required value={entry.variety_name} onChange={(event) => changeInventory(index, 'variety_name', event.target.value)} /></Field><Field label="Total"><Input required type="number" min="0" value={entry.total_trees} onChange={(event) => changeInventory(index, 'total_trees', event.target.value)} /></Field><Field label="Productive"><Input required type="number" min="0" value={entry.productive_trees} onChange={(event) => changeInventory(index, 'productive_trees', event.target.value)} /></Field><Field label="Young"><Input type="number" min="0" value={entry.non_productive_trees} onChange={(event) => changeInventory(index, 'non_productive_trees', event.target.value)} /></Field><Field label="Dead/removed"><Input type="number" min="0" value={entry.dead_trees} onChange={(event) => changeInventory(index, 'dead_trees', event.target.value)} /></Field><div className="flex items-end"><Button type="button" size="icon" variant="ghost" disabled={form.inventory.length === 1} aria-label="Remove variety" onClick={() => { setForm((current) => ({ ...current, inventory: current.inventory.filter((_, entryIndex) => entryIndex !== index) })); setDirty(true); }}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div> : null}
          <DialogFooter className="border-t border-slate-100 pt-2"><Button type="button" size="sm" variant="outline" onClick={() => requestClose(false)}>Cancel</Button><Button size="sm" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{block ? 'Save block' : 'Create block'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InventoryFormDialog({ open, onOpenChange, inventory, onSubmit, saving }) {
  const [form, setForm] = useState(emptyInventory());
  useEffect(() => {
    if (open) setForm(inventory ? { ...emptyInventory(), ...inventory } : emptyInventory());
  }, [inventory, open]);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    await onSubmit({
      variety_name: form.variety_name.trim(),
      total_trees: Number(form.total_trees || 0),
      productive_trees: Number(form.productive_trees || 0),
      non_productive_trees: Number(form.non_productive_trees || 0),
      dead_trees: Number(form.dead_trees || 0),
      planting_date: form.planting_date || null,
      notes: form.notes || '',
    });
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{inventory ? 'Update tree inventory' : 'Record tree inventory'}</DialogTitle><DialogDescription>{inventory ? 'The current record will be closed and this revision becomes the current inventory, preserving history.' : 'Record a mango variety and its current tree condition for this block.'}</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Mango variety"><Input required value={form.variety_name} onChange={(event) => change('variety_name', event.target.value)} /></Field><Field label="Planting date"><Input type="date" value={form.planting_date || ''} onChange={(event) => change('planting_date', event.target.value)} /></Field><Field label="Total trees"><Input required type="number" min="0" value={form.total_trees} onChange={(event) => change('total_trees', event.target.value)} /></Field><Field label="Productive trees"><Input required type="number" min="0" value={form.productive_trees} onChange={(event) => change('productive_trees', event.target.value)} /></Field><Field label="Young / non-productive"><Input type="number" min="0" value={form.non_productive_trees} onChange={(event) => change('non_productive_trees', event.target.value)} /></Field><Field label="Dead / removed"><Input type="number" min="0" value={form.dead_trees} onChange={(event) => change('dead_trees', event.target.value)} /></Field></div><Field label="Tree observations"><Textarea value={form.notes || ''} onChange={(event) => change('notes', event.target.value)} rows={3} placeholder="Health, replacements, pruning needs, or field observations" /></Field><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{inventory ? 'Save revision' : 'Record inventory'}</Button></DialogFooter></form></DialogContent></Dialog>;
}

const activityTypes = ['land_preparation', 'soil_testing', 'planting', 'irrigation', 'fertilization', 'pruning', 'pest_control', 'disease_management', 'flowering', 'fruit_development', 'tree_inspection', 'harvesting'];
const emptyActivity = () => ({ activity_type: 'tree_inspection', status: 'planned', season_year: new Date().getFullYear(), planned_start_date: today(), planned_end_date: '', actual_start_date: '', actual_end_date: '', completion_percent: 0, notes: '' });

export function ActivityFormDialog({ open, onOpenChange, activity, onSubmit, saving }) {
  const [form, setForm] = useState(emptyActivity());
  useEffect(() => {
    if (open) setForm(activity ? { ...emptyActivity(), ...activity } : emptyActivity());
  }, [activity, open]);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    await onSubmit({
      ...form,
      season_year: form.season_year === '' ? null : Number(form.season_year),
      completion_percent: Number(form.completion_percent || 0),
      planned_start_date: form.planned_start_date || null,
      planned_end_date: form.planned_end_date || null,
      actual_start_date: form.actual_start_date || null,
      actual_end_date: form.actual_end_date || null,
    });
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{activity ? 'Update land activity' : 'Record land activity'}</DialogTitle><DialogDescription>Track work performed on the land and trees, including its dates and completion progress.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Activity"><Select value={form.activity_type} onValueChange={(value) => change('activity_type', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{activityTypes.map((type) => <SelectItem key={type} value={type}>{type.replaceAll('_', ' ')}</SelectItem>)}</SelectContent></Select></Field><Field label="Status"><Select value={form.status} onValueChange={(value) => change('status', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['planned', 'in_progress', 'delayed', 'completed', 'cancelled'].map((status) => <SelectItem key={status} value={status}>{status.replaceAll('_', ' ')}</SelectItem>)}</SelectContent></Select></Field><Field label="Season year"><Input type="number" min="2000" max="2200" value={form.season_year ?? ''} onChange={(event) => change('season_year', event.target.value)} /></Field><Field label="Completion"><div className="flex items-center gap-3"><Input type="range" min="0" max="100" value={form.completion_percent} onChange={(event) => change('completion_percent', event.target.value)} /><span className="w-12 text-right text-sm font-medium">{form.completion_percent}%</span></div></Field><Field label="Planned start"><Input type="date" value={form.planned_start_date || ''} onChange={(event) => change('planned_start_date', event.target.value)} /></Field><Field label="Planned end"><Input type="date" min={form.planned_start_date || undefined} value={form.planned_end_date || ''} onChange={(event) => change('planned_end_date', event.target.value)} /></Field><Field label="Actual start"><Input type="date" value={form.actual_start_date || ''} onChange={(event) => change('actual_start_date', event.target.value)} /></Field><Field label="Actual end"><Input type="date" min={form.actual_start_date || undefined} value={form.actual_end_date || ''} onChange={(event) => change('actual_end_date', event.target.value)} /></Field></div><Field label="Progress and field notes"><Textarea value={form.notes || ''} onChange={(event) => change('notes', event.target.value)} rows={4} placeholder="Work completed, tree condition, materials used, issues, and next action" /></Field><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{activity ? 'Save progress' : 'Record activity'}</Button></DialogFooter></form></DialogContent></Dialog>;
}

export function StatusActionDialog({ open, onOpenChange, entityLabel, action = 'deactivate', onSubmit, saving }) {
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [notes, setNotes] = useState('');
  useEffect(() => { if (open) { setReason(''); setEffectiveDate(today()); setNotes(''); } }, [open]);
  const isDeactivate = action === 'deactivate';
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{isDeactivate ? 'Deactivate' : 'Reactivate'} {entityLabel}</DialogTitle><DialogDescription>{isDeactivate ? 'The record and its complete operational history will remain available. New current activity should use an active block.' : 'This makes the record available for new operational assignments again.'}</DialogDescription></DialogHeader>{isDeactivate ? <form onSubmit={(event) => { event.preventDefault(); onSubmit({ reason, effective_date: effectiveDate, notes }); }} className="space-y-4"><Field label="Reason"><Textarea required value={reason} onChange={(event) => setReason(event.target.value)} /></Field><Field label="Effective date"><Input required type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} /></Field><Field label="Notes (optional)"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="destructive" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Deactivate</Button></DialogFooter></form> : <div><div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="h-5 w-5 shrink-0" /><p>Confirm that allocation, staffing, and planned activity are ready before reactivation.</p></div><DialogFooter className="mt-5"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving} onClick={() => onSubmit()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Reactivate</Button></DialogFooter></div>}</DialogContent></Dialog>;
}

export function MergeBlocksDialog({ open, onOpenChange, farm, blocks, onSubmit, saving, loadImpact }) {
  const activeBlocks = useMemo(() => blocks.filter((block) => block.status === 'active'), [blocks]);
  const [sources, setSources] = useState([]);
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [impacts, setImpacts] = useState([]);
  const [reviewed, setReviewed] = useState(false);
  useEffect(() => { if (open) { setSources([]); setDestination(''); setReason(''); setEffectiveDate(today()); setImpacts([]); setReviewed(false); } }, [open]);
  useEffect(() => {
    if (!open || !sources.length) { setImpacts([]); return; }
    Promise.all(sources.map((id) => loadImpact(id))).then(setImpacts).catch(() => setImpacts([]));
  }, [open, sources, loadImpact]);
  const sourceBlocks = activeBlocks.filter((block) => sources.includes(block.id));
  const selectedDestination = activeBlocks.find((block) => block.id === destination);
  const sourceSize = sourceBlocks.reduce((sum, block) => sum + Number(block.size_acres || 0), 0);
  const openWork = impacts.reduce((sum, impact) => sum + Number(impact.pending_activity_periods || 0) + Number(impact.active_harvest_periods || 0), 0);
  const valid = sources.length >= 1 && destination && reason.trim() && reviewed;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Merge blocks</DialogTitle><DialogDescription>Source blocks will be marked merged. Their historical records stay attached to the original blocks.</DialogDescription></DialogHeader><div className="space-y-5"><div><Label>Source blocks</Label><div className="mt-2 grid gap-2 sm:grid-cols-2">{activeBlocks.map((block) => <label key={block.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm"><Checkbox checked={sources.includes(block.id)} disabled={block.id === destination} onCheckedChange={(checked) => setSources((current) => checked ? [...current, block.id] : current.filter((id) => id !== block.id))} /><span><strong>{block.block_code}</strong> · {block.name}</span></label>)}</div></div><Field label="Destination block"><Select value={destination} onValueChange={(value) => { setDestination(value); setSources((current) => current.filter((id) => id !== value)); }}><SelectTrigger><SelectValue placeholder="Choose an existing active destination" /></SelectTrigger><SelectContent>{activeBlocks.filter((block) => !sources.includes(block.id)).map((block) => <SelectItem key={block.id} value={block.id}>{block.block_code} · {block.name}</SelectItem>)}</SelectContent></Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Effective date"><Input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} /></Field><Field label="Merge reason"><Input value={reason} onChange={(event) => setReason(event.target.value)} /></Field></div><div className="rounded-lg border bg-muted/30 p-4"><h3 className="font-medium">Impact review</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><dt className="text-muted-foreground">Sources</dt><dd className="font-medium">{sourceBlocks.length}</dd></div><div><dt className="text-muted-foreground">Source area</dt><dd className="font-medium">{formatNumber(sourceSize)} ac</dd></div><div><dt className="text-muted-foreground">Destination</dt><dd className="font-medium">{selectedDestination?.block_code || 'Not selected'}</dd></div><div><dt className="text-muted-foreground">Open operations</dt><dd className="font-medium">{openWork}</dd></div></dl>{openWork ? <p className="mt-3 text-xs text-amber-700">Open activity or harvest records remain on their source blocks. Review and reassign active work in the operations modules.</p> : null}<label className="mt-4 flex items-start gap-3 text-sm"><Checkbox checked={reviewed} onCheckedChange={setReviewed} /><span>I reviewed the affected blocks and understand that this operation has no automatic unmerge.</span></label></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="destructive" disabled={!valid || saving} onClick={() => onSubmit({ farm_id: farm.id, source_block_ids: sources, destination_block_id: destination, effective_date: effectiveDate, reason: reason.trim(), idempotency_key: crypto.randomUUID() })}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirm merge</Button></DialogFooter></div></DialogContent></Dialog>;
}
