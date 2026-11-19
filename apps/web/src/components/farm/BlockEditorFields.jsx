import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, Camera, Layers, Leaf, MapPin, Plus, Trash2, Trees, Upload } from 'lucide-react';
import { isManagedProfileImage } from './ProfileImageField';
import './block-editor.css';

const varieties = ['Kent', 'Keitt', 'Other'];
const soils = ['Sandy', 'Loamy', 'Clay', 'Sandy loam', 'Clay loam', 'Silt', 'Other'];

export function Section({ icon: Icon, title, className = '', children }) {
  return <section className={`cb-section ${className}`}><h3><Icon aria-hidden="true" />{title}</h3>{children}</section>;
}

export function Field({ label, required, children, className = '' }) {
  return <label className={`cb-field ${className}`}><span>{label}{required && <b> *</b>}</span>{children}</label>;
}

function Choice({ value, onChange, placeholder, options, required, ...props }) {
  return <select {...props} required={required} value={value || ''} onChange={event => onChange(event.target.value)}><option value="">{placeholder}</option>{[...new Set([...options, ...(value ? [value] : [])])].map(option => <option key={option} value={option}>{option}</option>)}</select>;
}

export function BlockPhoto({ file, value, onChange, disabled, label = 'Block photo', exampleSource = '/pages/blocks/create-block-reference.png', exampleClass = 'cb-example' }) {
  const input = useRef(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const image = preview || (isManagedProfileImage(value) ? value : '');
  const choose = next => {
    if (disabled || !next) return;
    if (!['image/jpeg', 'image/png'].includes(next.type) || !next.size || next.size > 5 * 1024 * 1024) {
      setError('Choose a JPG or PNG image up to 5 MB.'); return;
    }
    setError(''); onChange(next);
  };
  return <Section icon={Camera} title={label} className="cb-photo">
    <figure><div className="cb-photo-frame"><img className={image ? undefined : exampleClass} src={image || exampleSource} alt={image ? `${label} preview` : 'Example mango orchard'} /></div><figcaption>{image ? `${label} preview` : 'Example image'}</figcaption></figure>
    <div className={`cb-dropzone ${dragging ? 'cb-dragging' : ''}`} onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files?.[0]); }}>
      <Upload aria-hidden="true" /><strong>Drop an image here</strong><span>or</span>
      <button type="button" className="cb-outline" disabled={disabled} onClick={() => input.current?.click()}>Choose image</button><small>JPG or PNG</small>
      <input ref={input} aria-label={label} type="file" accept="image/jpeg,image/png" disabled={disabled} onChange={event => { choose(event.target.files?.[0]); event.target.value = ''; }} hidden />
    </div>
    {file && <button type="button" className="cb-undo" disabled={disabled} onClick={() => onChange(null)}>Undo image selection</button>}
    {error && <p role="alert" className="cb-error">{error}</p>}
  </Section>;
}

export default function BlockEditorFields({ form, change, block, farms, changeParentFarm, changeInventory, setInventory, imageFile, onImageChange, busy }) {
  const id = useId();
  const input = (key, placeholder, props = {}) => <input value={form[key] ?? ''} onChange={event => change(key, key === 'block_code' ? event.target.value.toUpperCase() : event.target.value)} placeholder={placeholder} {...props} />;
  const numeric = (key, placeholder, props = {}) => input(key, placeholder, { type: 'number', min: 0, step: 'any', ...props });
  return <>
    <div className="cb-columns">
      <div className="cb-main">
        <Section icon={Layers} title="Block details">
          <div className="cb-details-grid">
            <Field label="Block name" required>{input('name', 'A1', { required: true, maxLength: 200 })}</Field>
            <Field label="Block code" required>{input('block_code', 'A1', { required: true, maxLength: 50 })}</Field>
            <Field label="Mango variety" required><Choice required value={form.mango_variety} onChange={value => change('mango_variety', value)} placeholder="Select variety" options={varieties} /></Field>
            <Field label="Year planted">{numeric('year_planted', 'Select year', { min: 1900, max: 2200, step: 1 })}</Field>
            <Field label="Area (acres)">{numeric('size_acres', 'Enter area', { min: 0.01, step: 0.01 })}</Field>
            <Field label="Early block"><Choice value={form.early_block_classification} onChange={value => change('early_block_classification', value)} placeholder="Select" options={['Yes', 'Mid', 'New']} /></Field>
            <Field label="Maturity (%)">{numeric('maturity_percent', 'Enter percentage', { max: 100 })}</Field>
            <Field label="Forecast yield (kg)">{numeric('forecast_yield_kg', 'Enter yield')}</Field>
            <Field label="Actual yield (kg)">{numeric('actual_yield_kg', 'Enter yield')}</Field>
            {block && <Field label="Parent farm"><select value={form.farm_id || ''} onChange={event => changeParentFarm(event.target.value)}>{[...farms, ...(form.farm_id && !farms.some(farm => farm.id === form.farm_id) ? [{ id: form.farm_id, name: form.farm_name || 'Current farm' }] : [])].map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></Field>}
          </div>
        </Section>
        <Section icon={Leaf} title="Agronomy">
          <div className="cb-agronomy-grid">
            <Field label="Fruit fly risk"><Choice value={form.fruit_fly_pressure} onChange={value => change('fruit_fly_pressure', value)} placeholder="Select risk" options={['Low', 'Medium', 'High']} /></Field>
            <Field label="Disease name">{input('disease_rating', 'Enter disease name', { maxLength: 120 })}</Field>
            <fieldset className="cb-severity"><legend>Disease severity</legend><div>{['', 'Low', 'Medium', 'High'].map(value => <label key={value}><input type="radio" name={`${id}-severity`} value={value} checked={(form.disease_severity || '') === value} onChange={() => change('disease_severity', value)} /><span>{value || 'Not assessed'}</span></label>)}</div></fieldset>
          </div>
          <Field label="Description" className="cb-wide-field"><textarea value={form.description || ''} onChange={event => change('description', event.target.value)} placeholder="Field description from the farm register" rows={3} maxLength={2000} /></Field>
        </Section>
        <Section icon={MapPin} title="Location & soil">
          <div className="cb-soil-grid">
            <Field label="GPS latitude">{numeric('latitude', 'Enter latitude', { min: -90, max: 90 })}</Field>
            <Field label="GPS longitude">{numeric('longitude', 'Enter longitude', { min: -180, max: 180 })}</Field>
            <Field label="Soil type"><Choice value={form.soil_type} onChange={value => change('soil_type', value)} placeholder="Select soil type" options={soils} /></Field>
            <Field label="Soil pH">{numeric('soil_ph', 'Enter soil pH', { max: 14, step: 0.1 })}</Field>
          </div>
          <Field label="Soil and land notes" className="cb-wide-field"><textarea value={form.soil_notes || ''} onChange={event => change('soil_notes', event.target.value)} placeholder="Add notes about soil conditions, land features, drainage, previous crops, etc." rows={2} maxLength={2000} /></Field>
        </Section>
      </div>
      <div className="cb-sidebar">
        <BlockPhoto file={imageFile} value={form.image_url} onChange={onImageChange} disabled={busy} />
        <Section icon={CalendarDays} title="Key dates" className="cb-dates">
          <Field label="Operations started">{input('operations_started_on', 'dd/mm/yyyy', { type: 'date' })}</Field>
          <Field label="Planting started">{input('planting_started_on', 'dd/mm/yyyy', { type: 'date' })}</Field>
        </Section>
      </div>
    </div>
    {!block && <section className="cb-section cb-inventory">
      <div className="cb-inventory-heading"><div><h3><Trees aria-hidden="true" />Crop and tree inventory <em>Optional</em></h3><p>Add each mango variety planted in this block.</p></div><button type="button" className="cb-outline" onClick={() => setInventory([...form.inventory, { variety_name: '', total_trees: '', productive_trees: '', non_productive_trees: '', dead_trees: '' }])}><Plus aria-hidden="true" />Add variety</button></div>
      <div className="cb-table-scroll"><table><thead><tr>{['Variety', 'Total trees', 'Productive', 'Young', 'Dead / removed', ''].map((title, index) => <th key={index} scope="col">{title || <span className="sr-only">Actions</span>}</th>)}</tr></thead><tbody>{form.inventory.map((entry, index) => <tr key={index} data-block-inventory-row>
        <td><Choice aria-label={`Variety ${index + 1}`} required={['total_trees', 'productive_trees', 'non_productive_trees', 'dead_trees'].some(key => entry[key] !== '' && entry[key] != null)} value={entry.variety_name} onChange={value => changeInventory(index, 'variety_name', value)} placeholder="Select variety" options={varieties} /></td>
        {['total_trees', 'productive_trees', 'non_productive_trees', 'dead_trees'].map((key, column) => <td key={key}><input aria-label={`${['Total trees', 'Productive', 'Young', 'Dead / removed'][column]} ${index + 1}`} type="number" min="0" step="1" placeholder="Enter number" value={entry[key] ?? ''} onChange={event => changeInventory(index, key, event.target.value)} /></td>)}
        <td><button type="button" className="cb-remove" aria-label={`Remove variety ${index + 1}`} onClick={() => setInventory(form.inventory.filter((_, row) => row !== index))}><Trash2 aria-hidden="true" /></button></td>
      </tr>)}</tbody></table></div>
    </section>}
  </>;
}
