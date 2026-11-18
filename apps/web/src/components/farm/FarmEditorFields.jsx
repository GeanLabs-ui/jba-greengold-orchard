import { CalendarDays, Leaf, MapPin } from 'lucide-react';
import { BlockPhoto, Field, Section } from './BlockEditorFields';
import './farm-editor.css';

export default function FarmEditorFields({ form, change, imageFile, onImageChange, busy }) {
  const input = (key, placeholder, props = {}) => <input value={form[key] ?? ''} onChange={event => change(key, key === 'farm_code' ? event.target.value.toUpperCase() : event.target.value)} placeholder={placeholder} {...props} />;
  const notes = (key, placeholder, rows = 2) => <textarea value={form[key] || ''} onChange={event => change(key, event.target.value)} placeholder={placeholder} rows={rows} maxLength={2000} />;
  return <div className="cb-columns cf-columns">
    <div className="cb-main">
      <Section icon={Leaf} title="Farm details">
        <div className="cb-soil-grid">
          <Field label="Farm name">{input('name', 'e.g. Farm A', { required: true, maxLength: 200 })}</Field>
          <Field label="Farm code">{input('farm_code', 'e.g. FARM-A', { required: true, maxLength: 50 })}</Field>
          <Field label="Declared size (acres)">{input('size_acres', 'Enter area', { type: 'number', min: 0.01, step: 0.01 })}</Field>
          <Field label="Owner or tenancy reference">{input('owner_name', 'Enter reference', { maxLength: 200 })}</Field>
        </div>
        <Field label="Description" className="cb-wide-field">{notes('description', '', 3)}</Field>
      </Section>
      <Section icon={MapPin} title="Location & soil">
        <div className="cb-soil-grid">
          <Field label="Location">{input('location', 'Community or area', { maxLength: 200 })}</Field>
          <Field label="Region">{input('region', 'Enter region', { maxLength: 120 })}</Field>
          <Field label="GPS latitude">{input('latitude', 'e.g. 6.5244', { type: 'number', min: -90, max: 90, step: 'any' })}</Field>
          <Field label="GPS longitude">{input('longitude', 'e.g. -1.5856', { type: 'number', min: -180, max: 180, step: 'any' })}</Field>
          <Field label="Soil type">{input('soil_type', 'e.g. Sandy loam', { maxLength: 120 })}</Field>
          <Field label="Soil pH">{input('soil_ph', 'Enter soil pH', { type: 'number', min: 0, max: 14, step: 0.1 })}</Field>
        </div>
        <Field label="Soil profile notes" className="cb-wide-field">{notes('soil_notes', 'Drainage, texture, test observations or amendments')}</Field>
        <Field label="Location or management notes" className="cb-wide-field">{notes('notes', 'Add access directions or management notes')}</Field>
      </Section>
    </div>
    <div className="cb-sidebar">
      <BlockPhoto label="Farm photo" file={imageFile} value={form.image_url} onChange={onImageChange} disabled={busy} exampleSource="/pages/blocks/create-farm-reference.png" exampleClass="cf-example" />
      <Section icon={CalendarDays} title="Key dates" className="cb-dates">
        <Field label="Operations started">{input('operations_started_on', 'dd/mm/yyyy', { type: 'date' })}</Field>
        <Field label="Mango planting started">{input('planting_started_on', 'dd/mm/yyyy', { type: 'date' })}</Field>
      </Section>
    </div>
  </div>;
}
