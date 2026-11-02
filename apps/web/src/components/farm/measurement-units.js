// Legacy records keep their persisted units; screens consistently show kilograms.
export const isTonneUnit = (unit) => /^(?:t|tons?|tonnes?)(?:\/ha)?$/i.test(String(unit || '').trim());
export function massDisplay(record, fields) {
  if (!isTonneUnit(record.unit)) return record;
  return { ...record, unit: /\/ha$/i.test(record.unit) ? 'Kg/ha' : 'kg',
    ...Object.fromEntries(fields.map((key) => [key, record[key] == null || record[key] === '' ? record[key] : Number.parseFloat(record[key]) * 1000])) };
}
export const kpiMassFields = ['baseline', 'target', 'upper', 'manual_actual', 'actual', 'variance'];
export function objectiveMassDisplay(objective) {
  return { ...objective, kpis: (objective.kpis || []).map((kpi) => massDisplay(kpi, kpiMassFields)),
    contributions: (objective.contributions || []).map((row) => massDisplay(row, ['target', 'actual', 'variance'])) };
}
export function kpiMassStorage(display, original) {
  if (!isTonneUnit(original?.unit) || !/^kg(?:\/ha)?$/i.test(display.unit)) return display;
  return { ...display, unit: original.unit,
    ...Object.fromEntries(kpiMassFields.filter((key) => key in display).map((key) => [key, display[key] == null || display[key] === '' ? display[key] : Number(display[key]) / 1000])) };
}
export const inventoryMassFields = ['quantity_purchased', 'remaining_quantity', 'minimum_stock_threshold'];
export function inventoryMassDisplay(record) {
  const unit = record.unit || String(record.remaining_quantity || '').match(/[a-z]+$/i)?.[0];
  return massDisplay({ ...record, unit }, inventoryMassFields);
}
export function inventoryMassStorage(display, original) {
  const unit = original.unit || String(original.remaining_quantity || '').match(/[a-z]+$/i)?.[0];
  if (!isTonneUnit(unit) || String(display.unit).toLowerCase() !== 'kg') return display;
  return { ...display, unit,
    ...Object.fromEntries(inventoryMassFields.map((key) => [key, display[key] == null || display[key] === '' ? display[key] : Number(display[key]) / 1000])) };
}

export function projectionDisplayValue(projections, key, defaults) {
  const value = projections?.[key];
  if (value == null) return defaults[key].defaultValue;
  return key === 'yield' && String(projections.yield_unit).toLowerCase() !== 'kg' ? Number(value) * 1000 : value;
}
export function projectionStorageValues(key, value, defaults, existing) {
  return existing ? { [key]: value, ...(key === 'yield' ? { yield_unit: 'kg' } : {}) }
    : { ...Object.fromEntries(Object.entries(defaults).map(([name, config]) => [name, config.defaultValue])), [key]: value, yield_unit: 'kg' };
}
