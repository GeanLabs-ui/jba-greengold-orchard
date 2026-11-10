export const MANGO_VARIETIES = ['Kent', 'Keitt', 'Others'];

export function mangoVarietyBucket(value) {
  const name = String(value ?? '').trim().toLowerCase();
  if (name === 'kent') return 'Kent';
  if (['keitt', 'ketit', 'keit'].includes(name)) return 'Keitt';
  return 'Others';
}
