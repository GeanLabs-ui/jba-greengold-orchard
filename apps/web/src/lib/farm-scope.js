// Display labels and reporting scopes; persisted farm/block IDs remain unchanged.
export const BLOCK_CODES = ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5'];
export const FARM_SCOPE_OPTIONS = [
  { value: 'A', label: 'Farm A' },
  { value: 'B', label: 'Farm B' },
  { value: 'all', label: 'Farm A&B' },
  ...BLOCK_CODES.map((code) => ({ value: code, label: code })),
];
const text = (value) => String(value || '').trim();
const active = (row) => !['inactive', 'archived', 'merged'].includes(text(row.status).toLowerCase());

export function blockLabel(block) {
  const value = typeof block === 'object' && block
    ? block.block_code || block.code || block.block_name || block.name
    : block;
  return text(value).replace(/\b(?:farm\s*(?:block\s*)?|block\s*)([AB]\s*[1-5])\b/gi, '$1')
    .replace(/\b([AB])\s+([1-5])\b/gi, '$1$2').replace(/\b[ab][1-5]\b/g, (code) => code.toUpperCase());
}

export function farmCode(farm) {
  const values = typeof farm === 'object' && farm ? [farm.name, farm.farm_name, farm.farm_code] : [farm];
  for (const value of values) {
    const match = text(value).match(/^(?:farm\s*(?:land\s*)?)?([AB])$/i);
    if (match) return match[1].toUpperCase();
  }
  return '';
}

export function scopeLabel(value) {
  const raw = text(value);
  if (/^(?:all|(?:farm\s*)?A\s*&\s*B)$/i.test(raw)) return 'Farm A&B';
  return farmCode(raw) ? `Farm ${farmCode(raw)}` : blockLabel(raw);
}

export function expandedScopeCodes(value) {
  const label = scopeLabel(value).toUpperCase();
  if (/A\s*&\s*B/.test(label)) return [...BLOCK_CODES];
  const codes = new Set(label.match(/\b[AB][1-5]\b/g) || []);
  for (const match of label.matchAll(/\bFARM\s+([AB])\b/g)) {
    BLOCK_CODES.filter((code) => code.startsWith(match[1])).forEach((code) => codes.add(code));
  }
  return BLOCK_CODES.filter((code) => codes.has(code));
}

export function farmSelectOptions(farms = []) {
  return ['A', 'B'].flatMap((code) => {
    const farm = farms.find((item) => active(item) && farmCode(item) === code);
    return farm ? [{ value: farm.id, label: `Farm ${code}` }] : [];
  });
}

export function blockSelectOptions(blocks = []) {
  return BLOCK_CODES.flatMap((code) => {
    const block = blocks.find((item) => active(item) && blockLabel(item) === code);
    return block ? [{ value: block.id, label: code, farmId: block.farm_id }] : [];
  });
}

export function farmScopeOptions(farms = [], blocks = []) {
  return [
    ...farmSelectOptions(farms).map((option) => ({ ...option, value: `farm:${option.value}` })),
    { value: 'all', label: 'Farm A&B' },
    ...blockSelectOptions(blocks).map((option) => ({ ...option, value: `block:${option.value}` })),
  ];
}

export function resolveOperationalScope(payload, farms = [], blocks = []) {
  const selected = text(payload.block_id);
  const selectedFarmId = selected.startsWith('farm:') ? selected.slice(5) : payload.farm_id;
  const block = blocks.find((item) => String(item.id) === selected);
  const farm = farms.find((item) => String(item.id) === String(selectedFarmId || block?.farm_id));
  if (block && farm && String(block.farm_id) !== String(farm.id)) {
    throw new Error('Select a block belonging to the selected farm.');
  }
  if (selected === '__all__' || (selectedFarmId === '__all__' && !block)) {
    return { farm_id: '', farm_name: 'Farm A&B', block_id: '', block_name: 'Farm A&B', block_code: '', shared_scope: 'Farm A&B' };
  }
  return {
    farm_id: farm?.id || block?.farm_id || '',
    farm_name: scopeLabel(farm?.name || block?.farm_name || payload.farm_name),
    block_id: block?.id || '',
    block_name: block ? blockLabel(block) : selected.startsWith('farm:') ? scopeLabel(farm?.name) : '',
    block_code: block ? blockLabel(block) : '',
    shared_scope: '',
  };
}

export function activityScopeValue(record) {
  if (record.block_id) return record.block_id;
  if (scopeLabel(record.shared_scope || record.block_name || record.farm_name) === 'Farm A&B') return '__all__';
  if (!record.shared_scope && record.farm_id && (!record.block_name || farmCode(record.block_name))) return `farm:${record.farm_id}`;
  if (record.shared_scope || expandedScopeCodes(record.block_name).length > 1) return '__shared__';
  return record.farm_id ? `farm:${record.farm_id}` : '';
}

function recordCodes(record, { farms = [], blocks = [] }) {
  const linkedBlock = blocks.find((block) => String(block.id) === String(record.block_id));
  const linkedFarm = farms.find((farm) => String(farm.id) === String(record.farm_id || linkedBlock?.farm_id));
  const values = [record.farm_name, record.farm_code, record.farm, record.block_name, record.block_code,
    record.block, record.field_area, record.shared_scope, linkedBlock && blockLabel(linkedBlock), linkedFarm?.name];
  const location = values.filter(Boolean).map(scopeLabel).join(' ').toUpperCase();
  const codes = new Set(location.match(/\b[AB][1-5]\b/g) || []);
  // Explicit blocks define membership. A legacy aggregate farm label must not
  // make an A1/B3 record match every block or unrelated farm.
  const farmCodes = codes.size ? new Set() : new Set([...location.matchAll(/\bFARM\s+([AB])\b/g)].map((match) => match[1]));
  if (!codes.size && /\bA\s*&\s*B\b/.test(location)) { farmCodes.add('A'); farmCodes.add('B'); }
  codes.forEach((code) => farmCodes.add(code[0]));
  return { codes, farmCodes };
}

export function matchesFarmScope(record, selection = 'all', structure = {}) {
  let selected = text(selection).toUpperCase();
  // Aggregate views keep unassigned records visible instead of silently losing costs.
  if (!selected || ['ALL', 'A&B', 'A & B', 'FARM A&B', 'FARM A & B'].includes(selected)) return true;
  if (selected.startsWith('FARM:')) selected = farmCode((structure.farms || []).find((farm) => String(farm.id) === text(selection).slice(5)));
  if (selected.startsWith('BLOCK:')) selected = blockLabel((structure.blocks || []).find((block) => String(block.id) === text(selection).slice(6)));
  selected = farmCode(selected) || blockLabel(selected);
  const records = [record, ...(Array.isArray(record.items) ? record.items : [])];
  return records.some((item) => {
    const { codes, farmCodes } = recordCodes(item, structure);
    return /^[AB]$/.test(selected) ? farmCodes.has(selected) : BLOCK_CODES.includes(selected) && codes.has(selected);
  });
}
